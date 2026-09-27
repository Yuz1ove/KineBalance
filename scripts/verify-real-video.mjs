import { chromium, webkit, devices } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
const base=process.env.BASE_URL??'http://127.0.0.1:4510'
const output=process.env.EVIDENCE_DIR??'../../output/production-repair-20260927/local-chromium'
const video=process.env.HAND_VIDEO??'../../output/production-repair-20260927/real-hand-example.mp4'
mkdirSync(output,{recursive:true})
const browser=await (process.env.ENGINE==='webkit'?webkit:chromium).launch({headless:true,args:process.env.CAMERA_TEST==='1'?['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+resolve('../../output/production-repair-20260927/virtual-camera-real-video.y4m')]:[]})
const context=await browser.newContext(process.env.MOBILE==='1'?{...devices['iPhone 13'],reducedMotion:'reduce'}:{viewport:{width:1440,height:1000},reducedMotion:'reduce'})
const page=await context.newPage(), logs=[], network=[]
page.setDefaultTimeout(20000)
page.on('console',m=>logs.push({type:m.type(),text:m.text()}))
page.on('pageerror',e=>logs.push({type:'pageerror',text:e.message}))
page.on('response',r=>network.push({url:r.url(),status:r.status()}))
page.on('requestfailed',r=>network.push({url:r.url(),failure:r.failure()}))
try{
  if(process.env.VERIFY_BACKEND==='1'){
    console.log('Opening settings');await page.goto(base+'/#settings')
    await page.getByRole('button',{name:'建立我的紀錄'}).click()
    await page.getByText('身分已成功確認並加載最新紀錄！').waitFor()
  }
  await page.goto(base+'/#measure')
  await page.getByRole('button',{name:'下一步：準備事項與影像來源'}).click()
  if(process.env.HAND_SIDE==='LEFT')await page.getByRole('button',{name:'左手 (Left Hand)'}).click()
  if(process.env.CAMERA_TEST!=='1')await page.locator('input[type=file]').setInputFiles(video)
  await page.getByRole('button',{name:'進入量測畫面'}).click()
  console.log('Starting real video');const started=Date.now()
  if(process.env.CAMERA_TEST==='1'){
    await page.getByRole('button',{name:'啟用鏡頭預覽'}).click()
    const start=page.getByRole('button',{name:'開始 20 秒量測'});await start.click({timeout:60000})
  }else await page.getByRole('button',{name:'開始影片分析'}).click()
  await page.getByText('本次量測結果與品質確認',{exact:true}).waitFor({timeout:120000})
  const text=await page.locator('body').innerText()
  writeFileSync(output+'/result.txt',text)
  await page.screenshot({path:output+'/result.png',fullPage:true})
  assert.equal(await page.getByRole('button',{name:'保存這次紀錄'}).isEnabled(),true,'real video should contain valid hand frames')
  if(process.env.VERIFY_BACKEND!=='1'){
    writeFileSync(output+'/receipt.json',JSON.stringify({base,engine:process.env.ENGINE??'chromium',mobileEmulation:process.env.MOBILE==='1',elapsedMs:Date.now()-started,evidenceClass:process.env.CAMERA_TEST==='1'?'VIRTUAL_CAMERA_REPLAY_NOT_PHYSICAL_CAMERA':'REAL_VIDEO_DECODE_AND_ANALYSIS',storageReadback:'NOT_RUN_EXISTING_BACKEND_REQUIRED',physicalCamera:'NOT_RUN',text},null,2))
    console.log('Real-image analysis complete; existing backend save/readback NOT_RUN')
  }else{
  await page.getByRole('button',{name:'保存這次紀錄'}).click()
  await page.getByText('本次紀錄已成功保存至本機資料庫！',{exact:true}).waitFor()
  const read=()=>page.evaluate(async(apiBase)=>{
    const token=localStorage.getItem('kbpd_user_token')
    const headers={Authorization:`Bearer ${token}`}
    const list=await fetch(apiBase+'/api/me/measurements',{headers}).then(async r=>{if(!r.ok)throw Error('backend list failed');return r.json()})
    const item=list.items[0];if(!item)throw Error('saved record absent')
    const response=await fetch(apiBase+'/api/me/measurements/'+(item.id||item.session.id),{headers})
    if(!response.ok)throw Error('backend read failed')
    return response.json()
  },process.env.API_BASE??'')
  const before=await read(), record={...before,input:before.rawInput}
  assert.equal(record.input.source,process.env.CAMERA_TEST==='1'?'CAMERA':'REAL_VIDEO')
  assert.ok(record.input.frames.length>100)
  assert.ok(record.measurementOutput.quality.validFrames>0)
  await page.goto(base+'/#records');await page.reload()
  await page.getByRole('heading',{name:'紀錄與趨勢',exact:true}).waitFor()
  const after=await read();assert.deepEqual(after,before)
  // A new page uses the original API identity and persisted backend record.
  const second=await context.newPage();await second.goto(base+'/#records')
  await second.getByRole('heading',{name:'紀錄與趨勢',exact:true}).waitFor()
  await second.screenshot({path:output+'/records-reload.png',fullPage:true})
  writeFileSync(output+'/saved-record.json',JSON.stringify(record,null,2))
  const {acquisition,...quality}=record.measurementOutput.quality
  writeFileSync(output+'/receipt.json',JSON.stringify({base,engine:process.env.ENGINE??'chromium',mobileEmulation:process.env.MOBILE==='1',elapsedMs:Date.now()-started,frames:record.input.frames.length,quality,metrics:record.measurementOutput.metrics,storageReadback:'EXACT_MATCH',physicalCamera:'NOT_RUN',evidenceClass:process.env.CAMERA_TEST==='1'?'VIRTUAL_CAMERA_REPLAY_NOT_PHYSICAL_CAMERA':'REAL_VIDEO_DECODE_AND_ANALYSIS'},null,2))
  console.log(JSON.stringify({frames:record.input.frames.length,validFrames:quality.validFrames,taps:record.measurementOutput.metrics.validTapCount,storageReadback:'EXACT_MATCH'}))
  }
}finally{
  await page.screenshot({path:output+'/final-state.png',fullPage:true}).catch(()=>{});writeFileSync(output+'/final-state.txt',await page.locator('body').innerText().catch(()=>''))
  writeFileSync(output+'/console.json',JSON.stringify(logs,null,2));writeFileSync(output+'/network.json',JSON.stringify(network,null,2))
  await browser.close()
}
