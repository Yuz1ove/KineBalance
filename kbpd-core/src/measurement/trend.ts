import { createHash } from 'node:crypto'
import type { StoredMeasurement } from '../storage/store.ts'
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function calculateTrend(records: StoredMeasurement[]) {
  const points = records.filter(r => r.measurementOutput?.quality.acceptableForKinematics)
    .sort((a,b) => a.session.createdAt.localeCompare(b.session.createdAt) || a.session.id.localeCompare(b.session.id))
    .map(r => ({ measurementId: r.session.id, timestamp: r.session.createdAt, handSide: r.session.handSide,
      source: r.metadata?.source ?? 'UNKNOWN', rawHash: r.rawInput ? digest(r.rawInput) : null,
      analysisId: r.session.id, analysisHash: digest(r.measurementOutput),
      frequencyHz: r.measurementOutput!.metrics.averageFrequencyHz,
      amplitudeNorm: r.measurementOutput!.metrics.averageAmplitudeNorm,
      variabilityCv: r.measurementOutput!.metrics.intervalVariabilityCv }))
  const mean = (ps: typeof points, key: 'frequencyHz'|'amplitudeNorm'|'variabilityCv') => {
    const vs = ps.map(p=>p[key]).filter((v):v is number=>v!==null && Number.isFinite(v))
    return vs.length ? Number((vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(6)) : null
  }
  const window = (ps: typeof points) => ({measurementIds:ps.map(p=>p.measurementId), start:ps[0]?.timestamp??null,end:ps.at(-1)?.timestamp??null,
    frequencyHz:mean(ps,'frequencyHz'),amplitudeNorm:mean(ps,'amplitudeNorm'),variabilityCv:mean(ps,'variabilityCv')})
  const sides = (['LEFT','RIGHT'] as const).map(handSide=>{
    const ps=points.filter(p=>p.handSide===handSide); const baseline=window(ps.slice(0,2)); const comparison=window(ps.length>=4?ps.slice(-2):[])
    const deltas=Object.fromEntries((['frequencyHz','amplitudeNorm','variabilityCv'] as const).map(k=>[k,baseline[k]!==null&&comparison[k]!==null?Number((comparison[k]!-baseline[k]!).toFixed(6)):null]))
    return {handSide,count:ps.length,baseline,comparison,deltas}
  })
  const value={schemaVersion:'KBPD-TREND-1',method:'first-2-versus-last-2-same-hand-disjoint',points,sides}
  return {...value,id:`trend-${digest(value)}`}
}
