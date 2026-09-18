import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { EVIDENCE_QUERY_MAX_LENGTH } from './evidenceContracts'
import type { EvidenceCard, EvidenceLookupRecord, EvidenceLookupStatus, EvidenceTopic } from './evidenceContracts'
import './evidence.css'

const topics: Record<EvidenceTopic, string> = {
  A: 'A · 指尖敲擊指標、方法與重複量測',
  B: 'B · 數位動作評估的族群與限制',
  C: 'C · 研究中的用藥時點與情境紀錄'
}
const statuses: Record<EvidenceLookupStatus, { title: string; explanation: string }> = {
  FOUND: { title: '找到符合範圍的研究證據', explanation: '以下是文獻中的一般研究描述，不是本次量測的醫療判讀。' },
  INSUFFICIENT_EVIDENCE: { title: '此文獻集合未找到足夠支持', explanation: '本次查詢未取得足夠且適用的證據。這不表示沒有疾病，也不能推定測量結果正常。' },
  OUT_OF_SCOPE: { title: '超出開放範圍', explanation: '本區塊只提供研究背景；不執行個人診斷、ON/OFF 判定、調藥、停藥或發藥。' },
  SOURCE_DISABLED: { title: '來源已停用或不可用', explanation: '來源目前不符合使用條件，不能作為現行可用證據。歷史查詢的版本與識別資料仍保留供追溯。' },
  SERVICE_UNAVAILABLE: { title: '檢索服務不可用', explanation: '此次原生檢索未完成，無法判斷是否有足夠證據。服務故障不等於證據不足。' },
  UNQUALIFIED: { title: '原生檢索資格尚未成立', explanation: '目前醫療檢索維持停用。此查詢的限制紀錄已保存，未提供研究證據卡。' }
}
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
const isText = (value: unknown): value is string => typeof value === 'string'
const isNullableText = (value: unknown) => value === null || isText(value)
const isTexts = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText)
function isCard(value: unknown): value is EvidenceCard {
  if (!isObject(value)) return false
  return ['evidenceId', 'chunkId', 'documentId', 'sourceId', 'title', 'documentType', 'sourceUrl',
    'excerpt', 'population', 'method', 'summaryLabel', 'sourceVersion', 'rawSha256', 'contentSha256'].every((key) => isText(value[key]))
    && isTexts(value.authors) && isTexts(value.matchedTerms) && isTexts(value.limitations)
    && (value.year === null || (typeof value.year === 'number' && Number.isInteger(value.year)))
    && isObject(value.locator) && isText(value.locator.type) && isText(value.locator.value) && isNullableText(value.locator.url)
    && isObject(value.license) && isText(value.license.name) && isNullableText(value.license.url) && (value.license.copyright === undefined || isText(value.license.copyright))
    && ['ACTIVE', 'DISABLED', 'RETRACTED', 'UNKNOWN'].includes(String(value.sourceStatus))
}

function isLookup(value: unknown): value is EvidenceLookupRecord {
  if (!isObject(value) || !['KBPD-EVIDENCE-LOOKUP-1','KBPD-EVIDENCE-LOOKUP-2'].includes(String(value.schemaVersion))
    || value.clinicalUse !== false || value.generativeAnswers !== false) return false
  if (!['lookupId', 'analysisId', 'createdAt', 'query', 'normalizedQuery'].every((key) => isText(value[key]))
    || !Number.isFinite(Date.parse(value.createdAt as string))
    || !['A', 'B', 'C'].includes(String(value.topic)) || !Object.hasOwn(statuses, String(value.status))
    || !isTexts(value.reasonCodes) || !isTexts(value.missingInformation)
    || !Array.isArray(value.cards) || !value.cards.every(isCard)) return false
  if (!isObject(value.versions) || !['corpus', 'retriever', 'policy'].every((key) => isText(value.versions && (value.versions as Record<string, unknown>)[key]))
    || !isNullableText(value.versions.glossary)) return false
  if (!isObject(value.qualification) || !['QUALIFIED', 'UNQUALIFIED', 'INVALIDATED'].includes(String(value.qualification.status))
    || !isNullableText(value.qualification.reference)) return false
  if (!isObject(value.trace) || !isNullableText(value.trace.entrypoint) || !isNullableText(value.trace.nativeRequestId)
    || !isNullableText(value.trace.nativeResultId)
    || !['governanceDecision', 'nativeExecutionStatus', 'applicationCorrelationId'].every((key) => isText((value.trace as Record<string, unknown>)[key]))) return false
  // An inconsistent response must never turn an unqualified or disabled source into a displayed card.
  return value.status === 'FOUND'
    ? value.qualification.status === 'QUALIFIED' && Boolean(value.qualification.reference)
      && value.cards.length > 0 && value.cards.every((card) => card.sourceStatus === 'ACTIVE')
    : value.cards.length === 0
}

