import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { analyzeFingerTapping } from '../src/measurement/detector.ts'
import { processRawDetectionsToFrames } from '../src/vision/video-processor.ts'
import type { LandmarkFrame } from '../src/measurement/contracts.ts'
const fixtures=JSON.parse(readFileSync(new URL('../../evidence/baseline/fixtures.json',import.meta.url),'utf8')).fixtures
const run=(frames:LandmarkFrame[])=>analyzeFingerTapping({sessionId:'SYNTHETIC_TEST_DATA',protocolVersion:'KBPD-FT-IMAGE-2',handSide:'RIGHT',mirrored:true,frames})
for(const name of Object.keys(fixtures).filter(()=>true))test(`SYNTHETIC_TEST_DATA: ${name} exact events`,()=>{
 const c=fixtures[name],r=run(c.frames)
 assert.equal(r.metrics.validTapCount,c.expected.length)
 assert.deepEqual(r.trace?.cycles.map(c=>c.endMs),c.expected)
 assert.deepEqual(r.quality.acquisition?.rawFrames,c.frames)
})
test('Image-space amplitude invariant across rotation, aspect ratio, CSS mirror and raw z',()=>{
 for(const name of ['periodic','rotated','widescreen']){
  const r=run(fixtures[name].frames)
  for(const a of r.metrics.amplitudeSequenceNorm)assert.ok(Math.abs(a-.8)<1e-12)
 }
 const f=structuredClone(fixtures.periodic.frames)
 for(const frame of f)for(const p of frame.landmarks){p.x=1-p.x;p.z=3.123456789}
 assert.deepEqual(run(f).metrics,run(fixtures.periodic.frames).metrics)
 assert.equal(run(f).quality.acquisition!.rawFrames[0].landmarks[0].z,3.123456789)
})
test('Small fast movement retained with no smoothing, attenuation or event delay',()=>{
 const r=run(fixtures.fastSmall.frames)
 assert.equal(r.metrics.validTapCount,8)
 assert.ok(r.trace!.frames.every(f=>f.validity==='VALID'))
 assert.ok(Math.abs(Math.max(...r.trace!.frames.map(f=>f.normalizedDistance))-.115)<1e-12)
 assert.ok(Math.abs(Math.min(...r.trace!.frames.map(f=>f.normalizedDistance))-.1)<1e-12)
})
test('Decrement repaired: same frozen eight full cycles, raw final peak preserved',()=>{
 const r=run(fixtures.decrement.frames)
 assert.equal(r.metrics.validTapCount,8)
 assert.equal(fixtures.decrement.expected.length,8)
 assert.ok(r.trace!.decisions!.some(d=>d.timestampMs===3100 && d.reason==='COMPLETE_CYCLE'))
 assert.ok(r.trace!.frames.slice(-8).some(f=>Math.abs(f.normalizedDistance-.45)<1e-12))
})
test('Hand switch, low confidence, bounds, NaN and missing dimensions cannot complete interrupted cycle',()=>{
 for(const [field,value,expected] of [['handedness','LEFT','WRONG_HAND'],['handednessScore',.1,'LOW_CONFIDENCE'],['frameWidth',undefined,'INVALID_GEOMETRY']] as const){
  const f=structuredClone(fixtures.periodic.frames); f[4][field]=value
  const r=run(f);assert.equal(r.trace!.frames[4].validity,expected);assert.equal(r.metrics.validTapCount,7)
 }
 for(const x of [NaN,Infinity,-.1,1.1]){
  const f=structuredClone(fixtures.periodic.frames);f[4].landmarks[8].x=x
  const r=run(f);assert.equal(r.trace!.frames[4].valid,false);assert.equal(r.metrics.validTapCount,7)
 }
})
test('Loss followed by open hand must reacquire and restart from closure',()=>{
 const r=run(fixtures.trackingLoss.frames)
 assert.equal(r.trace!.frames[4].validity,'TRACK_LOST')
 assert.equal(r.trace!.frames[5].validity,'REACQUIRING')
 assert.equal(r.trace!.cycles[0].endMs,700)
 assert.equal(r.metrics.validTapCount,7)
})
test('Acquisition quality does not reject no movement or slow movement',()=>{
 assert.equal(run(fixtures.constant.frames).quality.acceptableForKinematics,true)
 assert.equal(run(fixtures.constant.frames).metrics.validTapCount,0)
 assert.equal(run(fixtures.irregularSlow.frames).quality.acceptableForKinematics,true)
})
test('Adapters never clamp or round raw small movements and source time',()=>{
 const raw=[{frameIndex:0,sourceTimestampMs:.123456,handDetected:true,rawLandmarks:fixtures.small.frames[0].landmarks},
 {frameIndex:1,sourceTimestampMs:.12,handDetected:true,rawLandmarks:fixtures.small.frames[1].landmarks}]
 raw[0].rawLandmarks[1]={x:-.000000123,y:.456789012,z:.000000987}
 const frames=processRawDetectionsToFrames(raw)
 assert.equal(frames[0].timestampMs,.123456);assert.equal(frames[1].timestampMs,.12)
 assert.deepEqual(frames[0].landmarks,raw[0].rawLandmarks)
})
test('Frequency uses two observed closures, never an initial partial interval or tracking gap',()=>{
 const r=run(fixtures.periodic.frames)
 assert.equal(r.metrics.averageFrequencyHz,2.5)
 assert.deepEqual(r.metrics.intervalSequenceMs,Array(7).fill(400))
 assert.deepEqual(run(fixtures.trackingLoss.frames).metrics.intervalSequenceMs,Array(6).fill(400))
})
test('A closed-hand pause remains in event intervals and is not poor acquisition',()=>{
 const f=structuredClone(fixtures.periodic.frames)
 // Hold the already closed pose after first closure for an extra second, sampling every 50ms.
 const holds=Array.from({length:20},(_,i)=>({...structuredClone(f[6]),timestampMs:350+i*50}))
 for(let i=7;i<f.length;i++)f[i].timestampMs+=1000
 f.splice(7,0,...holds);f.forEach((x:any,i:number)=>x.frameIndex=i)
 const r=run(f);assert.equal(r.metrics.validTapCount,8)
 assert.ok(r.metrics.intervalSequenceMs.includes(1400));assert.equal(r.quality.acceptableForKinematics,true)
 assert.equal(r.trace!.frames.length,f.length)
})
