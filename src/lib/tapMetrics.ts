import type {
  PersonalTrendAssessment,
  TapMetrics,
  TestAssistanceAssessment
} from '../types'

export interface TapMetricOptions {
  expectedDurationMs?: number
  interrupted?: boolean
  inputLost?: boolean
  personalRateRange?: readonly [number, number]
}

const MIN_COMPLETION_RATIO = 0.9
const MAX_ALTERNATION_ERROR_RATE = 0.2

export function coefficientOfVariation(intervals: number[]): number {
  if (intervals.length < 2) return 0
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
  if (mean === 0) return 0
  const variance =
    intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length
  return (Math.sqrt(variance) / mean) * 100
}

export function speedDecay(intervals: number[]): number {
  if (intervals.length < 6) return 0
  const split = Math.floor(intervals.length / 2)
  const first = intervals.slice(0, split)
  const second = intervals.slice(split)
  const firstMean = first.reduce((sum, value) => sum + value, 0) / first.length
  const secondMean = second.reduce((sum, value) => sum + value, 0) / second.length
  return ((secondMean - firstMean) / firstMean) * 100
}

export function calculateTapMetrics(
  intervals: number[],
  elapsedMs: number,
  invalidAlternations = 0,
  options: TapMetricOptions = {}
): TapMetrics {
  const count = intervals.length + (elapsedMs > 0 ? 1 : 0)
  const rate = elapsedMs > 0 ? count / (elapsedMs / 1000) : 0
  const attempts = count + invalidAlternations
  const alternationErrorRate = attempts > 0 ? invalidAlternations / attempts : 0
  const expectedDurationMs = options.expectedDurationMs ?? elapsedMs
  const completedRatio =
    expectedDurationMs > 0 ? Math.min(1, Math.max(0, elapsedMs / expectedDurationMs)) : 0
  const reasons: TapMetrics['validity']['reasons'] = []

  if (elapsedMs > 0 && completedRatio < MIN_COMPLETION_RATIO) reasons.push('測試時間未完成')
  if (alternationErrorRate >= MAX_ALTERNATION_ERROR_RATE) reasons.push('左右交替錯誤過多')
  if (options.interrupted) reasons.push('測試中斷')
  if (options.inputLost) reasons.push('輸入遺失')

  const validityStatus =
    elapsedMs === 0
      ? '蒐集中'
      : reasons.length === 0
        ? '有效'
        : '無效'
  const variabilityAvailable = intervals.length >= 2
  const fatigueAvailable = intervals.length >= 6
  const personalRateRange = options.personalRateRange
  const speedRange =
    validityStatus !== '有效' || !personalRateRange
      ? '尚未比較'
      : rate < personalRateRange[0]
        ? '低於個人近期範圍'
        : '個人近期範圍內'

  return {
    count,
    rate: Number(rate.toFixed(1)),
    variability: variabilityAvailable
      ? Number(coefficientOfVariation(intervals).toFixed(1))
      : null,
    variabilityAvailability: variabilityAvailable ? '可計算' : '樣本不足',
    fatigue: fatigueAvailable ? Number(speedDecay(intervals).toFixed(1)) : null,
    fatigueAvailability: fatigueAvailable ? '可計算' : '樣本不足',
    invalidAlternations,
    validity: {
      status: validityStatus,
      completedRatio: Number(completedRatio.toFixed(3)),
      alternationErrorRate: Number((alternationErrorRate * 100).toFixed(1)),
      reasons
    },
    quality:
      validityStatus === '蒐集中'
        ? '蒐集中'
        : validityStatus === '有效'
          ? '測試有效'
          : '資料品質不足',
    speedRange
  }
}

