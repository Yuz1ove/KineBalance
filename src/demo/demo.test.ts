import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DEMO_PROFILE, DEMO_STORAGE_KEY } from './demo-profile'
import { DEMO_MEASUREMENTS } from './demo-dataset'
import { demoService } from './demo-service'
import { generateDemoArciInterpretation } from './demo-arci'
import { kbpdApi } from '../services/kbpdApi'

describe('KineBalance Official Demo Mode Suite (TEST 01 - TEST 15)', () => {
  beforeEach(() => {
    localStorage.clear()
    demoService.disableDemoMode()
  })

  afterEach(() => {
    localStorage.clear()
    demoService.disableDemoMode()
  })

  // TEST 01: Profile identification
  it('TEST 01: identifies the synthetic demo profile correctly', () => {
    expect(DEMO_PROFILE.profile_id).toBe('DEMO-001')
    expect(DEMO_PROFILE.name).toBe('展示個案 A')
    expect(DEMO_PROFILE.dateRange.totalDays).toBe(14)
    expect(DEMO_PROFILE.dateRange.start).toBe('2026-09-04')
    expect(DEMO_PROFILE.dateRange.end).toBe('2026-09-17')
    expect(DEMO_PROFILE.source).toBe('synthetic_demo')
    expect(DEMO_PROFILE.isDemo).toBe(true)
  })

  // TEST 02: Exactly 56 measurements
  it('TEST 02: contains exactly 56 measurements in the seed dataset', () => {
    expect(DEMO_MEASUREMENTS.length).toBe(56)
  })

  // TEST 03: Quality breakdown (55 PASS, 1 REJECTED)
  it('TEST 03: has exactly 55 PASS records and 1 REJECTED record', () => {
    const passed = DEMO_MEASUREMENTS.filter((m) => m.quality_gate === 'PASS')
    const rejected = DEMO_MEASUREMENTS.filter((m) => m.quality_gate === 'REJECTED')
    expect(passed.length).toBe(55)
    expect(rejected.length).toBe(1)
  })

  // TEST 04: Unique record IDs
  it('TEST 04: verifies that all 56 measurement IDs are unique', () => {
    const ids = DEMO_MEASUREMENTS.map((m) => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(56)
  })

  // TEST 05: Date continuity over 14 days (2026-09-04 to 2026-09-17)
  it('TEST 05: spans 14 continuous days from 2026-09-04 to 2026-09-17 with 4 sessions per day', () => {
    const dates = new Set(DEMO_MEASUREMENTS.map((m) => m.measured_at.slice(0, 10)))
    expect(dates.size).toBe(14)
    expect(dates.has('2026-09-04')).toBe(true)
    expect(dates.has('2026-09-17')).toBe(true)

    // Verify each day has exactly 4 measurements (2 hands * 2 phases)
    for (const d of dates) {
      const dayRecords = DEMO_MEASUREMENTS.filter((m) => m.measured_at.slice(0, 10) === d)
      expect(dayRecords.length).toBe(4)
    }
  })

  // TEST 06: Bilateral hand balance
  it('TEST 06: has exactly 28 right hand and 28 left hand measurements', () => {
    const right = DEMO_MEASUREMENTS.filter((m) => m.hand === 'right' || m.session.handSide === 'RIGHT')
    const left = DEMO_MEASUREMENTS.filter((m) => m.hand === 'left' || m.session.handSide === 'LEFT')
    expect(right.length).toBe(28)
    expect(left.length).toBe(28)
  })

  // TEST 07: Medication phase distribution
  it('TEST 07: distributes equally across PRE_DOSE and POST_DOSE phases', () => {
    const pre = DEMO_MEASUREMENTS.filter((m) => m.medication_phase === 'pre')
    const post = DEMO_MEASUREMENTS.filter((m) => m.medication_phase === 'post')
    expect(pre.length).toBe(28)
    expect(post.length).toBe(28)

    const preRight = DEMO_MEASUREMENTS.filter((m) => m.hand === 'right' && m.medication_phase === 'pre')
    const postRight = DEMO_MEASUREMENTS.filter((m) => m.hand === 'right' && m.medication_phase === 'post')
    const preLeft = DEMO_MEASUREMENTS.filter((m) => m.hand === 'left' && m.medication_phase === 'pre')
    const postLeft = DEMO_MEASUREMENTS.filter((m) => m.hand === 'left' && m.medication_phase === 'post')

    expect(preRight.length).toBe(14)
    expect(postRight.length).toBe(14)
    expect(preLeft.length).toBe(14)
    expect(postLeft.length).toBe(14)
  })

  // TEST 08: Kinematic metrics validity
  it('TEST 08: verifies kinematic metrics for PASS vs REJECTED records', () => {
    const passed = DEMO_MEASUREMENTS.filter((m) => m.quality_gate === 'PASS')
    for (const p of passed) {
      expect(p.tap_frequency_hz).toBeGreaterThan(0)
      expect(p.tap_count).toBeGreaterThanOrEqual(10)
      expect(p.amplitude_decrement_pct).toBeGreaterThan(0)
      expect(p.rhythm_cv_pct).toBeGreaterThan(0)
      expect(p.tracking_quality.confidence).toBeGreaterThanOrEqual(0.85)
    }

    const rejected = DEMO_MEASUREMENTS.find((m) => m.quality_gate === 'REJECTED')!
    expect(rejected.tap_frequency_hz).toBeNull()
    expect(rejected.tap_count).toBe(0)
    expect(rejected.amplitude_decrement_pct).toBeNull()
    expect(rejected.rhythm_cv_pct).toBeNull()
  })

  // TEST 09: Precise rejected record identification
  it('TEST 09: correctly identifies the 2026-09-08 AM PRE RIGHT rejected record', () => {
    const rejected = DEMO_MEASUREMENTS.find((m) => m.quality_gate === 'REJECTED')
    expect(rejected).toBeDefined()
    expect(rejected!.id).toBe('DEMO-001-20260908-AM-PRE-R')
    expect(rejected!.measured_at.slice(0, 10)).toBe('2026-09-08')
    expect(rejected!.hand).toBe('right')
    expect(rejected!.medication_phase).toBe('pre')
    expect(rejected!.tracking_quality.valid_frame_ratio).toBe(0.63)
    expect(rejected!.tracking_quality.hand_visibility).toBe(0.68)
    expect(rejected!.tracking_quality.lighting).toBe('low')
    expect(rejected!.rejection_reason).toBe('INSUFFICIENT_TRACKING_QUALITY')
  })

  // TEST 10: Trend and aggregate exclusion
  it('TEST 10: excludes the rejected record from baseline and trend computations', () => {
    const rightPreRecords = DEMO_MEASUREMENTS.filter(
      (m) => m.hand === 'right' && m.medication_phase === 'pre'
    )
    expect(rightPreRecords.length).toBe(14)

    // Valid records for numerical computation
    const validRightPre = rightPreRecords.filter(
      (m) => m.quality_gate === 'PASS' && m.tap_frequency_hz !== null
    )
    expect(validRightPre.length).toBe(13)

    const avgFreq =
      validRightPre.reduce((sum, r) => sum + (r.tap_frequency_hz || 0), 0) / validRightPre.length
    expect(Number.isNaN(avgFreq)).toBe(false)
    expect(avgFreq).toBeGreaterThan(2.0)
    expect(avgFreq).toBeLessThan(3.5)
  })

  // TEST 11: ARCI interpretation safety & evidence
  it('TEST 11: produces evidence-based ARCI interpretation with demo restrictions', () => {
    // PASS record interpretation
    const samplePass = DEMO_MEASUREMENTS.find((m) => m.quality_gate === 'PASS' && m.hand === 'right')!
    const passInterpretation = generateDemoArciInterpretation(samplePass.id)
    expect(passInterpretation.status).toBe('QUALIFIED_INTERPRETATION')
    expect(passInterpretation.evidenceSupportedInterpretation?.citedEvidence?.length).toBeGreaterThanOrEqual(1)
    expect(passInterpretation.evidenceSupportedInterpretation?.citedEvidence?.[0].doi).toMatch(/^10\./)
    expect(passInterpretation.disclaimer).toContain('展示資料')
    expect(passInterpretation.disclaimer).toContain('不提供醫療診斷')

    // REJECTED record interpretation
    const rejected = DEMO_MEASUREMENTS.find((m) => m.quality_gate === 'REJECTED')!
    const rejInterpretation = generateDemoArciInterpretation(rejected.id)
    expect(rejInterpretation.status).toBe('DATA_QUALITY_INSUFFICIENT')
    expect(rejInterpretation.observedMeasurements?.dataQualityStatus).toBe('UNUSABLE')
    expect(rejInterpretation.summary).toContain('未通過品質門檻')
  })

  // TEST 12: Consultation summary breakdown
  it('TEST 12: computes consultation summary aggregates correctly without errors', () => {
    const total = DEMO_MEASUREMENTS.length
    const valid = DEMO_MEASUREMENTS.filter((m) => m.quality_gate === 'PASS').length
    const rejected = DEMO_MEASUREMENTS.filter((m) => m.quality_gate === 'REJECTED').length

    expect(total).toBe(56)
    expect(valid).toBe(55)
    expect(rejected).toBe(1)

    const rightValid = DEMO_MEASUREMENTS.filter(
      (m) => m.hand === 'right' && m.quality_gate === 'PASS' && m.tap_frequency_hz !== null
    )
    const leftValid = DEMO_MEASUREMENTS.filter(
      (m) => m.hand === 'left' && m.quality_gate === 'PASS' && m.tap_frequency_hz !== null
    )

    expect(rightValid.length).toBe(27) // 28 - 1 rejected
    expect(leftValid.length).toBe(28) // 28 - 0 rejected
  })

  // TEST 13: Data isolation & non-destructive toggle
  it('TEST 13: maintains strict client isolation without destroying real data', async () => {
    // 1. Initial state is OFF
    expect(demoService.isDemoMode()).toBe(false)
    expect(kbpdApi.getToken()).toBeNull()

    // 2. Enable Demo
    demoService.enableDemoMode()
    expect(demoService.isDemoMode()).toBe(true)
    expect(kbpdApi.getToken()).toBe('DEMO-001-TOKEN')
    expect(kbpdApi.getUserId()).toBe('DEMO-001')

    const demoRecords = await kbpdApi.listMeasurements()
    expect(demoRecords.items.length).toBe(56)

    // 3. Disable Demo
    demoService.disableDemoMode()
    expect(demoService.isDemoMode()).toBe(false)
    expect(kbpdApi.getToken()).toBeNull()
    const emptyRecords = await kbpdApi.listMeasurements()
    expect(emptyRecords.items.length).toBe(0)
  })

  // TEST 14: Refresh persistence via localStorage
  it('TEST 14: persists demo mode state in localStorage key', () => {
    demoService.enableDemoMode()
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe('true')
    expect(demoService.isDemoMode()).toBe(true)

    demoService.disableDemoMode()
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull()
    expect(demoService.isDemoMode()).toBe(false)
  })

  // TEST 15: Default OFF guarantee
  it('TEST 15: guarantees that Demo Mode defaults to OFF on fresh visits', () => {
    localStorage.removeItem(DEMO_STORAGE_KEY)
    expect(demoService.isDemoMode()).toBe(false)
  })
})
