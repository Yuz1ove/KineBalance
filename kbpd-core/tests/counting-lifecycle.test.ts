import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { analyzeFingerTapping } from '../src/measurement/detector.ts'
const fixtures=JSON.parse(readFileSync(new URL('../../evidence/baseline/fixtures.json',import.meta.url),'utf8')).fixtures
const run=(frames:any[])=>analyzeFingerTapping({sessionId:'counting-regression',source:'SYNTHETIC_TEST_DATA',protocolVersion:'KBPD-FT-IMAGE-2',handSide:'RIGHT',mirrored:false,frames})
const signal=(values:number[],times?:number[])=>values.map((d,i)=>{const f=structuredClone(fixtures.periodic.frames[0]);f.frameIndex=i;f.timestampMs=times?.[i]??i*50;f.landmarks[8].x=f.landmarks[4].x+d*100/640;return f})
for(const pose of [.1,.8])test(`SYNTHETIC static pose ${pose}: bounded noise and one-sample 1.8px spikes are not complete movements`,()=>{
 for(const noise of [[0,.001,-.001,.002],[0,.018,0,-.002]]){
  const r=run(signal(Array.from({length:160},(_,i)=>pose+noise[i%noise.length])))
  assert.equal(r.metrics.validTapCount,0)
 }
})
test('SYNTHETIC small fast, decrement and annotated complete closures retain exact frozen events',()=>{
 for(const name of ['small','fastSmall','decrement','periodic'])assert.deepEqual(run(fixtures[name].frames).trace!.cycles.map(c=>c.endMs),fixtures[name].expected)
})
test('SYNTHETIC translation and coherent depth changes of a static hand do not create cycles',()=>{
 const frames=signal(Array(160).fill(.8))
 for(let i=0;i<frames.length;i++)for(const p of frames[i].landmarks){const scale=.85+.1*Math.sin(i/13);p.x=.5+(p.x-.5)*scale+.015*Math.sin(i/7);p.y=.5+(p.y-.5)*scale+.01*Math.cos(i/7)}
 assert.equal(run(frames).metrics.validTapCount,0)
})
test('SYNTHETIC denominator-only one-frame palm jumps are not opening cycles',()=>{
 const frames=signal(Array(160).fill(.8))
 for(let i=0;i<frames.length;i++)if(i%4===1)frames[i].landmarks[9].y=frames[i].landmarks[0].y+(frames[i].landmarks[9].y-frames[i].landmarks[0].y)*.8
 assert.equal(run(frames).metrics.validTapCount,0)
})
test('SYNTHETIC monotonic half action and initial constant pose count zero',()=>{
 for(const values of [Array(20).fill(.8),Array(20).fill(.1),Array.from({length:20},(_,i)=>.1+i*.03),Array.from({length:20},(_,i)=>.8-i*.03)])assert.equal(run(signal(values)).metrics.validTapCount,0)
})
test('SYNTHETIC duplicate and retrograde observations cannot change completed cycles',()=>{
 const frames=structuredClone(fixtures.periodic.frames)
 // Append stale data after completed events; existing frozen mid-cycle anomaly
 // fixtures separately require rejecting their interrupted cycle (7, not 8).
 frames.push(structuredClone(frames.at(-1)),{...structuredClone(frames[2]),timestampMs:25})
 assert.deepEqual(run(frames).trace!.cycles,run(fixtures.periodic.frames).trace!.cycles)
})
test('SYNTHETIC repeated frame index or source time cannot create a cycle',()=>{
 const frames=signal([.1,.8,.8,.1,.1])
 for(const frame of frames){frame.frameIndex=0;frame.sourceTimestampMs=0}
 assert.equal(run(frames).metrics.validTapCount,0)
})
test('SYNTHETIC irregular FPS uses elapsed time and preserves annotated cycles',()=>{
 const frames=structuredClone(fixtures.fastSmall.frames)
 for(let i=0;i<frames.length;i++)frames[i].timestampMs+=i%2?4:0
 assert.deepEqual(run(frames).trace!.cycles.map(c=>c.endMs),fixtures.fastSmall.expected.map((t:number)=>t+4))
})
