// Virtual camera replay of the already authorized video. NOT physical-camera acceptance.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const base=process.env.BASE_URL
if(!base)throw Error('BASE_URL required')
const output=process.env.EVIDENCE_DIR||'../../output/counting-lifecycle-20260928/virtual-camera'
mkdirSync(output,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+resolve('../../output/production-repair-20260927/virtual-camera-real-video.y4m')]})
const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),page=await context.newPage()
let saves=0
page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/measurements'))saves++})
page.setDefaultTimeout(30000)
try{
 await page.goto(base+'/#measure')
 await page.getByRole('button',{name:'下一步：準備事項與影像來源'}).click()
 await page.getByRole('button',{name:'左手 (Left Hand)'}).click()
 await page.getByRole('button',{name:'進入量測畫面'}).click()
 await page.getByRole('button',{name:'啟用鏡頭預覽'}).click()
 const start=page.getByRole('button',{name:'開始 20 秒量測'})
 await page.getByText('手部已就緒。按下開始後倒數三秒，才會記錄這次量測。',{exact:true}).waitFor({timeout:60000})
 await page.waitForTimeout(3000)
 assert.equal(await page.getByText(/暫時計數|即時頻率|本次量測詳細資訊/).count(),0)
 assert.equal(saves,0)
 await page.screenshot({path:output+'/preview.png',fullPage:true})
 await start.click()
 await page.getByText(/準備倒數 .*尚未記錄/).waitFor()
 assert.equal(await page.getByText('本次量測詳細資訊',{exact:true}).count(),0)
 await page.getByRole('button',{name:'取消倒數'}).click()
 await page.getByText('鏡頭預覽・尚未開始記錄',{exact:true}).waitFor()
 await start.click()
 await page.getByText('量測倒數：20 秒',{exact:true}).waitFor()
 const began=Date.now()
 assert.equal(await page.locator('details').filter({has:page.getByText('本次量測詳細資訊',{exact:true})}).getAttribute('open'),null)
 await page.screenshot({path:output+'/recording.png',fullPage:true})
 await page.getByText('本次量測結果與品質確認',{exact:true}).waitFor({timeout:35000})
 const duration=Date.now()-began
 assert.ok(duration>=18500&&duration<28000,'Uses elapsed 20 seconds, not frame count or extended loss time')
 const result=await page.locator('body').innerText()
 await page.waitForTimeout(1500)
 assert.equal(await page.locator('body').innerText(),result)
 assert.equal(saves,0)
 await page.screenshot({path:output+'/completed.png',fullPage:true})
 await page.getByRole('button',{name:'重新量測'}).click()
 await page.getByRole('button',{name:'進入量測畫面'}).click()
 await page.getByRole('button',{name:'啟用鏡頭預覽'}).click()
 await page.getByRole('button',{name:'關閉鏡頭'}).click()
 await page.getByRole('button',{name:'啟用鏡頭預覽'}).click()
 await page.getByText('鏡頭預覽・尚未開始記錄',{exact:true}).waitFor()
 assert.equal(await page.getByText('本次量測詳細資訊',{exact:true}).count(),0)
 await page.getByRole('button',{name:'關閉鏡頭'}).click()
 writeFileSync(output+'/receipt.json',JSON.stringify({base,evidenceClass:'VIRTUAL_CAMERA_AUTHORIZED_VIDEO_REPLAY_NOT_PHYSICAL_CAMERA',previewNumericalCards:'ABSENT',previewWrites:0,countdownCancellation:'PASS',detailsDefault:'CLOSED',durationMs:duration,completionFrozen:true,reopenCleared:true,saves,physicalCamera:'NOT_RUN'},null,2))
 console.log('Virtual-camera lifecycle PASS (not physical camera)')
}finally{
 writeFileSync(output+'/final-state.txt',await page.locator('body').innerText().catch(()=>''))
 await page.screenshot({path:output+'/final-state.png',fullPage:true}).catch(()=>{})
 await browser.close()
}
