import type { WorkspaceRun } from './contracts'
import type { MetricName } from '../kbpd/contracts'
export interface Filters { dataset: 'DEMO' | 'CAPTURE'; subjectId?: string; from?: string; to?: string; hand?: string; protocol?: string; acquisition?: string }
export function filterRuns(runs: WorkspaceRun[], f: Filters) {
  return runs.filter(r => r.dataset === f.dataset && (!f.subjectId || r.subjectId === f.subjectId)
    && (!f.from || r.analysis.session.startedAt.slice(0,10) >= f.from) && (!f.to || r.analysis.session.startedAt.slice(0,10) <= f.to)
    && (!f.hand || r.analysis.session.hand === f.hand) && (!f.protocol || r.analysis.session.protocolVersion === f.protocol)
    && (!f.acquisition || r.acquisition === f.acquisition))
    .sort((a,b) => a.analysis.session.startedAt.localeCompare(b.analysis.session.startedAt) || a.createdAt.localeCompare(b.createdAt))
}
export function compare(a: WorkspaceRun, b: WorkspaceRun, key: MetricName = 'rate') {
  const reasons: string[] = []
  for (const k of ['subjectId','origin','hand','device','modality','protocolVersion'] as const) if(a.analysis.session[k] !== b.analysis.session[k]) reasons.push(`${k} 不一致`)
  if(a.analysis.versions.algorithm !== b.analysis.versions.algorithm) reasons.push('演算法版本不一致')
  if(a.analysis.dataQuality.status !== 'QUALIFIED' || b.analysis.dataQuality.status !== 'QUALIFIED') reasons.push('資料品質不足')
  if(a.analysis.sessionId === b.analysis.sessionId) reasons.push('同一量測的不同分析版本，不是兩次量測')
  const baseline = a.analysis.observations[key].value, current = b.analysis.observations[key].value
  if(baseline === null || current === null) reasons.push('樣本不足，無數值')
  const delta = reasons.length || baseline === null || current === null ? null : Number((current-baseline).toFixed(6))
  return { baseline, current, delta, relative: delta === null || baseline === null || baseline === 0 ? null : delta / Math.abs(baseline) * 100, reasons, version: 'KBPD-PAIR-1', formula: '目前值 − 基準值；相對差異 = 差異 / |基準值| × 100。僅描述兩次觀測，不代表個人基線或臨床變化。' }
}
export function uniqueMeasurements(runs: WorkspaceRun[]) {
  return [...new Map([...runs].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(r=>[r.analysis.sessionId,r])).values()]
}
export function intervals(run: WorkspaceRun) {
  const valid = new Set(run.analysis.dataQuality.validEventIds)
  const events = run.analysis.session.rawEvents.filter(e=>valid.has(e.eventId))
  return events.slice(1).map((e,i)=>({eventId:e.eventId, time:e.relativeTimeMs, value:e.relativeTimeMs-events[i].relativeTimeMs}))
}
export function stats(runs: WorkspaceRun[]) {
  const measurements=uniqueMeasurements(runs)
  return { cases: new Set(runs.map(r=>r.subjectId)).size, measurements: measurements.length, analyses:runs.length,
    usable:measurements.filter(r=>r.analysis.dataQuality.status==='QUALIFIED').length,
    incomplete:measurements.filter(r=>r.analysis.session.status==='INTERRUPTED').length,
    excluded:measurements.reduce((n,r)=>n+r.analysis.dataQuality.cleaningLog.length,0),
    missingContext:runs.filter(r=>!r.context).length,
    protocols:new Set(measurements.map(r=>r.analysis.session.protocolVersion)).size,
    devices:new Set(measurements.map(r=>r.analysis.session.device)).size }
}
export function report(run: WorkspaceRun) {
  return [`# KineBalance 評估紀錄 · ${run.dataset === 'DEMO' ? 'DEMO 合成示範' : '開發者操作（非臨床）'}`,
    `個案：${run.subjectId}`, `量測：${run.analysis.sessionId}`, `分析：${run.id}`, `時間：${run.analysis.session.startedAt}`,
    `輸入 SHA-256：${run.analysis.inputHash}`, `方法：${run.analysis.session.protocolVersion}`, `演算法：${run.analysis.versions.algorithm}`,
    ...Object.entries(run.analysis.observations).map(([k,v])=>`${k}: ${v.value ?? '缺失'} ${v.unit}\n計算：${v.formula}`),
    `有效樣本：${run.analysis.dataQuality.validEventIds.length}`, `品質：${run.analysis.dataQuality.status}`,
    `排除：${run.analysis.dataQuality.cleaningLog.join('; ') || '無'}`, `品質缺項：${run.analysis.dataQuality.issues.join('; ') || '無'}`,
    `背景紀錄：${run.context?.id ?? '缺少'}；版本：${run.context?.revision ?? '未填'}；人工輸入、未經專業確認`,
    run.context ? `填寫者代碼：${run.context.recorder}；來源：${run.context.source}；時間：${run.context.createdAt}\n疲勞：${run.context.fatigue}；中斷自述：${run.context.interruption}；服藥時間自述：${run.context.medicationAt ?? 'UNKNOWN'}\n背景註記：${run.context.note}` : '',
    '正式量表：無已確認授權的整合，未計算正式量表分數。',
    `ARCI：${run.core.revision}；${run.core.digest}；實際角色：有界本地檔案讀取`,
    `原生狀態：${run.analysis.arci.status}；非醫療推論`, '本次使用研究來源：0；研究證據資格：UNQUALIFIED。',
    '事實：以上為量測事件及確定性工程統計。解讀：需符合方法、裝置、來源與品質條件才能比較。',
    `尚缺資訊：${run.analysis.missingInformation.join('；')}`, '人工覆核：未覆核', ...run.analysis.limitations].join('\n\n')
}
/** Inclusive lower, exclusive upper bounds; width is an explicit 100 ms multiple, at most 11 bins. */
export function intervalHistogram(values:number[]) {
  if(values.some(v=>!Number.isFinite(v)||v<0))throw new Error('INVALID_INTERVAL')
  if(!values.length)return {width:100,bins:[] as {lower:number;upper:number;count:number}[],version:'KBPD-INTERVAL-HISTOGRAM-1'}
  const max=Math.max(...values),width=Math.max(100,Math.ceil(max/1000)*100)
  const bins=Array.from({length:Math.floor(max/width)+1},(_,i)=>({lower:i*width,upper:(i+1)*width,count:0}))
  values.forEach(v=>bins[Math.floor(v/width)].count++)
  return {width,bins,version:'KBPD-INTERVAL-HISTOGRAM-1'}
}