export function evaluatePersonalTrend({
  deviations,
  currentTestValid = true,
  validBaselinePairs
}: {
  deviations: boolean[]
  currentTestValid?: boolean
  validBaselinePairs: number
}): PersonalTrendAssessment {
  const baselineReady = validBaselinePairs >= 7
  const recent = deviations.slice(-3)
  const recentDeviationCount = recent.filter(Boolean).length
  let consecutiveDeviationCount = 0
  for (let index = deviations.length - 1; index >= 0 && deviations[index]; index -= 1) {
    consecutiveDeviationCount += 1
  }

  const shared = {
    validBaselinePairs,
    baselineReady,
    recentDeviationCount,
    consecutiveDeviationCount,
    acuteDangerInferred: false as const
  }

  if (!currentTestValid) {
    return {
      ...shared,
      level: 'invalid-retest',
      notifyCaregiver: false,
      createVisitSummary: false,
      headline: '測試無效，建議重測',
      guidance: '單次先引導重測；若連續兩次交替錯誤過多或本人求助，改發非緊急照護協助提醒。'
    }
  }

  if (!baselineReady) {
    return {
      ...shared,
      level: 'baseline-building',
      notifyCaregiver: false,
      createVisitSummary: false,
      headline: '累積基線中',
      guidance: '原型建議累積 7 至 14 組有效的服藥前後配對資料。'
    }
  }

  if (consecutiveDeviationCount >= 3) {
    return {
      ...shared,
      level: 'caregiver-notified',
      notifyCaregiver: true,
      createVisitSummary: true,
      headline: '已通知主要照顧者',
      guidance: '建議與醫療團隊共同複核，並已建立回診摘要。'
    }
  }

  if (recent.length === 3 && recentDeviationCount >= 2) {
    return {
      ...shared,
      level: 'caregiver-attention',
      notifyCaregiver: true,
      createVisitSummary: false,
      headline: '建議照顧者關注',
      guidance: '主要照顧者已收到非緊急提醒。'
    }
  }

  return {
    ...shared,
    level: 'record-only',
    notifyCaregiver: false,
    createVisitSummary: false,
    headline: recentDeviationCount > 0 ? '單次有效偏離，先記錄' : '落在個人近期範圍',
    guidance: '持續觀察，不立即通知；本次結果不影響依醫囑用藥。'
  }
}

export function evaluateTestAssistance({
  consecutiveAlternationFailures,
  assistanceRequested = false
}: {
  consecutiveAlternationFailures: number
  assistanceRequested?: boolean
}): TestAssistanceAssessment {
  if (assistanceRequested) {
    return {
      level: 'caregiver-assistance',
      consecutiveAlternationFailures,
      notifyCaregiver: true,
      reason: 'user-requested',
      headline: '已通知主要照顧者協助',
      guidance: '使用者已主動求助；這是非緊急操作協助提醒，不是疾病惡化或急性醫療警報。'
    }
  }

  if (consecutiveAlternationFailures >= 2) {
    return {
      level: 'caregiver-assistance',
      consecutiveAlternationFailures,
      notifyCaregiver: true,
      reason: 'repeated-alternation-failure',
      headline: '已通知主要照顧者協助',
      guidance: '連續兩次交替錯誤過多，可能需要操作協助；系統不據此判定症狀，也不改變用藥。'
    }
  }

  if (consecutiveAlternationFailures === 1) {
    return {
      level: 'retest',
      consecutiveAlternationFailures,
      notifyCaregiver: false,
      reason: 'none',
      headline: '先在現場引導重測',
      guidance: '單次錯誤可能來自按鍵理解、誤觸或裝置操作；若無法自行重測，可立即請家屬協助。'
    }
  }

  return {
    level: 'none',
    consecutiveAlternationFailures: 0,
    notifyCaregiver: false,
    reason: 'none',
    headline: '目前不需要操作協助',
    guidance: '未偵測到連續交替操作失敗。'
  }
}

export const DEMO_INTERVALS = [
  310, 298, 322, 305, 315, 301, 328, 307, 319, 312, 325, 318, 333, 321, 337, 329,
  341
]
