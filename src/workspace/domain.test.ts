// @vitest-environment node
import { describe,it,expect } from 'vitest'
import { compare, filterRuns, uniqueMeasurements, stats, intervalHistogram } from './domain'
import type { WorkspaceRun } from './contracts'
function run(patch:Partial<WorkspaceRun>={}):WorkspaceRun{return {id:'r1',subjectId:'synthetic-a',dataset:'DEMO',createdAt:'2026-09-01T01:00:00Z',context:null,acquisition:'DEMO',analysis:{sessionId:'s1',session:{subjectId:'synthetic-a',sessionId:'s1',origin:'SYNTHETIC',hand:'BOTH',device:'a',modality:'SYNTHETIC',protocolVersion:'v1',status:'COMPLETED',startedAt:'2026-09-01T01:00:00Z'},versions:{algorithm:'v1'},dataQuality:{status:'QUALIFIED',cleaningLog:[]},observations:{rate:{value:2}}},...patch} as WorkspaceRun}
describe('workspace comparisons',()=>{
 it('calculates explicit pair difference with zero-safe percentage',()=>{const a=run(),b=structuredClone(a);b.id='r2';b.analysis.sessionId='s2';b.analysis.observations.rate.value=3;expect(compare(a,b)).toMatchObject({baseline:2,current:3,delta:1,relative:50,reasons:[]});a.analysis.observations.rate.value=0;expect(compare(a,b).relative).toBeNull();expect(compare(a,b).delta).toBe(3)})
 it.each(['protocolVersion','device','hand','modality','origin','subjectId'] as const)('does not compare inconsistent %s',key=>{const a=run(),b=structuredClone(a);b.analysis.sessionId='s2';(b.analysis.session as unknown as Record<string,string>)[key]='other';expect(compare(a,b).delta).toBeNull();expect(compare(a,b).reasons.length).toBeGreaterThan(0)})
 it('keeps null values null, and same measurement versions non-comparable',()=>{const a=run(),b=structuredClone(a);expect(compare(a,b).delta).toBeNull();b.analysis.sessionId='s2';b.analysis.observations.rate.value=null;expect(compare(a,b).relative).toBeNull()})
 it('filters date and dataset consistently and counts measurements separately from analyses',()=>{const a=run(),b=run({id:'r2',createdAt:'2026-09-02T01:00:00Z'}),c=run({id:'r3',dataset:'CAPTURE'});const list=filterRuns([c,b,a],{dataset:'DEMO',from:'2026-09-01',to:'2026-09-01'});expect(list).toHaveLength(2);expect(uniqueMeasurements(list)).toHaveLength(1);expect(stats(list)).toMatchObject({cases:1,measurements:1,analyses:2});expect(filterRuns([a],{dataset:'DEMO',from:'2026-09-02'})).toEqual([])})
})

it("histogram preserves counts and boundary events",()=>{const h=intervalHistogram([100,199,200,200]);expect(h.width).toBe(100);expect(h.bins.map(b=>b.count)).toEqual([0,2,2]);expect(intervalHistogram([]).bins).toEqual([]);expect(()=>intervalHistogram([NaN])).toThrow("INVALID_INTERVAL")})
