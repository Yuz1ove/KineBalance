import { useState } from 'react'
import type { WorkspaceRun } from './contracts'
import { intervals, compare, intervalHistogram } from './domain'
import { Details, Empty, date, num } from './ui'
export function TrendChart({runs,onSelect}:{runs:WorkspaceRun[];onSelect:(r:WorkspaceRun)=>void}) {
 const [range,setRange]=useState('all'),[selectedId,setSelectedId]=useState('')
 const ordered=[...runs].sort((a,b)=>Date.parse(a.analysis.session.startedAt)-Date.parse(b.analysis.session.startedAt))
 const last=ordered.length?Date.parse(ordered[ordered.length-1].analysis.session.startedAt):0
 const shown=range==='all'?ordered:ordered.filter(r=>Date.parse(r.analysis.session.startedAt)>=last-Number(range)*86400000)
 const selected=shown.find(r=>r.id===selectedId)??shown[shown.length-1]
 const valid=shown.filter(r=>r.analysis.observations.rate.value!==null)
 if(!runs.length)return <Empty title="尚無歷史量測">完成並保存第一筆量測後，即可查看每次觀測值與來源。</Empty>
 const width=760,height=220,max=Math.max(1,...valid.map(r=>r.analysis.observations.rate.value!))*1.2
 const start=Math.min(...shown.map(r=>Date.parse(r.analysis.session.startedAt))),end=Math.max(...shown.map(r=>Date.parse(r.analysis.session.startedAt)))
 const x=(r:WorkspaceRun)=>end===start?width/2:58+(Date.parse(r.analysis.session.startedAt)-start)/(end-start)*(width-92)
 const y=(r:WorkspaceRun)=>height-32-r.analysis.observations.rate.value!/max*(height-55)
 return <><div className="w-trend-tools"><label>時間範圍<select aria-label="時間範圍" value={range} onChange={e=>setRange(e.target.value)}><option value="all">全部紀錄</option><option value="7">最後一次量測往前 7 日</option><option value="30">最後一次量測往前 30 日</option></select></label><label>選取紀錄<select aria-label="選取紀錄" value={selected?.id??''} onChange={e=>setSelectedId(e.target.value)}>{shown.map(r=><option key={r.id} value={r.id}>{date(r.analysis.session.startedAt)} · {num(r.analysis.observations.rate.value)} 次／秒</option>)}</select></label></div>
 <div className="w-chart-meta"><span>敲擊速率 · 次／秒</span><span>{shown.length} 次量測 · 點選資料點查看</span></div>
 <svg className="w-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="歷次敲擊速率，可點選紀錄；下方亦提供選單與資料表">
 {[0,1,2,3,4].map(i=><g key={i}><line x1="52" x2={width-20} y1={height-32-i/4*(height-55)} y2={height-32-i/4*(height-55)} stroke="#D9DED9"/><text x="8" y={height-27-i/4*(height-55)}>{num(max*i/4)}</text></g>)}
 {shown.map((r,i)=>{const prev=shown[i-1];return r.analysis.observations.rate.value===null?null:<g key={r.id}>{prev&&compare(prev,r).reasons.length===0&&prev.analysis.observations.rate.value!==null&&<line x1={x(prev)} y1={y(prev)} x2={x(r)} y2={y(r)} stroke="#315647" strokeWidth="2"/>}<g role="button" tabIndex={0} aria-label={`${date(r.analysis.session.startedAt)}，${num(r.analysis.observations.rate.value)} 次每秒`} aria-pressed={r.id===selected?.id} onClick={()=>setSelectedId(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedId(r.id)}}}><circle cx={x(r)} cy={y(r)} r="18" fill="transparent"/>{r.id===selected?.id&&<circle cx={x(r)} cy={y(r)} r="11" fill="none" stroke="#315647"/>}<circle cx={x(r)} cy={y(r)} r="5" fill={r.analysis.dataQuality.status==='QUALIFIED'?'#315647':'#8B621F'}/></g></g>})}
 <text x="58" y={height-7}>{new Date(start).toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'})}</text><text x={width-25} y={height-7} textAnchor="end">{new Date(end).toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'})}</text>
 </svg>
 {selected&&<div className="w-trend-selection" aria-live="polite"><div><small>{date(selected.analysis.session.startedAt)} · {selected.dataset==='DEMO'?'DEMO 合成':'開發者操作'}</small><strong>{num(selected.analysis.observations.rate.value)} <small>次／秒</small></strong><small>有效事件 n = {selected.analysis.dataQuality.validEventIds.length} · {selected.analysis.dataQuality.status}</small></div><button onClick={()=>onSelect(selected)}>查看這筆依據 ↗</button><p>輸入方式：{selected.analysis.session.modality} · 條件與缺失值見下方資料表。</p></div>}
 <p className="w-caption">觀測來源：{runs[0].dataset==='DEMO'?'DEMO 合成事件':'開發者操作事件'}。不同裝置、方法或品質未通過的點不連線；無值保留為缺失。</p>
 <Details title="查看趨勢資料表與原始紀錄"><div className="w-table-wrap"><table><thead><tr><th>量測時間</th><th>速率（次／秒）</th><th>有效事件 n</th><th>裝置</th><th>品質</th></tr></thead><tbody>{shown.map(r=><tr key={r.id}><td><button className="w-link" onClick={()=>onSelect(r)}>{date(r.analysis.session.startedAt)}</button></td><td>{num(r.analysis.observations.rate.value)}</td><td>{r.analysis.dataQuality.validEventIds.length}</td><td>{r.analysis.session.device}</td><td>{r.analysis.dataQuality.status}</td></tr>)}</tbody></table></div></Details></>
}
export function EventChart({run}:{run:WorkspaceRun}) {
 const points=intervals(run), max=Math.max(1,...points.map(p=>p.value))
 const histogram=intervalHistogram(points.map(p=>p.value))
 const valid=new Set(run.analysis.dataQuality.validEventIds)
 return <><div className="w-chart-meta"><span>連續有效事件間隔 · ms</span><span>n = {points.length} 個間隔 · {num(run.analysis.session.elapsedMs/1000)} 秒</span></div>
 {points.length?<svg className="w-chart" viewBox="0 0 700 190" role="img" aria-label="敲擊間隔散點，未平滑或補值"><line x1="50" y1="152" x2="680" y2="152" stroke="#D9DED9"/><text x="0" y="28">{num(max)}</text><text x="26" y="157">0</text>{points.map(p=><circle key={p.eventId} cx={50+p.time/Math.max(1,run.analysis.session.elapsedMs)*620} cy={152-p.value/max*128} r="4" fill="#315F52"/>)}<text x="50" y="183">0 s</text><text x="630" y="183">{num(run.analysis.session.elapsedMs/1000)} s</text></svg>:<Empty title="間隔樣本不足">至少需要兩個有效事件才有一個間隔。</Empty>}
 <Details title="查看間隔分布與計數"><p>每格 {histogram.width} ms；左含右不含；n = {points.length}。{histogram.version}</p><div className="w-histogram">{histogram.bins.map(b=><div key={b.lower}><span>{b.lower}–{b.upper} ms</span><meter min={0} max={Math.max(1,...histogram.bins.map(x=>x.count))} value={b.count} aria-label={`${b.lower} 至 ${b.upper} 毫秒，${b.count} 個間隔`}/><strong>{b.count}</strong></div>)}</div></Details>
 <Details title={`原始事件與排除理由 · ${run.analysis.session.rawEvents.length} 筆`}><div className="w-table-wrap"><table><thead><tr><th>事件 ID</th><th>相對時間 ms</th><th>操作側</th><th>間隔 ms</th><th>納入狀態</th></tr></thead><tbody>{run.analysis.session.rawEvents.map(e=><tr key={`${e.eventId}-${e.relativeTimeMs}`}><td>{e.eventId}</td><td>{num(e.relativeTimeMs)}</td><td>{e.side==='left'?'左目標':'右目標'}</td><td>{num(points.find(p=>p.eventId===e.eventId)?.value)}</td><td>{valid.has(e.eventId)?'納入':run.analysis.dataQuality.cleaningLog.find(l=>l.includes(e.eventId))??'排除'}</td></tr>)}</tbody></table></div></Details>
 <p className="w-caption">橫軸為有效量測時間。保留原始順序、無效事件與中斷；左右目標事件不等於單手臨床測試。</p></>
}
