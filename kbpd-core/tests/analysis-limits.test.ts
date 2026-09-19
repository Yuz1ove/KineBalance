import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PersistentStore} from '../src/storage/store.ts'
import {IdentityManager} from '../src/storage/identity.ts'
import {DEFAULT_QUOTA_CONFIG} from '../src/storage/quota.ts'
test('Analysis limits, explicit source, quota, ownership and session identity survive readback',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kbpd02-limits-'));const store=new PersistentStore(join(dir,'test.db'),dir,{...DEFAULT_QUOTA_CONFIG,maxStoragePerUserBytes:90000})
 try{
 const identity=new IdentityManager(store),user=identity.createUser(),other=identity.createUser();const session=store.createSession(user.userId,'RIGHT')
 const frames=JSON.parse(readFileSync(new URL('../../evidence/baseline/fixtures.json',import.meta.url),'utf8')).fixtures.periodic.frames
 const input={sessionId:session.id,handSide:'RIGHT' as const,protocolVersion:'KBPD-FT-IMAGE-2',source:'SYNTHETIC_TEST_DATA' as const,mirrored:false,frames}
 assert.throws(()=>store.saveAnalysis(other.userId,input))
 assert.throws(()=>store.saveAnalysis(user.userId,{...input,frames:Array(901).fill(frames[0])}),/FRAME_LIMIT/)
 assert.throws(()=>store.saveAnalysis(user.userId,{...input,frames:[frames[0],{...frames[1],timestampMs:30001}]}),/DURATION_LIMIT/)
 const output=store.saveAnalysis(user.userId,input),read=store.getMeasurement(user.userId,session.id).measurementOutput!
 assert.equal(read.calculatedAt,output.calculatedAt);assert.deepEqual(read.quality,JSON.parse(JSON.stringify(output.quality)))
 assert.equal(read.quality.acquisition!.source,'SYNTHETIC_TEST_DATA')
 const usage=store.getUserStorageUsage(user.userId).usedBytes;assert.ok(usage>0)
 store.saveAnalysis(user.userId,input);assert.equal(store.getUserStorageUsage(user.userId).usedBytes,usage)
 const second=store.createSession(user.userId,'RIGHT');assert.throws(()=>store.saveAnalysis(user.userId,{...input,sessionId:second.id}),/quota exceeded/)
 }finally{store.close()}
})
