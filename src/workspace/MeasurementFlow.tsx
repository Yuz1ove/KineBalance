import { useState } from 'react'
import type { MotionInput } from '../kbpd/contracts'
import type { CaseRecord } from './contracts'
import { TapTestScene } from '../scenes/TapTestScene'
import { computeMotion } from '../kbpd/domain'
import { Panel, Badge } from './ui'
export function MeasurementFlow({selected,onSave,onBack,onActivity,busy,active=true}:{active?:boolean;selected:CaseRecord;onSave:(s:MotionInput,imported?:boolean)=>Promise<void>;onBack:()=>void;onActivity:(v:boolean)=>void;busy:boolean}) {
 const [importText,setImportText]=useState(''),[importError,setImportError]=useState('')
 return <><div className="w-steps"><span>01 準備</span><span>02 操作說明</span><span>03 量測</span><span>04 品質確認</span><span>05 保存</span></div><div className="w-notice"><p>{selected.dataset==='DEMO'?'DEMO：6 秒固定合成序列，可重現但不能當作實際量測。':'開發者操作：20 秒雙側交替；從左目標開始，可用 F／J 鍵或觸控。請固定裝置、方向與輸入方式。'}</p><p>此工作站使用新的版面條件識別 workspace1，與舊 standard20/v1 不直接比較。指標公式與原始事件規則保持不變。</p></div>
 <div className="w-measurement"><TapTestScene active={active} onNext={onBack} workspace={{subjectId:selected.id,dataset:selected.dataset,onActivity,renderResult:s=>s?<Panel title="確認品質並保存" kicker="SAVE RESULT"><Badge tone={computeMotion(s).dataQuality.status==='QUALIFIED'?'good':'warn'}>{computeMotion(s).dataQuality.status}</Badge><p>本次 {s.rawEvents.length} 筆原始事件，{computeMotion(s).dataQuality.cleaningLog.length} 筆排除。保存後可查看 ARCI 有界讀取回執與完整依據。</p><button className="w-primary" disabled={busy} onClick={()=>onSave(s)}>{busy?'正在讀取、計算與保存…':'分析並保存這次量測'}</button></Panel>:null}}/></div>
 <Panel title="匯入既有開發／合成資料" kicker="IMPORT"><p>僅接受 KBPD-MOTION-1 原始量測 JSON。個案代碼必須與目前所選相同；不接受病患資料或匯入的衍生分數。</p>{importError&&<p role="alert">{importError}</p>}<details><summary>展開匯入工具</summary><textarea aria-label="原始量測 JSON" value={importText} onChange={e=>setImportText(e.target.value)} rows={8}/><button disabled={busy||!importText} onClick={async()=>{let body;try{body=JSON.parse(importText)}catch{setImportError('JSON 格式不正確，尚未匯入。');return}await onSave(body,true)}}>驗證並匯入</button></details></Panel></>
}
