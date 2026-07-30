export type SceneId =
  | 'schedule'
  | 'tap'
  | 'dispense'
  | 'followup'
  | 'trend'
  | 'review'

export type AsyncState = 'idle' | 'loading' | 'success' | 'error' | 'insufficient'

export type MetricAvailability = '可計算' | '樣本不足'

export interface TapValidity {
  status: '蒐集中' | '有效' | '無效'
  completedRatio: number
  alternationErrorRate: number
  reasons: Array<'測試時間未完成' | '左右交替錯誤過多' | '測試中斷' | '輸入遺失'>
}

export interface TapMetrics {
  count: number
  rate: number
  variability: number | null
  variabilityAvailability: MetricAvailability
  fatigue: number | null
  fatigueAvailability: MetricAvailability
  invalidAlternations: number
  validity: TapValidity
  quality: '蒐集中' | '測試有效' | '資料品質不足'
  speedRange: '尚未比較' | '個人近期範圍內' | '低於個人近期範圍'
}

export type TestAssistanceLevel = 'none' | 'retest' | 'caregiver-assistance'

export interface TestAssistanceAssessment {
  level: TestAssistanceLevel
  consecutiveAlternationFailures: number
  notifyCaregiver: boolean
  reason: 'none' | 'repeated-alternation-failure' | 'user-requested'
  headline: string
  guidance: string
}

export type TrendSafetyLevel =
  | 'baseline-building'
  | 'invalid-retest'
  | 'record-only'
  | 'caregiver-attention'
  | 'caregiver-notified'

export interface PersonalTrendAssessment {
  level: TrendSafetyLevel
  validBaselinePairs: number
  baselineReady: boolean
  recentDeviationCount: number
  consecutiveDeviationCount: number
  notifyCaregiver: boolean
  createVisitSummary: boolean
  acuteDangerInferred: false
  headline: string
  guidance: string
}

export interface TapResult {
  mode: 'standard' | 'demo'
  elapsedMs: number
  intervals: number[]
  metrics: TapMetrics
}

export interface ResearchSource {
  year: string
  title: string
  takeaway: string
  limitation: string
  href: string
}
