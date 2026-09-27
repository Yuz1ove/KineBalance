import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const base=process.env.BASE_URL??'http://127.0.0.1:4510'
const output=process.env.EVIDENCE_DIR??'../../output/production-repair-20260927/lifecycle'
mkdirSync(output,{recursive:true})
const browser=await chromium.launch({headless:true}),context=await browser.newContext({reducedMotion:'reduce'})
const page=await context.newPage(),cases=[],logs=[]
page.setDefaultTimeout(20000)
page.on('console',m=>logs.push({type:m.type(),text:m.text()}))
async function prepare(file){
  if(await page.getByRole('button',{name:'返回調整準備'}).count())await page.getByRole('button',{name:'返回調整準備'}).click()
  else if(await page.getByRole('button',{name:'重新量測'}).count())await page.getByRole('button',{name:'重新量測'}).click()
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByRole('button',{name:'進入量測畫面'}).click()
  await page.getByRole('button',{name:'開始影片分析'}).click()
}
try{
  await page.goto(base+'/#measure');await page.reload()
  await page.getByRole('button',{name:'下一步：準備事項與影像來源'}).click()
  await prepare({name:'corrupt.mp4',mimeType:'video/mp4',buffer:Buffer.from('controlled invalid video, not real image evidence')})
  await page.getByText(/無法解碼這段影片/).first().waitFor();cases.push('CORRUPT_VIDEO_EXPLICIT_FAILURE')
  await prepare('../../output/production-repair-20260927/too-short.mp4')
  await page.getByText(/影片少於 1 秒/).first().waitFor();cases.push('SHORT_VIDEO_EXPLICIT_FAILURE')
  await page.route('**/vendor/**/hands.js',route=>route.abort('failed'))
  const bars='../kbpd-hand-tracking-02-release/kbpd-core/tests/fixtures/test-sample.mp4'
  await prepare(bars)
  await page.getByText(/手部模型載入失敗/).first().waitFor()
  assert.equal(await page.locator('script[src$="hands.js"]').count(),0)
  cases.push('SCRIPT_FAILURE_REMOVED_RETRY_AVAILABLE')
  await page.unroute('**/vendor/**/hands.js')
  await page.getByRole('button',{name:'開始影片分析'}).click()
  await page.getByText('本次量測結果與品質確認',{exact:true}).waitFor({timeout:60000})
  await page.getByText(/沒有有效手部量測資料/).waitFor()
  assert.equal(await page.getByRole('button',{name:'保存這次紀錄'}).isDisabled(),true)
  cases.push('RETRY_REAL_ENGINE_NO_HAND_NO_FABRICATED_RESULTS')
  await page.screenshot({path:output+'/no-hand.png',fullPage:true})
  // A second run in the same page exercises fresh model/session cleanup.
  await prepare(bars)
  await page.getByText('本次量測結果與品質確認',{exact:true}).waitFor({timeout:60000})
  await page.getByText(/沒有有效手部量測資料/).waitFor();cases.push('SECOND_MEASUREMENT_NO_STALE_RESULT')
  await page.getByRole('button',{name:'重新量測'}).click()
  await page.getByText('本機鏡頭即時量測',{exact:true}).click()
  await page.getByRole('button',{name:'進入量測畫面'}).click()
  await page.getByRole('button',{name:'啟用鏡頭預覽'}).click()
  await page.getByText(/瀏覽器拒絕了相機權限|找不到相機設備|不支援相機擷取/).first().waitFor()
  await page.getByRole('button',{name:'重試鏡頭預覽'}).waitFor();cases.push('SOURCE_SWITCH_CAMERA_FAILURE_WITH_RETRY')
  const videoState=await page.locator('video').evaluate(v=>({paused:v.paused,stream:v.srcObject===null,src:v.getAttribute('src')}))
  assert.equal(videoState.stream,true);assert.equal(videoState.paused,true)
  cases.push('STOP_RELEASES_VIDEO_AND_STREAM')
  console.log(cases)
}finally{
  writeFileSync(output+'/receipt.json',JSON.stringify({base,cases,evidenceClass:'CONTROLLED_FAILURE_TESTS_NOT_REAL_HAND_ACCURACY'},null,2))
  writeFileSync(output+'/console.json',JSON.stringify(logs,null,2))
  writeFileSync(output+'/final.txt',await page.locator('body').innerText())
  await page.screenshot({path:output+'/final.png',fullPage:true})
  await browser.close()
}
