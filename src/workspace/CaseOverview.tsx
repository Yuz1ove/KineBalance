import type { WorkspaceRun, ContextRecord } from './contracts'
import { Panel, Empty, Badge, date } from './ui'
import { MetricStrip } from './AnalysisTrace'
import { TrendChart } from './MetricsChart'
import { uniqueMeasurements } from './domain'
import { RecordTable } from './HistoryView'
export function CaseOverview({runs,contexts,onSelect,onNavigate}:{runs:WorkspaceRun[];contexts:ContextRecord[];onSelect:(r:WorkspaceRun)=>void;onNavigate:(n:number)=>void}) {
 const latest=[...runs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]
 return <><div className="w-run-heading"><div><span className="w-eyebrow">CASE OVERVIEW / 本次評估</span><h1>{latest?'本次評估':'從一筆可追溯的量測開始'}</h1><p>{latest?`最近保存 ${date(latest.createdAt)} · ${latest.analysis.session.protocolVersion}`:'目前沒有量測資料。建立紀錄後，就能查看指標、品質、趨勢與分析依據。'}</p></div><div className="w-actions"><button className="w-primary" onClick={()=>onNavigate(1)}>開始量測</button><button disabled={!latest} onClick={()=>latest&&onSelect(latest)}>查看判讀</button></div></div>
 {latest&&<MetricStrip run={latest}/>}<div className="w-overview-grid"><Panel title="歷次敲擊速率" kicker="OBSERVATION / HISTORY"><TrendChart runs={uniqueMeasurements(runs)} onSelect={onSelect}/></Panel><Panel title="本次資料狀態" kicker="READINESS"><div className="w-check-row"><span>量測資料</span><Badge tone={latest?'good':'warn'}>{latest?'已保存':'尚無資料'}</Badge></div><div className="w-check-row"><span>背景自述</span><Badge tone={contexts.length?'neutral':'warn'}>{contexts.length?`v${Math.max(...contexts.map(c=>c.revision))}`:'未填寫'}</Badge></div><div className="w-check-row"><span>正式量表</span><Badge tone="warn">未建立</Badge></div><div className="w-check-row"><span>醫療證據</span><Badge tone="warn">未資格化</Badge></div><p>工程數值不等於臨床評分。資料缺項會保留，無法支持的结論不予推斷。</p><button onClick={()=>onNavigate(2)}>補充評估背景</button></Panel></div>
 <Panel title="最近評估紀錄" kicker="RECENT ASSESSMENTS">{runs.length?<RecordTable runs={runs.slice(-4)} onSelect={onSelect}/>:<Empty title="還沒有可重新開啟的分析">示範資料須由你主動載入；不會混入開發者量測。</Empty>}</Panel></>
}