const publicSourceHosts = new Set([
  'pmc.ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'www.ncbi.nlm.nih.gov',
  'doi.org', 'europepmc.org', 'creativecommons.org', 'www.creativecommons.org',
  'open.fda.gov', 'api.fda.gov', 'dailymed.nlm.nih.gov'
])
/** Source data stays inert text. Only the supported public source/license hosts become anchors. */
function sourceHref(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
      || !publicSourceHosts.has(host)) return null
    return url.href
  } catch { return null }
}

async function requestLookup(url: string, analysisId: string, options: RequestInit, expectedLookupId?: string, onValidity?: (value: string) => void): Promise<EvidenceLookupRecord> {
  let response: Response
  try { response = await fetch(url, options) } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error('無法連線至本機研究服務。尚未確認查詢紀錄是否已保存；這不代表證據不足。')
  }
  if (!response.ok) throw new Error(response.status === 404
    ? '找不到這份研究查詢紀錄，或它所連結的分析不存在。'
    : `研究服務未完成請求（${response.status}），尚未取得可讀取的查詢紀錄。`)
  let record: unknown
  try { record = await response.json() } catch { throw new Error('研究服務回傳的紀錄格式無法讀取，未顯示證據卡。') }
  if (!isLookup(record) || record.analysisId !== analysisId || (expectedLookupId && record.lookupId !== expectedLookupId)) {
    throw new Error('研究紀錄的格式、分析連結或資格狀態不一致，未顯示證據卡。')
  }
  onValidity?.(response.headers.get('X-KBPD-Qualification-Current') ?? 'UNKNOWN')
  return record
}

