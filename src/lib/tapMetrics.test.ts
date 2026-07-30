import { describe, expect, it } from 'vitest'
import {
  calculateTapMetrics,
  coefficientOfVariation,
  DEMO_INTERVALS,
  evaluatePersonalTrend,
  evaluateTestAssistance,
  speedDecay
} from './tapMetrics'

describe('tap metrics', () => {
  it('returns reproducible demo metrics', () => {
    const resultA = calculateTapMetrics(DEMO_INTERVALS, 6000, 0, { expectedDurationMs: 6000 })
    const resultB = calculateTapMetrics(DEMO_INTERVALS, 6000, 0, { expectedDurationMs: 6000 })

    expect(resultA).toEqual(resultB)
    expect(resultA.count).toBe(18)
    expect(resultA.rate).toBe(3)
    expect(resultA.quality).toBe('測試有效')
  })

  it('keeps a complete 20 second test with 8 correct alternating taps valid', () => {
    const result = calculateTapMetrics(
      [2800, 2600, 2500, 2700, 2400, 2600, 2500],
      20000,
      0,
      { expectedDurationMs: 20000, personalRateRange: [0.8, 4] }
    )

    expect(result.count).toBe(8)
    expect(result.quality).toBe('測試有效')
    expect(result.validity.status).toBe('有效')
    expect(result.speedRange).toBe('低於個人近期範圍')
    expect(result.rate).toBe(0.4)
  })

  it('marks an interrupted test as insufficient data', () => {
    const result = calculateTapMetrics([400, 420, 390], 12000, 0, {
      expectedDurationMs: 20000,
      interrupted: true
    })
    expect(result.quality).toBe('資料品質不足')
    expect(result.validity.reasons).toContain('測試中斷')
  })

  it('recommends retesting when alternation errors reach 20 percent', () => {
    const result = calculateTapMetrics(
      [900, 900, 900, 900, 900, 900, 900],
      20000,
      2,
      { expectedDurationMs: 20000 }
    )
    expect(result.validity.alternationErrorRate).toBe(20)
    expect(result.validity.reasons).toContain('左右交替錯誤過多')
    expect(result.quality).toBe('資料品質不足')
  })

  it('keeps speed when interval-derived features have too few samples', () => {
    const result = calculateTapMetrics([10000], 20000, 0, { expectedDurationMs: 20000 })
    expect(result.quality).toBe('測試有效')
    expect(result.rate).toBe(0.1)
    expect(result.variability).toBeNull()
    expect(result.variabilityAvailability).toBe('樣本不足')
    expect(result.fatigue).toBeNull()
  })

  it('calculates stable intervals with zero variability', () => {
    expect(coefficientOfVariation([400, 400, 400, 400])).toBe(0)
  })

  it('reports positive speed decay when later taps slow down', () => {
    expect(speedDecay([300, 300, 300, 450, 450, 450])).toBe(50)
  })

  it('does not notify a caregiver for one valid deviation', () => {
    const result = evaluatePersonalTrend({
      deviations: [false, false, true],
      validBaselinePairs: 10
    })
    expect(result.level).toBe('record-only')
    expect(result.notifyCaregiver).toBe(false)
  })

  it('notifies only after repeated valid deviations', () => {
    const attention = evaluatePersonalTrend({
      deviations: [true, false, true],
      validBaselinePairs: 10
    })
    const escalation = evaluatePersonalTrend({
      deviations: [true, true, true],
      validBaselinePairs: 10
    })

    expect(attention.level).toBe('caregiver-attention')
    expect(attention.notifyCaregiver).toBe(true)
    expect(attention.createVisitSummary).toBe(false)
    expect(escalation.level).toBe('caregiver-notified')
    expect(escalation.createVisitSummary).toBe(true)
    expect(escalation.acuteDangerInferred).toBe(false)
  })

  it('treats one alternation failure as a retest and two as a caregiver assistance need', () => {
    const first = evaluateTestAssistance({ consecutiveAlternationFailures: 1 })
    const second = evaluateTestAssistance({ consecutiveAlternationFailures: 2 })

    expect(first.level).toBe('retest')
    expect(first.notifyCaregiver).toBe(false)
    expect(second.level).toBe('caregiver-assistance')
    expect(second.notifyCaregiver).toBe(true)
    expect(second.reason).toBe('repeated-alternation-failure')
  })

  it('lets the user request caregiver assistance after the first failed attempt', () => {
    const result = evaluateTestAssistance({
      consecutiveAlternationFailures: 1,
      assistanceRequested: true
    })

    expect(result.notifyCaregiver).toBe(true)
    expect(result.reason).toBe('user-requested')
  })
})
