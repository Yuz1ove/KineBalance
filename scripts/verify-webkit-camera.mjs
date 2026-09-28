// Real WebKit engine and its built-in mock camera, not physical iPad acceptance.
import { webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
const base=process.env.BASE_URL??'http://127.0.0.1:4512'
const output=process.env.EVIDENCE_DIR??'../../output/safari-frame-repair-20260928/webkit-local'
mkdirSync(output,{recursive:true})
const browser=await webkit.launch()
const context=await browser.newContext({permissions:['camera'],viewport:{width:1194,height:834}})
const page=await context.newPage(), errors=[], writes=[], rounds=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))writes.push(r.url())})
await page.addInitScript(()=>{
 window.__frameEvidence=[]
 const original=HTMLVideoElement.prototype.requestVideoFrameCallback
 HTMLVideoElement.prototype.requestVideoFrameCallback=function(callback){
  return original.call(this,(now,meta)=>{
   if(window.__frameEvidence.length<1000)window.__frameEvidence.push({mediaTime:meta.mediaTime,presentedFrames:meta.presentedFrames,currentTime:this.currentTime})
   callback(now,meta)
  })
 }
})
try {
 console.log('Opening',base);await page.goto(base+'/#measure')
 await page.getByRole('button',{name:'下一步：準備事項與影像來源'}).click()
 await page.getByRole('button',{name:'進入量測畫面'}).click()
 for(let round=0;round<2;round++){
  await page.evaluate(()=>{window.__frameEvidence=[]})
  console.log('Starting round',round);await page.getByRole('button',{name:'啟用鏡頭預覽'}).click()
  await page.getByText('鏡頭預覽・尚未開始記錄',{exact:true}).waitFor({timeout:120000})
  console.log('Preview ready',round);await page.getByText('影格與推論效能',{exact:true}).click()
  const samples=[]
  // Watch the real UI past the old 10-second failure, without altering any clock.
  for(let i=0;i<8;i++){
   await page.waitForTimeout(2000)
   assert.equal(await page.getByText('鏡頭預覽・尚未開始記錄',{exact:true}).isVisible(),true)
   const detail=await page.locator('details').filter({has:page.getByText('影格與推論效能',{exact:true})}).innerText()
   assert.ok(Number(detail.match(/推論 ([\d.]+) FPS/)?.[1])>0,detail)
   samples.push(detail)
  }
  assert.equal(await page.getByRole('button',{name:'開始 20 秒量測'}).isDisabled(),true,'Mock camera has no hand; must not become eligible')
  assert.equal(await page.getByText('本次有效開合',{exact:true}).count(),0,'Preview must not count')
  const frames=await page.evaluate(()=>window.__frameEvidence)
  assert.ok(frames.length>10,'Engine must deliver successive real callbacks')
  assert.ok(frames.at(-1).currentTime-frames[0].currentTime>10)
  rounds.push({round,frames,samples})
  await page.screenshot({path:output+`/round-${round}.png`,fullPage:true})
  await page.getByRole('button',{name:'關閉鏡頭',exact:true}).click()
  await page.getByRole('button',{name:'啟用鏡頭預覽'}).waitFor()
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[])
 console.log(JSON.stringify({pass:true,base,rounds:rounds.map(r=>({round:r.round,callbacks:r.frames.length,first:r.frames[0],last:r.frames.at(-1)}))}))
}finally{
 writeFileSync(output+'/last-page.txt',await page.locator('body').innerText())
 await page.screenshot({path:output+'/last-page.png',fullPage:true})
 writeFileSync(output+'/last-frames.json',JSON.stringify(await page.evaluate(()=>window.__frameEvidence),null,2))
 writeFileSync(output+'/receipt.json',JSON.stringify({base,evidenceClass:'WEBKIT_ENGINE_BUILT_IN_MOCK_CAMERA',physicalIPad:'NOT_RUN',rounds,errors,writes},null,2))
 await browser.close()
}
