import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const base=process.env.BASE_URL||'http://127.0.0.1:4510'
const output=process.env.EVIDENCE_DIR||'../../output/backend-connection-20260927/no-hand'
mkdirSync(output,{recursive:true})
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage()
let saveRequests=0
page.on('request',r=>{if(r.method()==='POST'&&/\/api\/measurements/.test(r.url()))saveRequests++})
try{
 await page.goto(base+'/#measure')
 await page.getByRole('button',{name:'下一步：準備事項與影像來源'}).click()
 await page.locator('input[type=file]').setInputFiles('../kbpd-hand-tracking-02-release/kbpd-core/tests/fixtures/test-sample.mp4')
 await page.getByRole('button',{name:'進入量測畫面'}).click()
 await page.getByRole('button',{name:'開始影片分析'}).click()
 await page.getByText(/沒有有效手部量測資料/).waitFor({timeout:60000})
 assert.equal(await page.getByRole('button',{name:'保存這次紀錄'}).isDisabled(),true)
 assert.equal(saveRequests,0)
 await page.screenshot({path:output+'/result.png',fullPage:true})
 const text=await page.locator('body').innerText()
 writeFileSync(output+'/receipt.json',JSON.stringify({base,status:'PASS',evidenceClass:'CONTROLLED_COLOR_BAR_NEGATIVE_NOT_REAL_HAND',saveDisabled:true,saveRequests,text},null,2))
 console.log('No-hand negative: save disabled, no save requests')
}finally{await browser.close()}
