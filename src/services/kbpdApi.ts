/**
 * KBPD Client API Service
 * Communicates with kbpd-core backend (http://127.0.0.1:4498)
 */

import type { LandmarkFrame, MeasurementOutput, MeasurementSource } from '../../kbpd-core/src/measurement/contracts.ts'
import { demoService } from '../demo/demo-service'
import { generateDemoArciInterpretation } from '../demo/demo-arci'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface HandTrackingFrame extends Omit<LandmarkFrame, 'tracked' | 'landmarks' | 'renderAtMs'> {
  tracked?: boolean
  landmarks: HandLandmark[]
  renderAtMs?: number
  confidence?: number // legacy only: never manufacture MediaPipe confidence
}

export function toAnalysisOutput(output: MeasurementOutput): AnalysisOutput {
  return { ...output, limitations:[...output.limitations], handSide: output.handSide as 'LEFT'|'RIGHT',
    metrics: {...output.metrics,averageOpeningAmplitudeNorm:output.metrics.averageAmplitudeNorm,intervalsMs:[...output.metrics.intervalSequenceMs]},
    quality: {...output.quality,status:output.quality.acceptableForKinematics?'QUALIFIED':output.quality.validFrames?'SUBOPTIMAL':'UNUSABLE',
      trackedFrames:output.quality.validFrames,effectiveTrackingRatio:output.quality.validFrameRatio,
      timeGapsCount:output.quality.trackingLossIntervals.filter(i=>i.reason==='TIME_GAP').length,
      trackingLostCount:output.quality.trackingLossIntervals.filter(i=>i.reason==='TRACKING_LOST').length},
  }
}
function normalizeAnalysis(output:any):AnalysisOutput|undefined {
  if(!output)return undefined
  return typeof output.quality?.validFrameRatio==='number'?toAnalysisOutput(output):output
}

export interface MeasurementMetrics {
  validTapCount: number
  averageFrequencyHz: number | null
  averageOpeningAmplitudeNorm: number | null
  intervalVariabilityCv: number | null
  amplitudeDecayRatio: number | null
  speedDecayRatio: number | null
  intervalsMs?: number[]
}

export interface DataQuality {
  acquisition?: MeasurementOutput['quality']['acquisition']
  status: 'QUALIFIED' | 'SUBOPTIMAL' | 'UNUSABLE'
  totalFrames: number
  trackedFrames: number
  effectiveTrackingRatio: number
  timeGapsCount: number
  trackingLostCount: number
  notes?: string[]
  reasons?: string[]
}

export interface AnalysisOutput {
  sessionId: string
  handSide: 'LEFT' | 'RIGHT'
  algorithmVersion: string
  metrics: MeasurementMetrics
  dataQuality?: DataQuality
  quality?: DataQuality
  limitations?: string[]
  calculatedAt?: string
  computedAt?: string
}

export function getQuality(analysis?: AnalysisOutput | null): DataQuality {
  if (!analysis) {
    return {
      status: 'UNUSABLE',
      totalFrames: 0,
      trackedFrames: 0,
      effectiveTrackingRatio: 0,
      timeGapsCount: 0,
      trackingLostCount: 0,
    }
  }
  return analysis.quality || analysis.dataQuality || {
    status: 'UNUSABLE',
    totalFrames: 0,
    trackedFrames: 0,
    effectiveTrackingRatio: 0,
    timeGapsCount: 0,
    trackingLostCount: 0,
  }
}

export interface ArciCitation {
  doi: string
  title: string
  findingExcerpt: string
  applicabilityLimit: string
}