export function EvidencePanel({ analysisId }: { analysisId: string }) {
  const formId = useId()
  const [savedLookupId] = useState(() => new URLSearchParams(window.location.search).get('kbpdLookup'))
  const [topic, setTopic] = useState<EvidenceTopic>('A')
  const [query, setQuery] = useState('')
  const [record, setRecord] = useState<EvidenceLookupRecord | null>(null)
  const [loading, setLoading] = useState(Boolean(savedLookupId))
  const [error, setError] = useState('')
  const [readback, setReadback] = useState(false)
  const [currentValidity, setCurrentValidity] = useState('UNKNOWN')
  const request = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!savedLookupId) return
    const controller = new AbortController()
    request.current = controller
    requestLookup(`/api/kbpd/evidence-lookups/${encodeURIComponent(savedLookupId)}`, analysisId, { signal: controller.signal }, savedLookupId, setCurrentValidity)
      .then((result) => {
        if (controller.signal.aborted) return
        setRecord(result); setTopic(result.topic); setQuery(result.query); setReadback(true)
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '無法讀取研究查詢紀錄。')
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [analysisId, savedLookupId])
  useEffect(() => () => request.current?.abort(), [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (loading || !trimmedQuery || trimmedQuery.length > EVIDENCE_QUERY_MAX_LENGTH) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(''); setRecord(null); setReadback(false)
    try {
      const result = await requestLookup('/api/kbpd/evidence-lookups', analysisId, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, topic, query: trimmedQuery }), signal: controller.signal
      })
      if (result.topic !== topic || result.query !== trimmedQuery) {
        throw new Error('研究紀錄與本次送出的問題不一致，未顯示證據卡。')
      }
      if (!controller.signal.aborted) setRecord(result)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '研究查詢未完成。')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }

  return <section className="kbpd-evidence" aria-labelledby={`${formId}-heading`} data-testid="kbpd-evidence-panel" aria-busy={loading}>
    <header className="kbpd-evidence-heading">
      <div><span className="kbpd-evidence-eyebrow">KBPD-P2 · 研究資料查詢</span><h3 id={`${formId}-heading`}>相關研究與限制</h3></div>
      <span className="kbpd-evidence-label">研究用途 · 未經臨床驗證</span>
    </header>
    <p>本區塊查閱文獻中的一般研究描述，與上方本次量測數值分開。相似研究不表示 KineBalance 的 20 秒流程、裝置或公式已獲驗證。</p>
    <p className="kbpd-evidence-boundary">不生成醫療回答，不將次數、頻率或 CV 轉成病情、診斷、ON/OFF 或劑量建議。請只輸入一般研究問題，不填姓名、病史或個人量測資料。</p>
    <form onSubmit={submit} className="kbpd-evidence-form">
      <label htmlFor={`${formId}-topic`}>研究主題</label>
      <select id={`${formId}-topic`} value={topic} disabled={loading} onChange={(event) => setTopic(event.target.value as EvidenceTopic)}>
        {(Object.keys(topics) as EvidenceTopic[]).map((key) => <option key={key} value={key}>{topics[key]}</option>)}
      </select>
      <label htmlFor={`${formId}-query`}>簡短知識問題</label>
      <textarea id={`${formId}-query`} rows={3} required maxLength={EVIDENCE_QUERY_MAX_LENGTH} value={query} disabled={loading}
        onChange={(event) => setQuery(event.target.value)} placeholder="例如：重複進行指尖敲擊測量時，研究如何記錄測試條件？"
        aria-describedby={`${formId}-hint ${formId}-count`} />
      <div className="kbpd-evidence-form-note"><small id={`${formId}-hint`}>範例只提示提問方式；每次送出建立新的查詢紀錄。後端會先檢查原生資格與範圍；未合格時只保存限制紀錄。</small>
        <small id={`${formId}-count`}>{query.length} / {EVIDENCE_QUERY_MAX_LENGTH}</small></div>
      <button type="submit" disabled={loading || !query.trim()}>查詢並保存研究紀錄</button>
    </form>
    {loading ? <p role="status" data-testid="kbpd-evidence-loading">{savedLookupId && !record && !query ? '正在讀取已保存的研究查詢…' : '正在處理研究查詢，請稍候…'}</p> : null}
    {error ? <p role="alert" className="kbpd-evidence-error" data-testid="kbpd-evidence-error">{error}</p> : null}
    {record ? <LookupResult record={record} readback={readback} currentValidity={currentValidity} /> : null}
  </section>
}

