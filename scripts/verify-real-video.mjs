import { chromium, webkit, devices } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { analyzeFingerTapping } from '../kbpd-core/src/measurement/detector.ts'
const base=process.env.BASE_URL??'http://127.0.0.1:4510'
const output=process.env.EVIDENCE_DIR??'../../output/production-repair-20260927/local-chromium'
const video=process.env.HAND_VIDEO??'../../output/production-repair-20260927/real-hand-example.mp4'
mkdirSync(output,{recursive:true})
const browser=await (process.env.ENGINE==='webkit'?webkit:chromium).launch({headless:true,args:process.env.CAMERA_TEST==='1'?['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+resolve('../../output/production-repair-20260927/virtual-camera-real-video.y4m')]:[]})
const context=await browser.newContext(process.env.MOBILE==='1'?{...devices['iPhone 13'],reducedMotion:'reduce'}:{viewport:{width:1440,height:1000},reducedMotion:'reduce'})
const page=await context.newPage(), logs=[], network=[]
const backend=process.env.VERIFY_BACKEND==='1', apiBase=process.env.API_BASE??''
let submitted, savedOutput, deniedSave=false
const restartServices=process.env.VERIFY_MAC_SERVICES==='1'
const domain=`gui/${process.getuid()}`
const service=name=>`space.yuz1ove.kinebalance.${name}`
const stopService=name=>execFileSync('/bin/launchctl',['bootout',`${domain}/${service(name)}`])
const startService=async name=>{
 for(let attempt=0;attempt<30;attempt++){
  try{return execFileSync('/bin/launchctl',['bootstrap',domain,`${process.env.HOME}/Library/LaunchAgents/${service(name)}.plist`],{stdio:'pipe'})}
  catch(error){if(attempt===29)throw error;await new Promise(r=>setTimeout(r,500))}
 }
}
const waitHealthy=async()=>{for(let i=0;i<30;i++){try{const r=await context.request.get(apiBase+'/api/health',{timeout:3000,headers:{'ngrok-skip-browser-warning':'1'}});if(r.ok()&&(await r.json()).algorithmVersion==='KBPD-DETECTOR-V1.2.0')return}catch{}await new Promise(r=>setTimeout(r,1000))}throw Error('HTTPS API did not recover')}
if(restartServices)assert.equal(apiBase,'https://sternum-relative-handclasp.ngrok-free.dev','Restart test restricted to dedicated KineBalance endpoint')
// Label the authorized acceptance session without altering frames or analytical values.
if(process.env.TEST_IDENTITY)await page.route('**/api/measurements',async route=>{
 if(route.request().method()!=='POST')return route.continue()
 await route.continue({postData:JSON.stringify({...route.request().postDataJSON(),testIdentity:process.env.TEST_IDENTITY,notes:'Authorized HTTPS preview acceptance; retain this test record.'})})
})
page.on('request',r=>{if(r.method()==='POST' && /\/api\/measurements\/[^/]+\/analyze$/.test(r.url())) submitted=r.postDataJSON()})
page.on('response',async r=>{if(r.ok() && /\/api\/measurements\/[^/]+\/analyze$/.test(r.url())) savedOutput=await r.json()})
page.setDefaultTimeout(20000)
page.on('console',m=>logs.push({type:m.type(),text:m.text()}))
page.on('pageerror',e=>logs.push({type:'pageerror',text:e.message}))
page.on('response',r=>network.push({url:r.url(),status:r.status()}))
page.on('requestfailed',r=>network.push({url:r.url(),failure:r.failure()}))
try{
  if(backend){
    const health=await context.request.get((apiBase||base)+'/api/health',{headers:{'ngrok-skip-browser-warning':'1'}})
    assert.equal(health.status(),200,'Original backend must be reachable before identity creation')
    assert.equal((await health.json()).algorithmVersion,'KBPD-DETECTOR-V1.2.0','Do not save against the old V1.0 backend')
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
  // Real backend rejection: remove Authorization once; never fulfill a mocked response.
  await page.route('**/api/measurements/*/analyze',async route=>{
    if(deniedSave){await route.continue();return}
    deniedSave=true
    const headers={...route.request().headers()};delete headers.authorization
    await route.continue({headers})
  })
  const rejected=page.waitForResponse(r=>/\/api\/measurements\/[^/]+\/analyze$/.test(r.url())&&r.status()===401)
  await page.getByRole('button',{name:'保存這次紀錄'}).click();await rejected
  await page.getByText(/UNAUTHORIZED|Missing or invalid Authorization/).waitFor()
  assert.equal(await page.getByText('本次紀錄已成功保存！',{exact:true}).count(),0)
  const failedId=submitted.sessionId
  const read=async(target=page,id)=>target.evaluate(async({apiBase,id})=>{
    const token=localStorage.getItem('kbpd_user_token'),userId=localStorage.getItem('kbpd_user_id')
    const headers={Authorization:`Bearer ${token}`,'ngrok-skip-browser-warning':'1'}
    const listResponse=await fetch(apiBase+'/api/me/measurements',{headers})
    if(!listResponse.ok)throw Error('backend list failed')
    const list=await listResponse.json()
    const item=list.items.find(item=>(item.id||item.session.id)===id)
    if(!item)throw Error('requested record absent from owner list')
    const response=await fetch(apiBase+'/api/me/measurements/'+id,{headers})
    if(!response.ok)throw Error('backend read failed')
    return {userId,list,record:await response.json()}
  },{apiBase,id})
  const failed=await read(page,failedId)
  assert.equal(failed.record.measurementOutput,null,'rejected save must not write an analysis')
  assert.ok(!failed.record.rawInput,'rejected save must not manufacture frames')
  await page.unroute('**/api/measurements/*/analyze')
  if(restartServices){
    stopService('backend')
    try{
      await page.getByRole('button',{name:'保存這次紀錄'}).click()
      await page.getByText(/尚未保存.*紀錄服務暫時無法/).waitFor()
      assert.equal(await page.getByText('本次紀錄已成功保存！',{exact:true}).count(),0)
      assert.equal(submitted.sessionId,failedId)
      await page.screenshot({path:output+'/backend-offline.png',fullPage:true})
    }finally{await startService('backend');await waitHealthy()}
  }
  const savedResponse=page.waitForResponse(r=>/\/api\/measurements\/[^/]+\/analyze$/.test(r.url())&&r.ok())
  await page.getByRole('button',{name:'保存這次紀錄'}).click()
  savedOutput=await (await savedResponse).json()
  await page.getByText('本次紀錄已成功保存！',{exact:true}).waitFor()
  const id=submitted.sessionId, before=await read(page,id), record=before.record
  assert.equal(id,failedId,'save retry must reuse the same session')
  assert.equal(before.list.total,1,'retry must not create a duplicate empty session')
  assert.equal(record.session.ownerUserId,before.userId)
  assert.deepEqual(record.rawInput,submitted,'stored raw payload must equal the actual UI POST')
  assert.deepEqual(record.measurementOutput,savedOutput,'complete analysis including trace must survive persistence')
  assert.equal(record.rawInput.source,process.env.CAMERA_TEST==='1'?'CAMERA':'REAL_VIDEO')
  assert.equal(record.metadata.source,record.rawInput.source)
  assert.ok(record.rawInput.frames.length>100)
  assert.ok(record.measurementOutput.quality.validFrames>0)
  const expected=analyzeFingerTapping(submitted)
  for(const key of ['algorithmVersion','metrics','quality','trace','limitations'])assert.deepEqual(savedOutput[key],expected[key],`backend and accepted frontend core must agree: ${key}`)
  await page.goto(base+'/#records');await page.reload()
  await page.getByRole('heading',{name:'紀錄與趨勢',exact:true}).waitFor()
  const after=await read(page,id);assert.deepEqual(after.record,record)
  // The new page itself performs the authenticated read, rather than reusing the first page.
  const second=await context.newPage();await second.goto(base+'/#records')
  await second.getByRole('heading',{name:'紀錄與趨勢',exact:true}).waitFor()
  await second.getByText(`量測紀錄 (1)`,{exact:true}).waitFor()
  await second.getByText(`(${record.measurementOutput.metrics.validTapCount} 次)`,{exact:true}).waitFor()
  const reopened=await read(second,id);assert.deepEqual(reopened.record,record);assert.equal(reopened.userId,before.userId)
  await second.screenshot({path:output+'/records-reload.png',fullPage:true})
  const anonymous=await browser.newContext(), outsider=await anonymous.newPage()
  await outsider.goto(base+'/#settings')
  const noAuth=await anonymous.request.get((apiBase||base)+'/api/me/measurements/'+id,{headers:{'ngrok-skip-browser-warning':'1'}})
  assert.equal(noAuth.status(),401)
  await outsider.getByRole('button',{name:'建立我的紀錄'}).click()
  await outsider.getByText('身分已成功確認並加載最新紀錄！').waitFor()
  const isolation=await outsider.evaluate(async({apiBase,id})=>{
    const headers={Authorization:`Bearer ${localStorage.getItem('kbpd_user_token')}`,'ngrok-skip-browser-warning':'1'}
    const list=await fetch(apiBase+'/api/me/measurements',{headers}).then(r=>r.json())
    const response=await fetch(apiBase+'/api/me/measurements/'+id,{headers})
    return {userId:localStorage.getItem('kbpd_user_id'),list,status:response.status,body:await response.json()}
  },{apiBase,id})
  assert.notEqual(isolation.userId,before.userId)
  assert.equal(isolation.list.total,0)
  assert.equal(isolation.status,400);assert.equal(isolation.body.error.code,'SESSION_NOT_FOUND')
  await anonymous.close()
  if(restartServices){
    const beforeHealth=await context.request.get(apiBase+'/api/health',{headers:{'ngrok-skip-browser-warning':'1'}}).then(r=>r.json())
    for(const name of ['backend','tunnel']){stopService(name);await startService(name);await waitHealthy()}
    const afterHealth=await context.request.get(apiBase+'/api/health',{headers:{'ngrok-skip-browser-warning':'1'}}).then(r=>r.json())
    assert.equal(afterHealth.sourceSha256,beforeHealth.sourceSha256)
    assert.deepEqual((await read(second,id)).record,record,'same unexpired Bearer session must survive backend and tunnel restarts')
    writeFileSync(output+'/service-restart.json',JSON.stringify({apiBase,backendRestart:'PASS',tunnelRestart:'PASS',sameUrl:true,sameUnexpiredAuthentication:true,exactRecordReadback:true,offlineSave:'NO_SUCCESS_SAME_SESSION_RETRY',beforeHealth,afterHealth},null,2))
  }
  writeFileSync(output+'/saved-record.json',JSON.stringify(record,null,2))
  const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
  writeFileSync(output+'/receipt.json',JSON.stringify({base,apiBase,engine:process.env.ENGINE??'chromium',mobileEmulation:process.env.MOBILE==='1',elapsedMs:Date.now()-started,recordId:id,frames:record.rawInput.frames.length,validFrames:record.measurementOutput.quality.validFrames,algorithmVersion:savedOutput.algorithmVersion,rawSha256:digest(record.rawInput),outputSha256:digest(record.measurementOutput),metrics:record.measurementOutput.metrics,storageReadback:'EXACT_MATCH_UI_POST_AND_BACKEND_RESPONSE',reload:'EXACT_MATCH',newPage:'EXACT_MATCH_FROM_NEW_PAGE',rejectedSave:'REAL_BACKEND_401_NO_ANALYSIS_NO_SUCCESS',identityIsolation:'ANONYMOUS_401_OTHER_OWNER_DENIED',physicalCamera:'NOT_RUN',evidenceClass:process.env.CAMERA_TEST==='1'?'VIRTUAL_CAMERA_REPLAY_NOT_PHYSICAL_CAMERA':'REAL_VIDEO_ORIGINAL_BACKEND'},null,2))
  console.log(JSON.stringify({recordId:id,frames:record.rawInput.frames.length,validFrames:record.measurementOutput.quality.validFrames,storageReadback:'EXACT_MATCH'}))

  }
}finally{
  await page.screenshot({path:output+'/final-state.png',fullPage:true}).catch(()=>{});writeFileSync(output+'/final-state.txt',await page.locator('body').innerText().catch(()=>''))
  writeFileSync(output+'/console.json',JSON.stringify(logs,null,2));writeFileSync(output+'/network.json',JSON.stringify(network,null,2))
  await browser.close()
}