export interface ArciInterpretation {
  status: 'QUALIFIED_INTERPRETATION' | 'UNQUALIFIED_RESEARCH_ONLY' | 'DATA_QUALITY_INSUFFICIENT' | 'UNAVAILABLE'
  engine?: 'LIVE_ARCI' | 'DEMO_FIXTURE'
  isDemoFixture?: boolean
  summary?: string
  observedMeasurements?: {
    validTaps?: number
    validTapCount?: number
    frequencyHz?: number | null
    averageFrequencyHz?: number | null
    amplitudeDecayRatio?: number | null
    speedDecayRatio?: number | null
    dataQualityStatus?: string
    handSide?: string
  }
  comparisonContext?: {
    hasPriorBaseline: boolean
    priorCount?: number
    comparableHistoricalSessionsCount?: number
    differenceNotes?: string
    notes?: string[]
  }
  evidenceSupportedInterpretation?: {
    synthesis?: string
    summary?: string
    citations?: ArciCitation[]
    citedEvidence?: ArciCitation[]
  }
  limitationsAndMissingData?: any
  nextSteps?: any
  disclaimer?: string
}

export interface MeasurementRecord {
  id: string
  measurement_id?: string
  ownerUserId: string
  profile_id?: string
  measured_at?: string
  session: {
    id: string
    ownerUserId: string
    handSide: 'LEFT' | 'RIGHT'
    status: string
    createdAt: string
  }
  hand?: 'left' | 'right'
  task?: 'finger_tapping'
  duration_sec?: number
  medication_phase?: 'pre' | 'post'
  minutes_from_medication?: number
  tap_frequency_hz?: number | null
  tap_count?: number
  rhythm_cv_pct?: number | null
  amplitude_decrement_pct?: number | null
  interruption_count?: number
  tracking_quality?: {
    valid_frame_ratio: number
    hand_visibility: number
    lighting: string
    confidence: number
  }
  quality_gate?: 'PASS' | 'REJECTED'
  rejection_reason?: string
  context?: {
    sleep_hours: number
    fatigue: number
    stress: number
    note?: string
  }
  source?: 'synthetic_demo' | 'live_measurement'
  demo_version?: string
  is_demo?: boolean
  media?: {
    id: string
    fileName: string
    fileSizeBytes: number
    mimeType: string
    sha256: string
    createdAt: string
  }
  analysis?: AnalysisOutput
  interpretation?: ArciInterpretation
}

export interface StorageUsage {
  userId: string
  totalBytesUsed: number
  quotaBytes: number
  mediaFilesCount: number
  measurementsCount: number
}

export interface DeletionReceipt {
  receiptToken: string
  userIdHash: string
  status: 'DELETED'
  erasedResources: {
    measurementsCount: number
    mediaFilesCount: number
    diskBytesFreed: number
  }
  completedAt: string
}

const STORAGE_KEY_TOKEN = 'kbpd_user_token'
const STORAGE_KEY_USER_ID = 'kbpd_user_id'

