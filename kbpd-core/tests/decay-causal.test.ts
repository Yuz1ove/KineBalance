import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {analyzeFingerTapping} from '../src/measurement/detector.ts'
const fixtures=JSON.parse(readFileSync(new URL('../../evidence/baseline/fixtures.json',import.meta.url),'utf8')).fixtures
const run=(frames:any[])=>analyzeFingerTapping({sessionId:'synthetic-causal',source:'SYNTHETIC_TEST_DATA',protocolVersion:'KBPD-FT-IMAGE-2',handSide:'RIGHT',mirrored:false,frames})
const distance=(f:any,d:number)=>{f.landmarks[8].x=f.landmarks[4].x+d*100/640;return f}
test('Every prefix retains identical completed event decisions; future decay never changes past',()=>{
 const frames=fixtures.decrement.frames,full=run(frames)
 for(let n=1;n<=frames.length;n++)assert.deepEqual(run(frames.slice(0,n)).trace!.cycles,full.trace!.cycles.filter(c=>c.endMs<=frames[n-1].timestampMs))
 assert.deepEqual(full.trace!.cycles.map(c=>c.endMs),fixtures.decrement.expected)
})
test('Stationary noise is uncertain, never counted; constant remains zero',()=>{
 const frames=structuredClone(fixtures.periodic.frames).map((f:any,i:number)=>distance(f,.1+[0,.001,-.001,.002][i%4]))
 const result=run(frames);assert.equal(result.metrics.validTapCount,0)
 assert.ok(result.quality.unreliabilityReasons.includes('LOW_EXCURSION_UNCERTAIN'))
 assert.equal(run(fixtures.constant.frames).metrics.validTapCount,0)
})
test('Noise-level tail never receives invented completion or automatic falling floor',()=>{
 const frames=structuredClone(fixtures.decrement.frames)
 for(const f of frames)if(f.timestampMs>=2800)distance(f, f.timestampMs>=2900&&f.timestampMs<3100?.105:.1)
 const result=run(frames);assert.equal(result.metrics.validTapCount,7)
 assert.ok(result.quality.unreliabilityReasons.includes('LOW_EXCURSION_UNCERTAIN'))
 assert.equal(result.trace!.frames.at(-4)!.normalizedDistance.toFixed(3),'0.105')
})
test('Starting open and ending open are half cycles, never completed',()=>{
 const frames=structuredClone(fixtures.periodic.frames).slice(3,-4)
 const result=run(frames);assert.equal(result.metrics.validTapCount,6)
 assert.deepEqual(result.trace!.cycles.map(c=>c.endMs),fixtures.periodic.expected.slice(1,-1))
})
test('Gap over 400ms cancels the open cycle; reacquisition cannot stitch it',()=>{
 const frames=structuredClone(fixtures.periodic.frames)
 for(let i=4;i<frames.length;i++)frames[i].timestampMs+=500
 const result=run(frames);assert.equal(result.metrics.validTapCount,7)
 assert.ok(result.trace!.decisions!.some(d=>d.reason==='TIME_GAP_RESET'))
 assert.ok(!result.trace!.cycles.some(c=>c.startMs<700&&c.endMs>700))
})
test('Initial rising half-cycle cannot count without closure',()=>{
 const frames=structuredClone(fixtures.periodic.frames).slice(0,9)
 const values=[.1,.2,.3,.4,.5,.6,.7,.8,.9]
 const result=run(frames.map((f:any,i:number)=>distance(f,values[i])))
 assert.equal(result.metrics.validTapCount,0)
})
