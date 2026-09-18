import type { AnalysisRecord, MotionInput } from './contracts'

export class AnalysisRequestError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Operation = 'save' | 'read'

async function requestAnalysis(url: string, operation: Operation, options: RequestInit): Promise<AnalysisRecord> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch (error) {
    // An intentional cancellation belongs to the component lifecycle. Preserve
    // it so leaving the scene does not become a misleading service failure.
    if (options.signal?.aborted || (error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) throw error
    throw new Error(operation === 'save'
      ? '無法連線至本機分析服務，尚未確認保存。本次輸入仍保留，請確認服務運作後再次提交。'
      : '無法連線至本機分析服務，尚未讀取這份紀錄。請確認服務運作後重新開啟此紀錄網址。')
  }
  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch (error) {
      if (options.signal?.aborted || (error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) throw error
    }
    const code = errorBody && typeof errorBody === 'object' && 'error' in errorBody ? errorBody.error : null
    if (code === 'ARCI_NATIVE_READ_REFUSED' || code === 'ARCI_NATIVE_READ_UNAVAILABLE') {
      const reason = code === 'ARCI_NATIVE_READ_REFUSED' ? 'ARCI 本地讀取被拒絕' : 'ARCI 本地讀取暫時無法使用'
      throw new AnalysisRequestError(response.status, operation === 'save'
        ? `${reason}，尚未完成保存請求。本次輸入仍保留，請確認服務後再次提交。`
        : `${reason}，尚未完成讀取請求。請確認服務後重新開啟此紀錄網址。`)
    }
    throw new AnalysisRequestError(response.status, response.status === 404
      ? '找不到這份已保存的分析紀錄。'
      : operation === 'save'
        ? `分析服務未完成保存請求（${response.status}）。本次輸入仍保留，可確認服務後再次提交。`
        : `分析服務未完成讀取請求（${response.status}）。請確認服務後重新開啟此紀錄網址。`)
  }
  let record: unknown
  try {
    record = await response.json()
  } catch (error) {
    if (options.signal?.aborted || (error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) throw error
    throw new Error('分析服務回傳的資料格式無法讀取。')
  }
  if (!record || typeof record !== 'object' || !('schemaVersion' in record)
    || record.schemaVersion !== 'KBPD-ANALYSIS-1') {
    throw new Error('分析服務回傳的資料格式無法讀取。')
  }
  return record as AnalysisRecord
}

export async function saveAnalysis(session: MotionInput, signal: AbortSignal) {
  return requestAnalysis('/api/kbpd/analyses', 'save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, medicationEvents: [] }),
    signal
  })
}

export async function readAnalysis(analysisId: string, signal: AbortSignal) {
  return requestAnalysis(`/api/kbpd/analyses/${encodeURIComponent(analysisId)}`, 'read', { signal })
}

export function developerSubjectId() {
  const key = 'kbpd-p1-developer-subject'
  try {
    const previous = localStorage.getItem(key)
    if (previous && /^dev-[\da-f-]{36}$/i.test(previous)) return previous
    const created = `dev-${crypto.randomUUID()}`
    localStorage.setItem(key, created)
    return created
  } catch {
    // A session remains usable when browser storage is disabled. It cannot
    // silently borrow another session's reference set.
    return `dev-${crypto.randomUUID()}`
  }
}
