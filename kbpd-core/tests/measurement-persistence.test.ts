import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,readFileSync,writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { PersistentStore } from '../src/storage/store.ts'
import { IdentityManager } from '../src/storage/identity.ts'
import { ErasureCoordinator } from '../src/storage/erasure.ts'
import { createApiServer } from '../src/storage/server.ts'

test('SYNTHETIC_TEST_DATA: HTTP POST analysis -> SQLite -> fresh process preserves raw frames and events',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'kbpd-hand-persistence-')),db=join(dir,'test.db')
 const store=new PersistentStore(db,dir),identityManager=new IdentityManager(store)
 const server=createApiServer({port:0,identityManager,store,erasureCoordinator:new ErasureCoordinator(identityManager,store)})
 await new Promise<void>(res=>server.listen(0,'127.0.0.1',res))
 const url=`http://127.0.0.1:${(server.address() as any).port}`
 const fixtures=JSON.parse(readFileSync(new URL('../../evidence/baseline/fixtures.json',import.meta.url),'utf8'))
 const frames=fixtures.fixtures.periodic.frames
 try {
  const auth=await (await fetch(url+'/api/auth/register',{method:'POST'})).json() as any
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${auth.token}`}
  const session=await (await fetch(url+'/api/measurements',{method:'POST',headers,body:JSON.stringify({handSide:'RIGHT'})})).json() as any
  const response=await fetch(url+`/api/measurements/${session.id}/analyze`,{method:'POST',headers,body:JSON.stringify({protocolVersion:'KBPD-FT-IMAGE-2',sessionId:session.id,handSide:'RIGHT',mirrored:true,frames})})
  assert.equal(response.status,200);const output=await response.json() as any
  assert.deepEqual(output.quality.acquisition.rawFrames,frames);assert.equal(output.metrics.validTapCount,8)
  await new Promise<void>(res=>server.close(()=>res()));store.close()
  const reader=join(dir,'fresh-reader.mjs')
  writeFileSync(reader,`import {PersistentStore} from ${JSON.stringify(new URL('../src/storage/store.ts',import.meta.url).href)};const s=new PersistentStore(process.argv[2],process.argv[3]);console.log(JSON.stringify(s.getMeasurement(process.argv[4],process.argv[5]).measurementOutput));s.close();`)
  const fresh=spawnSync(process.execPath,['--experimental-strip-types',reader,db,dir,auth.userId,session.id],{encoding:'utf8'})
  assert.equal(fresh.status,0,fresh.stderr)
  const actual=JSON.parse(fresh.stdout);assert.deepEqual(actual.metrics,output.metrics);assert.deepEqual(actual.quality,output.quality)
  writeFileSync(new URL('../../evidence/persistence.json',import.meta.url),JSON.stringify({dataClassification:'SYNTHETIC_TEST_DATA',result:'PASS',path:'HTTP POST -> isolated SQLite -> fresh process',frameCount:frames.length,rawFramesMatch:true,eventTimesMatch:true,dbDirectory:dir,originalUI:false},null,2))
 }finally{server.close();try{store.close()}catch{}}
})
