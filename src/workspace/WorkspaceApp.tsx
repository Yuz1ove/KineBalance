import { useCallback, useEffect, useState } from 'react'
import { MotionPreference } from '../brand/MotionPreference'
import { Activity, ArrowUpRight, ClipboardList, Database, FileChartColumn, LayoutDashboard, ScanLine } from 'lucide-react'
import type { CaseRecord, ContextRecord, WorkspaceRun, WorkspaceSnapshot } from './contracts'
import { navigation } from './contracts'
import { filterRuns, type Filters } from './domain'
import type { MotionInput } from '../kbpd/contracts'
import { api, download, initialize } from './api'
import { Badge, Empty, date } from './ui'
import { CaseOverview } from './CaseOverview'
import { MeasurementFlow } from './MeasurementFlow'
import { AssessmentWorkspace } from './AssessmentWorkspace'
import { AnalysisTrace } from './AnalysisTrace'
import { HistoryView, ReportPreview } from './HistoryView'
import { AdminAnalytics } from './AdminAnalytics'
import './workspace.css'
const icons=[LayoutDashboard,ScanLine,ClipboardList,Activity,FileChartColumn,Database]
const route=()=>{const n=Number(location.hash.slice(1));return Number.isInteger(n)&&n>=0&&n<6?n:0}
export default function WorkspaceApp({visible=true,onReturnToCover,onRouteChange}:{visible?:boolean;onReturnToCover?:()=>void;onRouteChange?:(hash:string)=>void}) {
 const [snapshot,setSnapshot]=useState<WorkspaceSnapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[measuring,setMeasuring]=useState(false)
 const [page,setPage]=useState(route),[dataset,setDataset]=useState<'DEMO'|'CAPTURE'>('DEMO'),[caseId,setCaseId]=useState(''),[runId,setRunId]=useState(''),[preview,setPreview]=useState<WorkspaceRun|null>(null)
 const [status,setStatus]=useState(''),[stale,setStale]=useState(false)
 const refresh=useCallback(async()=>{const s=await api<WorkspaceSnapshot>('snapshot');setSnapshot(s);setStale(false);return s},[])
 useEffect(()=>{let active=true;void initialize().then(()=>api<WorkspaceSnapshot>('snapshot')).then(s=>{if(active)setSnapshot(s)}).catch(()=>{if(active)setError('無法讀取本機服務。請確認 START.command 已啟動，再重新整理。')});return()=>{active=false}},[])
 useEffect(()=>{const fn=()=>{if(/^#[0-5]$/.test(location.hash)||location.hash==='#workspace')setPage(route())};addEventListener('popstate',fn);addEventListener('hashchange',fn);return()=>{removeEventListener('popstate',fn);removeEventListener('hashchange',fn)}},[])
 useEffect(()=>{if(!visible)return;document.title=`${navigation[page]}｜KineBalance 分析工作台`;const id=requestAnimationFrame(()=>document.getElementById('workspace-main')?.focus({preventScroll:true}));return()=>cancelAnimationFrame(id)},[page,visible])
 const navigate=(n:number)=>{if(measuring&&n!==1)return;setStatus('');setPreview(null);setPage(n);history.pushState(null,'',`#${n}`);onRouteChange?.(`#${n}`);window.scrollTo({top:0,behavior:'instant'})}
 const cases=snapshot?.cases.filter(c=>c.dataset===dataset)??[], selected=cases.find(c=>c.id===caseId)??cases[0]
 const runs=snapshot&&selected?filterRuns(snapshot.runs,{dataset,subjectId:selected.id}):[], contexts=snapshot?.contexts.filter(c=>c.subjectId===selected?.id)??[]
 const latestContext=[...contexts].sort((a,b)=>b.revision-a.revision)[0]
 const current=runs.find(r=>r.id===runId)??[...runs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]
 const selectRun=(r:WorkspaceRun)=>{setDataset(r.dataset);setCaseId(r.subjectId);setRunId(r.id);navigate(3)}
 async function act(fn:()=>Promise<void>,message='已保存，資料可重新開啟。') {setBusy(true);setError('');setStatus('');try{await fn();setStatus(message)}catch(e){setError(`操作未完成：${e instanceof Error?e.message:'SERVICE_UNAVAILABLE'}。已保存的資料保留；本次輸入仍在頁面。`)}finally{setBusy(false)}}
 async function save(session:MotionInput,imported=false) {await act(async()=>{const r=await api<WorkspaceRun>('runs',{session,acquisition:imported?'IMPORT':dataset,contextId:latestContext?.id??null,previousRunId:null});await refresh();selectRun(r)})}
 async function exportRows(f:Filters) {await act(async()=>{const r=await api<unknown>('export',f);download(`KineBalance-${f.dataset}-records.json`,JSON.stringify(r,null,2),'application/json')},'已匯出與目前篩選一致的資料。')}
 const exportRun=(r?:WorkspaceRun)=>r?setPreview(r):void exportRows({dataset,subjectId:selected?.id})
 return <div className="w-app" data-measuring={measuring}><a className="w-skip" href="#workspace-main" onClick={e=>{e.preventDefault();document.getElementById('workspace-main')?.focus()}}>跳至主要內容</a><aside className="w-sidebar"><div className="w-brand"><span className="w-brand-mark" aria-hidden="true"><i/><i/><i/><i/></span><div><strong>KineBalance</strong><small>量測與判讀工作站</small></div></div><button className="w-cover-return" disabled={measuring||busy} onClick={onReturnToCover}>← 返回品牌封面 <ArrowUpRight size={14}/></button><span className="w-side-label">WORKSPACE</span><nav aria-label="主要導覽">{navigation.map((label,n)=>{const Icon=icons[n];return <button key={label} aria-current={page===n?'page':undefined} disabled={busy||(measuring&&n!==1)} onClick={()=>navigate(n)}><Icon size={19}/><span>{label}</span><small>{String(n+1).padStart(2,'0')}</small></button>})}</nav><div className="w-side-bottom"><MotionPreference/><span className="w-connection" data-state={stale||!snapshot&&error?'unavailable':snapshot?'ready':'loading'}><i/> {stale?'資料更新失敗':snapshot?'本機資料已讀取':error?'服務不可用':'正在連接服務'}</span><p>原始紀錄保留，分析有據可查。</p><small>KBPD WORKSPACE · 1.0<br/>非臨床用途</small></div></aside>
 <div className="w-body"><header className="w-topbar"><div><span className="w-eyebrow">KINEBALANCE × ARCI</span><span className="w-location">{navigation[page]}</span></div><div className="w-top-status"><Badge>本機單一使用者</Badge><button aria-label="重新整理資料" disabled={busy||measuring} onClick={()=>void act(async()=>{try{await refresh()}catch(e){setStale(true);throw e}},'已從保存資料層更新。')}>重新整理</button></div></header>
 <div className="w-contextbar"><label>資料來源<select aria-label="資料來源" disabled={busy||measuring} value={dataset} onChange={e=>{setDataset(e.target.value as typeof dataset);setCaseId('');setRunId('');setPreview(null);setStatus('');setError('')}}><option value="DEMO">DEMO · 合成示範</option><option value="CAPTURE">開發者實際操作</option></select></label><label className="w-case-select">個案代碼<select aria-label="個案代碼" value={selected?.id??''} disabled={busy||measuring} onChange={e=>{setCaseId(e.target.value);setRunId('');setPreview(null);setStatus('');setError('')}}>{!cases.length&&<option value="">尚未建立個案</option>}{cases.map(c=><option key={c.id} value={c.id}>{c.id}</option>)}</select></label><button disabled={busy||measuring||!snapshot} onClick={()=>void act(async()=>{const c=await api<CaseRecord>('cases',{dataset});await refresh();setCaseId(c.id);setRunId('')},'已建立去識別化個案。')}>＋ 新個案</button><div className="w-source-note"><Badge tone={dataset==='DEMO'?'warn':'neutral'}>{dataset==='DEMO'?'DEMO':'開發者操作'}</Badge><small>{snapshot?`資料讀取 ${date(snapshot.updatedAt)}`:'等待服務'}</small></div></div>
 <main id="workspace-main" className="w-main" tabIndex={-1}>{measuring&&page!==1&&<p className="w-notice">量測已暫停。請由「開始量測」返回原量測，繼續或中止本次操作。</p>}{error&&<div className="w-error" role="alert">{error}</div>}{stale&&<Badge tone="warn">資料可能過期 · 更新失敗</Badge>}{status&&<p className="w-success" role="status">{status}</p>}
 <fieldset className="w-workspace-content" disabled={busy} aria-busy={busy}>
 {!snapshot?<Empty title={error?'服務未就緒':'正在讀取保存資料…'}>不會以示範數字替代無法讀取的資料。</Empty>:<>
 {preview&&<ReportPreview run={preview} onClose={()=>setPreview(null)} onDownload={()=>void act(async()=>{const v=await api<{markdown:string}>('export',{dataset:preview.dataset,subjectId:preview.subjectId,runId:preview.id});download(`KineBalance-${preview.dataset}-${preview.id}.md`,v.markdown)},'已下載分析報告。')}/>}
 <div hidden={!!preview}>
 {page===5?<AdminAnalytics snapshot={snapshot} onSelect={selectRun} onExport={f=>void exportRows(f)}/>:!selected?<><div className="w-intro"><span className="w-eyebrow">MEASUREMENT / EVIDENCE / HISTORY</span><h1>先選擇一份資料，再開始判讀。</h1><p>量測、品質、評估與依據集中在同一個工作區。此資料集目前沒有個案。</p>{dataset==='DEMO'?<button className="w-primary" disabled={busy} onClick={()=>void act(async()=>{await api('demo',{});await refresh();setCaseId('synthetic-workspace-demo')},'已載入獨立 DEMO：六次合成量測，包含裝置變化與中斷案例。')}>載入可重現示範資料 <ArrowUpRight size={18}/></button>:<p>使用上方「＋ 新個案」建立開發者操作紀錄。</p>}<div className="w-intro-grid"><div><strong>01</strong><h3>真實資料結構</h3><p>保存事件、演算法與版本。</p></div><div><strong>02</strong><h3>每個數值都有依據</h3><p>公式、樣本與排除原因。</p></div><div><strong>03</strong><h3>保留無法判斷的部分</h3><p>不補造量表與研究結論。</p></div></div></div></>:null}
 {selected&&<div key={selected.id}>
 <section hidden={page!==0} className="w-page-content"><CaseOverview runs={runs} contexts={contexts} onSelect={selectRun} onNavigate={navigate}/></section>
 <section hidden={page!==1} className="w-page-content w-measurement-page"><MeasurementFlow active={visible&&page===1&&!preview} selected={selected} onSave={save} onBack={()=>navigate(0)} onActivity={setMeasuring} busy={busy}/></section>
 <section hidden={page!==2} className="w-page-content"><AssessmentWorkspace subjectId={selected.id} contexts={contexts} busy={busy} onSave={v=>act(async()=>{await api<ContextRecord>('contexts',v);await refresh()})}/></section>
 <section hidden={page!==3} className="w-page-content">{current?<AnalysisTrace key={current.id} run={current} latest={latestContext} busy={busy} onReanalyze={()=>void act(async()=>{const r=await api<WorkspaceRun>('runs',{session:((({rawInputHash:_hash,...session})=>session)(current.analysis.session)),acquisition:current.acquisition,contextId:latestContext?.id??null,previousRunId:current.id});await refresh();selectRun(r)})}/>:<Empty title="尚無可判讀的紀錄">請先量測並保存，或載入合法合成資料。</Empty>}</section>
 <section hidden={page!==4} className="w-page-content"><HistoryView onCompareExport={(baselineId,currentId)=>void act(async()=>{const result=await api("export",{dataset,subjectId:selected.id,baselineId,currentId});download(`KineBalance-${dataset}-comparison.json`,JSON.stringify(result,null,2),"application/json")},"已匯出所選比較與公式。")} runs={runs} onSelect={selectRun} onExport={exportRun} busy={busy}/></section>
 </div>}
 </div></>}

 </fieldset></main><footer className="w-footer"><span>工程量測與研究紀錄 · 非診斷、非處方、非臨床驗證</span><span>醫療分析資格：UNQUALIFIED</span></footer></div></div>
}
