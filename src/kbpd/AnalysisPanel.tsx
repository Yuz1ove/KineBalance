import { useEffect, useRef, useState } from 'react'
import type { AnalysisRecord, MetricName, MotionInput } from './contracts'
import { AnalysisRequestError, readAnalysis, saveAnalysis } from './client'
import { EvidencePanel } from './EvidencePanel'
import './analysis.css'

type LoadState = 'idle' | 'loading' | 'complete' | 'missing' | 'error'
const metricLabels: Record<MetricName, string> = {
  validEventCount: '有效事件數', rate: '每秒速度',
  intervalVariability: '間隔變異', speedDecay: '速度遞減'
}
const formatNumber = (value: number | null) => value === null ? '無法計算' : Number(value.toFixed(3)).toString()
const taipeiTime = (timestamp: string) => new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
}).format(new Date(timestamp))

export function AnalysisPanel({ session }: { session: MotionInput | null }) {
  const [savedId] = useState(() => new URLSearchParams(window.location.search).get('kbpdAnalysis'))
  const [state, setState] = useState<LoadState>(savedId ? 'loading' : 'idle')
  const [record, setRecord] = useState<AnalysisRecord | null>(null)
  const [message, setMessage] = useState('')
  const [readback, setReadback] = useState(false)
  const request = useRef<AbortController | null>(null)

  const fail = (error: unknown) => {
    setState(error instanceof AnalysisRequestError && error.status === 404 ? 'missing' : 'error')
    setMessage(error instanceof Error ? error.message : '分析服務暫時無法連線。')
  }

  useEffect(() => {
    if (!savedId) return
    const controller = new AbortController()
    request.current = controller
    readAnalysis(savedId, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setRecord(result)
      setReadback(true)
      setState('complete')
    }).catch((error: unknown) => { if (!controller.signal.aborted) fail(error) })
    return () => controller.abort()
  }, [savedId])

  useEffect(() => () => request.current?.abort(), [])

  const submit = async () => {
    if (!session || state === 'loading') return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState('loading')
    setMessage('')
    try {
      const result = await saveAnalysis(session, controller.signal)
      if (controller.signal.aborted) return
      setRecord(result)
      setReadback(false)
      setState('complete')
    } catch (error) {
      if (!controller.signal.aborted) fail(error)
    }
  }

  return (
    <section className="kbpd-analysis" data-testid="kbpd-analysis-panel" data-state={state} aria-labelledby="kbpd-analysis-heading">
      <header className="kbpd-analysis-heading">
        <div>
          <span className="kbpd-eyebrow">KBPD-P1 · 帕金森氏症動作記錄</span>
          <h2 id="kbpd-analysis-heading">本次分析與保存紀錄</h2>
        </div>
        <span className="kbpd-tag">工程驗證 · 非臨床使用</span>
      </header>
      <p>從本次原始點擊計算描述性特徵，保存在此本機服務。數值不判定疾病、藥效或調藥需求。</p>
      {session && (!record || record.sessionId !== session.sessionId) ? (
        <div className="kbpd-submit-row">
          <button className="primary-button" onClick={submit} disabled={state === 'loading'}>
            分析並保存本次結果
          </button>
          <span>來源：{session.origin} · {session.rawEvents.length} 次原始輸入（含交替錯誤）</span>
        </div>
      ) : null}
      {state === 'idle' ? <p data-testid="kbpd-empty">完成或中止測試後，可主動分析並保存本次輸入。</p> : null}
      {state === 'loading' ? <p role="status" data-testid="kbpd-loading">{savedId && !session ? '正在讀取已保存紀錄…' : '正在計算並保存分析…'}</p> : null}
      {state === 'missing' || state === 'error' ? <p role="alert" data-testid={`kbpd-${state}`}>{message}</p> : null}
      {record && state === 'complete' ? <SavedAnalysis record={record} readback={readback} /> : null}
    </section>
  )
}