function LookupResult({ record, readback, currentValidity }: { record: EvidenceLookupRecord; readback: boolean; currentValidity: string }) {
  const status = statuses[record.status]
  const readbackUrl = `${window.location.pathname}?kbpdAnalysis=${encodeURIComponent(record.analysisId)}&kbpdLookup=${encodeURIComponent(record.lookupId)}#clinical/tap`
  return <div data-testid="kbpd-lookup-record" data-lookup-id={record.lookupId} data-status={record.status} data-readback={String(readback)}>
    <div role="status" className="kbpd-evidence-status">
      <span>{readback ? '已從保存紀錄讀回，未重新檢索' : '查詢紀錄已保存'}</span>
      <h4>{status.title} <code>{record.status}</code></h4><p>{status.explanation}</p>
    </div>
    {readback ? <p data-testid="kbpd-current-validity">目前資格有效性：{currentValidity}。下列內容保留保存當時快照；歷史成功不代表新的查詢已獲資格。</p> : null}
    <p><strong>本筆問題：</strong>{record.query}</p>
    <p><strong>主題：</strong>{topics[record.topic]}</p>
    {record.missingInformation.length > 0 ? <div className="kbpd-evidence-missing"><strong>缺少或尚未驗證的事項</strong><ul>{record.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}
    {record.cards.length > 0 ? <div className="kbpd-evidence-cards">{record.cards.map((card) => <ResearchCard key={`${card.evidenceId}-${card.chunkId}`} card={card} />)}</div> : null}
    <p className="kbpd-evidence-readback"><a href={readbackUrl} target="_blank" rel="noreferrer" data-testid="kbpd-lookup-readback-link">在新頁面讀取同一筆分析與研究查詢</a></p>
    <details className="kbpd-evidence-trace"><summary>查看查詢、資格與原生執行追溯資料</summary><dl>
      <dt>查詢 ID</dt><dd><code data-testid="kbpd-lookup-id">{record.lookupId}</code></dd>
      <dt>連結分析 ID</dt><dd><code>{record.analysisId}</code></dd>
      <dt>建立時間</dt><dd><time dateTime={record.createdAt}>{record.createdAt}</time></dd>
      <dt>正規化查詢</dt><dd>{record.normalizedQuery}</dd>
      <dt>限制原因碼</dt><dd>{record.reasonCodes.join('、') || '無'}</dd>
      <dt>原生資格</dt><dd>{record.qualification.status} · {record.qualification.reference ?? 'null（尚無資格參照）'}</dd>
      <dt>Corpus／retriever／policy／glossary 版本</dt><dd><pre>{JSON.stringify(record.versions, null, 2)}</pre></dd>
      <dt>ARCI 實際入口</dt><dd>{record.trace.entrypoint ?? 'null（未進入原生檢索）'}</dd>
      <dt>治理決策</dt><dd>{record.trace.governanceDecision}</dd>
      <dt>原生執行結果</dt><dd>{record.trace.nativeExecutionStatus}</dd>
      <dt>應用 correlation ID（不是原生 ID）</dt><dd>{record.trace.applicationCorrelationId}</dd>
      <dt>原生 request ID</dt><dd>{record.trace.nativeRequestId ?? 'null（未取得）'}</dd>
      <dt>原生 result ID</dt><dd>{record.trace.nativeResultId ?? 'null（未取得）'}</dd>
    </dl></details>
  </div>
}

function SourceLink({ value, children }: { value: string | null; children: string }) {
  const href = sourceHref(value)
  return href ? <a href={href} target="_blank" rel="noreferrer">{children} ↗</a> : <span>{children}（無可用的公開 HTTPS 連結）</span>
}

function ResearchCard({ card }: { card: EvidenceCard }) {
  return <article className="kbpd-evidence-card" data-testid="kbpd-evidence-card">
    <span className="kbpd-evidence-label">文獻一般描述 · 非臨床建議</span>
    <h4>{card.title}</h4><p>{card.authors.join('、') || '作者 UNKNOWN'} · {card.year ?? '年份 UNKNOWN'} · {card.documentType}</p>
    <p><SourceLink value={card.sourceUrl}>開啟來源文件</SourceLink></p>
    <h5>原文摘錄（已整理空白與格式）</h5><blockquote>{card.excerpt}</blockquote>
    <p><strong>定位：</strong>{card.locator.type} · {card.locator.value} · <SourceLink value={card.locator.url}>開啟原文段落</SourceLink></p>
    <p><strong>查詢匹配詞：</strong>{card.matchedTerms.join('、') || '未列出'}</p>
    <p className="kbpd-evidence-editorial">以下族群、方法與限制欄位：{card.summaryLabel}。原文以摘錄及來源定位為準；未宣稱臨床專家核閱。</p>
    <dl><dt>研究族群</dt><dd>{card.population}</dd><dt>量測方法</dt><dd>{card.method}</dd>
      <dt>適用限制</dt><dd>{card.limitations.length ? <ul>{card.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul> : 'UNKNOWN（未提供可核對限制）'}</dd>
      <dt>來源版本</dt><dd>{card.sourceVersion}</dd><dt>授權</dt><dd><SourceLink value={card.license.url}>{card.license.name}</SourceLink></dd>
      {card.license.copyright ? <><dt>原始版權聲明</dt><dd data-testid="kbpd-source-copyright">{card.license.copyright}</dd></> : null}</dl>
    <details className="kbpd-evidence-trace"><summary>查看此摘錄的識別資料與內容雜湊</summary><dl>
      <dt>Source／document／evidence／chunk IDs</dt><dd><pre>{JSON.stringify({ sourceId: card.sourceId, documentId: card.documentId, evidenceId: card.evidenceId, chunkId: card.chunkId }, null, 2)}</pre></dd>
      <dt>Raw SHA-256</dt><dd><code>{card.rawSha256}</code></dd><dt>摘錄內容 SHA-256</dt><dd><code>{card.contentSha256}</code></dd>
      <dt>來源狀態</dt><dd>{card.sourceStatus}</dd>
    </dl></details>
  </article>
}