class KbpdApiService {
  private token: string | null = null
  private userId: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(STORAGE_KEY_TOKEN)
      this.userId = localStorage.getItem(STORAGE_KEY_USER_ID)
    }
  }

  isDemo(): boolean {
    return demoService.isDemoMode()
  }

  getToken(): string | null {
    if (demoService.isDemoMode()) {
      return this.token || 'DEMO-001-TOKEN'
    }
    return this.token
  }

  getUserId(): string | null {
    if (demoService.isDemoMode()) {
      return 'DEMO-001'
    }
    return this.userId
  }

  setSession(userId: string, token: string) {
    this.userId = userId
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER_ID, userId)
      localStorage.setItem(STORAGE_KEY_TOKEN, token)
    }
  }

  clearSession() {
    this.userId = null
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER_ID)
      localStorage.removeItem(STORAGE_KEY_TOKEN)
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const apiBase=(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/,'')
    const res = await fetch(apiBase+path, {
      ...options,
      headers,
    }).catch(() => { throw new Error('尚未保存：紀錄服務暫時無法連線，請稍後重試。') })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: {} }))
      const errorMsg = errBody.error?.message || errBody.error?.code || (res.status===404?'目前無法連接紀錄服務，資料尚未保存。請稍後重試。':`尚未保存：紀錄服務暫時無法回應（${res.status}），請稍後重試。`)
      throw new Error(errorMsg)
    }

    return res.json()
  }

  // Health
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/api/health')
  }

  // Auth & Identity
  async register(): Promise<{ userId: string; token: string; status: string }> {
    const data = await this.request<{ userId: string; token: string; status: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    this.setSession(data.userId, data.token)
    return data
  }

  async restoreSession(token: string): Promise<{ userId: string; token: string; status: string }> {
    const data = await this.request<{ userId: string; token: string; status: string }>('/api/auth/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({ token: token.trim() }),
    })
    this.setSession(data.userId, data.token)
    return data
  }

  // Storage Quota
  async getStorageUsage(): Promise<StorageUsage> {
    if (demoService.isDemoMode()) {
      return demoService.getStorageUsage()
    }
    const data = await this.request<any>('/api/me/storage')
    return {
      userId: data.userId || '',
      totalBytesUsed: data.totalBytesUsed ?? data.usedBytes ?? 0,
      quotaBytes: data.quotaBytes ?? 50 * 1024 * 1024,
      mediaFilesCount: data.mediaFilesCount ?? data.fileCount ?? 0,
      measurementsCount: data.measurementsCount ?? data.sessionCount ?? 0,
    }
  }

  async listMeasurements(page = 1, limit = 50): Promise<{ items: MeasurementRecord[]; total: number; page: number; limit: number }> {
    if (demoService.isDemoMode()) {
      const demoItems = demoService.getMeasurements()
      return {
        items: demoItems,
        total: demoItems.length,
        page: 1,
        limit,
      }
    }
    if (!this.getToken()) {
      return {
        items: [],
        total: 0,
        page,
        limit,
      }
    }
    const res = await this.request<any>(
      `/api/me/measurements?page=${page}&limit=${limit}`
    )
    const items = (res.items || []).map((item: any): MeasurementRecord => {
      const session = item.session || {
        id: item.id,
        ownerUserId: item.ownerUserId || item.owner_user_id || '',
        handSide: (item.handSide || item.hand_side || 'RIGHT') as 'LEFT' | 'RIGHT',
        status: item.status || 'COMPLETED',
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      }
      return {
        id: item.id || session.id,
        ownerUserId: item.ownerUserId || session.ownerUserId,
        session,
        analysis: normalizeAnalysis(item.analysis || item.measurementOutput),
        media: item.media || (item.mediaAssets && item.mediaAssets[0]),
        interpretation: item.interpretation,
      }
    })
    return {
      items,
      total: res.total ?? items.length,
      page: res.page ?? page,
      limit: res.limit ?? limit,
    }
  }

  async getMeasurement(id: string): Promise<MeasurementRecord> {
    if (demoService.isDemoMode()) {
      const demoItem = demoService.getMeasurementById(id)
      if (demoItem) return demoItem
    }
    const item=await this.request<MeasurementRecord & {measurementOutput?:MeasurementOutput}>(`/api/me/measurements/${id}`)
    return {...item,analysis:normalizeAnalysis(item.analysis || item.measurementOutput)}
  }

  async createSession(handSide: 'LEFT' | 'RIGHT', source: MeasurementSource = 'UNKNOWN'): Promise<{ id: string; ownerUserId: string; handSide: string }> {
    return this.request<{ id: string; ownerUserId: string; handSide: string }>('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handSide, source }),
    })
  }

  async uploadMedia(measurementId: string, blob: Blob, fileName = 'recording.webm'): Promise<any> {
    const arrayBuffer = await blob.arrayBuffer()
    return this.request(`/api/measurements/${measurementId}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': blob.type || 'video/webm',
        'X-File-Name': fileName,
      },
      body: arrayBuffer,
    })
  }

  async saveAnalysis(measurementId: string, handSide: 'LEFT' | 'RIGHT', frames: HandTrackingFrame[], source: MeasurementSource = 'UNKNOWN'): Promise<AnalysisOutput> {
    const output=await this.request<MeasurementOutput>(`/api/measurements/${measurementId}/analyze`, {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId:measurementId,handSide,source,protocolVersion:frames.some(f=>f.frameWidth&&f.frameHeight)?'KBPD-FT-IMAGE-2':'KBPD-FT-1.0',mirrored:false,displayMirrored:source==='CAMERA',
        frames:frames.map(f=>({...f,tracked:f.tracked===true,landmarks:f.landmarks}))}),
    })
    return toAnalysisOutput(output)
  }

  async interpret(measurementId: string, userQuery?: string): Promise<ArciInterpretation> {
    if (demoService.isDemoMode() || measurementId.startsWith('DEMO-')) {
      const res = generateDemoArciInterpretation(measurementId)
      res.engine = 'DEMO_FIXTURE'
      res.isDemoFixture = true
      return res
    }
    const result = await this.request<ArciInterpretation>(`/api/measurements/${measurementId}/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery }),
    })
    result.engine = 'LIVE_ARCI'
    return result
  }

  async deleteMeasurement(id: string): Promise<{ success: boolean; deletedMeasurementId: string }> {
    return this.request<{ success: boolean; deletedMeasurementId: string }>(`/api/measurements/${id}`, {
      method: 'DELETE',
    })
  }

  // Cascading Erasure
  async deleteAccount(): Promise<DeletionReceipt> {
    const data = await this.request<any>('/api/me', {
      method: 'DELETE',
    })
    this.clearSession()
    const sessions = data.erasedResources?.measurementsCount ?? data.purgedSummary?.sessionsCount ?? 0
    const media = data.erasedResources?.mediaFilesCount ?? data.purgedSummary?.mediaFilesCount ?? 0
    const bytes = data.erasedResources?.diskBytesFreed ?? (media * 1024 * 1024) ?? 0

    return {
      receiptToken: data.receiptToken || 'kbpd_receipt_purged',
      userIdHash: data.userIdHash || data.jobId || 'sha256:purged',
      status: 'DELETED',
      erasedResources: {
        measurementsCount: sessions,
        mediaFilesCount: media,
        diskBytesFreed: bytes,
      },
      completedAt: data.completedAt || data.requestedAt || new Date().toISOString(),
    }
  }

  async getDeletionReceipt(receiptToken: string): Promise<DeletionReceipt> {
    const data = await this.request<any>(`/api/deletions/${receiptToken}`)
    const sessions = data.erasedResources?.measurementsCount ?? data.purgedSummary?.sessionsCount ?? 0
    const media = data.erasedResources?.mediaFilesCount ?? data.purgedSummary?.mediaFilesCount ?? 0
    const bytes = data.erasedResources?.diskBytesFreed ?? (media * 1024 * 1024) ?? 0

    return {
      receiptToken: data.receiptToken || receiptToken,
      userIdHash: data.userIdHash || data.jobId || 'sha256:purged',
      status: 'DELETED',
      erasedResources: {
        measurementsCount: sessions,
        mediaFilesCount: media,
        diskBytesFreed: bytes,
      },
      completedAt: data.completedAt || data.requestedAt || new Date().toISOString(),
    }
  }

  // Real Hand Video Fixture Replay
  async getRealVideoFixture(disturbed = false): Promise<HandTrackingFrame[] | { meta: any; frames: HandTrackingFrame[] }> {
    if(import.meta.env.VITE_HOSTED_PREVIEW==='true'){
      const response=await fetch(`/fixtures/finger-tapping-synthetic${disturbed?'-disturbed':''}.json`)
      if(!response.ok)throw new Error('合成測試資料載入失敗')
      return response.json()
    }
    return this.request<any>(`/api/fixtures/real-video?disturbed=${disturbed}`)
  }
}

export const kbpdApi = new KbpdApiService()