function SavedAnalysis({ record, readback }: { record: AnalysisRecord; readback: boolean }) {
  const readbackUrl = `${window.location.pathname}?kbpdAnalysis=${encodeURIComponent(record.analysisId)}#clinical/tap`
  return (
    <div data-testid="kbpd-saved-record" data-analysis-id={record.analysisId} data-readback={String(readback)}>
      <div className="kbpd-status-line" role="status">
        <strong>{readback ? '已從保存紀錄讀回' : '分析完成並已保存'}</strong>
        <span data-testid="kbpd-origin">{record.session.origin}</span>
        <span>{record.session.origin === 'SYNTHETIC' ? '固定節奏合成展示' : '開發者輸入擷取（可能包含自動化驗收事件）'}</span>
      </div>
      <p data-testid="kbpd-capture-time">擷取時間（臺北）：{taipeiTime(record.session.startedAt)} — {taipeiTime(record.session.endedAt)}</p>
      <div className="kbpd-observations">
        {(Object.keys(metricLabels) as MetricName[]).map((key) => {
          const observation = record.observations[key]
          return <div key={key} className="kbpd-observation" data-testid={`kbpd-metric-${key}`}>
            <span>{metricLabels[key]}</span>
            <strong>{formatNumber(observation.value)} <small>{observation.value === null ? '' : observation.unit}</small></strong>
            {observation.reasonCode ? <small>{observation.reasonCode}</small> : null}
          </div>
        })}
      </div>
      <div className="kbpd-result-columns">
        <section>
          <h3>資料品質</h3>
          <p data-testid="kbpd-quality"><strong>{record.dataQuality.status}</strong></p>
          <p>原始 {record.session.rawEvents.length} 次；計算採用 {record.dataQuality.validEventIds.length} 次。</p>
          <IssueList items={record.dataQuality.issues} empty="未發現本版規則涵蓋的品質問題。" />
        </section>
        <section>
          <h3>同條件個人參考</h3>
          <p data-testid="kbpd-comparison"><strong>{record.comparison.status === 'AVAILABLE' ? '可作描述性比較' : '參考資料不足／無法比較'}</strong></p>
          <p>{record.comparison.referenceCount} 組參考紀錄；最低需要 {record.referenceSet.minimumSessions} 組。規則尚未經臨床驗證。</p>
          <IssueList items={record.comparison.reasonCodes} empty="只描述同條件紀錄的數值差異。" />
          {record.comparison.status === 'AVAILABLE' ? <ul>
            {(Object.keys(record.comparison.metrics) as MetricName[]).map((key) => {
              const comparison = record.comparison.metrics[key]
              return comparison ? <li key={key}>{metricLabels[key]}：本次 {formatNumber(comparison.currentValue)}，參考平均 {formatNumber(comparison.referenceMean)}，差異 {formatNumber(comparison.delta)} {comparison.unit}</li> : null
            })}
          </ul> : null}
        </section>
      </div>
      <div className="kbpd-result-columns">
        <section>
          <h3>缺失資訊與限制</h3>
          <IssueList items={[...record.missingInformation, ...record.limitations]} empty="本紀錄未列出其他資訊。" />
          <p>吞服狀態：{record.medicationStatus.taken} · {record.medicationStatus.occurredAt ?? '無已知時間'}</p>
          <p>{record.medicationEvents.length === 0 ? '本次未接收服藥事件；' : `本次保存 ${record.medicationEvents.length} 筆服藥相關事件；`}排程、取杯與發藥狀態不會被當成已吞服。自述服藥仍不代表已驗證吞服。</p>
        </section>
        <section>
          <h3>P1 文字整理與歷史證據狀態</h3>
          <p>規則模板整理 · <code>{record.computationMode}</code></p>
          <p data-testid="kbpd-evidence">醫療證據：<strong>{record.evidenceStatus}</strong> · 檢索{record.evidenceBundle.retrievalEnabled ? '啟用' : '停用'}</p>
          <p>{record.evidenceBundle.reasonCode}</p>
          <p>以上是 P1 分析建立時保存的狀態。下方 P2 研究查詢另建紀錄，不改寫本筆 P1 分析。</p>
          <p data-testid="kbpd-arci">ARCI：{record.arci.status} · 原生呼叫 {record.arci.nativeCallCount} 次{record.arci.status === 'SUCCEEDED' ? '（僅本筆原始輸入讀取，不含參考與後續讀回）' : ''}</p>
          {record.arci.status === 'SUCCEEDED' ? <p>ARCI 已讀取本次原始輸入並交由 KineBalance 計算。ARCI 僅負責有界本地檔案讀取；動作數值由 KineBalance 原公式產生。重新開啟紀錄時只讀取保存結果。</p> : <p>此為未接通 ARCI 時建立的歷史紀錄。</p>}
          <p>下一步：檢視此紀錄、補充缺失資訊，或保留一份本機複核草稿；不自動發送通知。</p>
        </section>
      </div>
      <div className="kbpd-record-link">
        <span>分析 ID：<code data-testid="kbpd-analysis-id">{record.analysisId}</code></span>
        <a href={readbackUrl} target="_blank" rel="noreferrer" data-testid="kbpd-readback-link">在新頁面讀取這份已保存紀錄</a>
      </div>
      <details className="kbpd-provenance">
        <summary>查看輸入、計算公式與追溯資料</summary>
        <dl>
          <dt>保存時間</dt><dd>{taipeiTime(record.createdAt)}（臺北） · {record.createdAt}</dd>
          <dt>輸入 hash</dt><dd data-testid="kbpd-input-hash"><code>{record.inputHash}</code></dd>
          <dt>session ID</dt><dd>{record.sessionId}</dd>
          <dt>匿名開發識別</dt><dd>{record.subjectId}</dd>
          <dt>來源條件</dt><dd>{record.session.hand} · {record.session.modality} · {record.session.device} · {record.session.protocolVersion}</dd>
          <dt>開始／結束原始時間</dt><dd>{record.session.startedAt} — {record.session.endedAt}</dd>
          <dt>有效經過時間</dt><dd>{record.session.elapsedMs} ms · {record.session.status}（排除暫停時間）</dd>
          <dt>版本</dt><dd><code>{JSON.stringify(record.versions)}</code></dd>
          <dt>參考 session IDs</dt><dd data-testid="kbpd-reference-ids">{record.referenceSet.includedSessionIds.join(', ') || '無'}</dd>
          <dt>參考輸入 hash 與觀測</dt><dd><pre>{JSON.stringify(record.referenceSet.inputs, null, 2)}</pre></dd>
          <dt>排除的參考紀錄</dt><dd><pre>{JSON.stringify(record.referenceSet.excludedSessions, null, 2)}</pre></dd>
          <dt>清理紀錄</dt><dd><IssueList items={record.dataQuality.cleaningLog} empty="無清理事件。" /></dd>
          <dt>公式與最小樣本</dt><dd><ul>{(Object.keys(metricLabels) as MetricName[]).map((key) => <li key={key}>{metricLabels[key]}：{record.observations[key].formula}；至少 {record.observations[key].minimumEvents} 次有效事件。</li>)}</ul></dd>
          <dt>ARCI 建立時原生讀取證據</dt><dd><pre data-testid="kbpd-arci-receipt">{record.arci.status === 'SUCCEEDED' ? JSON.stringify(record.arci.receipt, null, 2) : record.arci.reasonCode}</pre></dd>
          <dt>證據引用</dt><dd><pre>{JSON.stringify(record.evidenceRefs, null, 2)}</pre></dd>
          <dt>原始輸入</dt><dd><pre data-testid="kbpd-raw-events">{JSON.stringify(record.session.rawEvents, null, 2)}</pre></dd>
        </dl>
      </details>
      <EvidencePanel key={record.analysisId} analysisId={record.analysisId} />
    </div>
  )
}

function IssueList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{empty}</p>
}
