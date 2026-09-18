import { describe, expect, it } from 'vitest'
import type { MedicationEvent, MotionInput, MotionSession } from './contracts'
import {
  computeMotion, deriveMedicationStatus, isOffsetTimestamp, selectReferenceSet,
  validateMedicationEvents, validateMotionInput
} from './domain'

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`
function sample(times = [0, 100, 300, 600], id = 1): MotionInput {
  return {
    schemaVersion: 'KBPD-MOTION-1', sessionId: uuid(id), subjectId: 'synthetic-demo',
    origin: 'SYNTHETIC', clinicalUse: false, hand: 'BOTH', device: 'browser-input-v1',
    modality: 'SYNTHETIC', protocolVersion: 'alternating-two-hand/demo6/v1',
    startedAt: '2026-09-20T10:00:00+08:00', endedAt: '2026-09-20T10:00:06+08:00', elapsedMs: 6000, expectedDurationMs: 6000,
    status: 'COMPLETED', rawEvents: times.map((time, index) => ({
      eventId: `tap-${index}`, relativeTimeMs: time, side: index % 2 === 0 ? 'left' : 'right', modality: 'SYNTHETIC'
    }))
  }
}
const session = (input: MotionInput): MotionSession => ({ ...input, rawInputHash: 'a'.repeat(64) })
function history(count = 5): MotionSession[] {
  return Array.from({ length: count }, (_, index) => session({ ...sample(undefined, index + 2), startedAt: `2026-09-${String(index + 1).padStart(2, '0')}T10:00:00+08:00`, endedAt: `2026-09-${String(index + 1).padStart(2, '0')}T10:00:06+08:00` }))
}

describe('bounded motion input contract', () => {
  it('copies validated input without altering raw ordering or quality errors', () => {
    const source = sample([300, -1, 100, 100])
    const result = validateMotionInput(source)
    expect(result).toEqual(source)
    expect(result).not.toBe(source)
    expect(result.rawEvents[0]).not.toBe(source.rawEvents[0])
  })
  it.each([NaN, Infinity, -Infinity, '100', null])('rejects non-numeric or nonfinite event time %s', value => {
    const source = sample()
    expect(() => validateMotionInput({ ...source, rawEvents: [{ ...source.rawEvents[0], relativeTimeMs: value }] })).toThrow('EVENT_TIME_MS_INVALID')
  })
  it.each([
    ['clinicalUse', true], ['sessionId', 'not-a-uuid'], ['subjectId', 'patient@example.com'],
    ['elapsedMs', Infinity], ['expectedDurationMs', 0], ['elapsedMs', 3600001],
    ['schemaVersion', 'next'], ['origin', 'PATIENT'], ['hand', 'unknown'],
    ['modality', 'CAMERA'], ['device', 'device\nsecret']
  ])('rejects invalid %s', (key, value) => expect(() => validateMotionInput({ ...sample(), [key]: value })).toThrow())
  it('rejects missing and injected fields and bounds event count', () => {
    const { rawEvents, ...missing } = sample()
    expect(() => validateMotionInput(missing)).toThrow('MOTION_FIELDS_INVALID')
    expect(() => validateMotionInput({ ...sample(), rawInputHash: 'forged' })).toThrow('MOTION_FIELDS_INVALID')
    expect(() => validateMotionInput({ ...sample(), rawEvents: [{ ...rawEvents[0], extra: 1 }] })).toThrow('EVENT_FIELDS_INVALID')
    expect(() => validateMotionInput({ ...sample(), rawEvents: Array(10001).fill(rawEvents[0]) })).toThrow('RAW_EVENTS_BOUNDS_INVALID')
  })
  it.each(['2026-09-01T10:00:00', '2026-02-30T10:00:00Z', '2026-04-31T10:00:00Z', '2026-09-01T24:00:00Z', '2026-09-01T10:00:00+14:01', '2026-09-01T10:00:00-00:00'])('rejects invalid or unknown-offset timestamp %s', startedAt => {
    expect(isOffsetTimestamp(startedAt)).toBe(false)
    expect(() => validateMotionInput({ ...sample(), startedAt })).toThrow('STARTED_AT_OFFSET_TIMESTAMP_REQUIRED')
  })
  it('accepts valid leap day, explicit UTC and timezone offsets without replacing them', () => {
    for (const startedAt of ['2024-02-29T10:00:00Z', '2026-09-01T10:00:00.123+08:00', '2026-09-01T10:00:00-07:00']) {
      expect(validateMotionInput({ ...sample(), startedAt }).startedAt).toBe(startedAt)
    }
  })
  it('does not assign an input modality or numbers to a no-attempt developer test', () => {
    const input = validateMotionInput({ ...sample([]), origin: 'DEVELOPER_CAPTURE', subjectId: `dev-${uuid(90)}`, modality: 'UNKNOWN', protocolVersion: 'alternating-two-hand/standard20/v1', elapsedMs: 20000, expectedDurationMs: 20000, endedAt: '2026-09-20T10:00:20+08:00' })
    const result = computeMotion(input)
    expect(result.dataQuality.status).toBe('INSUFFICIENT')
    expect(Object.values(result.observations).every(metric => metric.value === null)).toBe(true)
    expect(() => validateMotionInput({ ...input, rawEvents: [{ eventId: 'fake', relativeTimeMs: 1, side: 'left', modality: 'UNKNOWN' }] })).toThrow('EVENT_MODALITY_INVALID')
  })
})

describe('native formula reuse with independent arithmetic', () => {
  it('calculates handwritten interval [100,200,300] results; optional decay remains missing', () => {
    const result = computeMotion(sample())
    // Count4 / 6seconds =0.666..., populationSD81.649658 / mean200 *100=40.824829.
    expect(result.observations.validEventCount.value).toBe(4)
    expect(result.observations.rate.value).toBe(0.7)
    expect(result.observations.intervalVariability.value).toBe(40.8)
    expect(result.observations.speedDecay.value).toBeNull()
    expect(result.observations.speedDecay.minimumEvents).toBe(7)
    expect(result.observations.speedDecay.reasonCode).toBe('INSUFFICIENT_EVENTS')
    expect(result.dataQuality.status).toBe('QUALIFIED')
  })
  it('computes speed decay from six intervals with independent half means 200 and 500ms', () => {
    const result = computeMotion(sample([0, 100, 300, 600, 1000, 1500, 2100]))
    expect(result.observations.validEventCount.value).toBe(7)
    expect(result.observations.rate.value).toBe(1.2)
    expect(result.observations.intervalVariability.value).toBe(48.8)
    expect(result.observations.speedDecay.value).toBe(150)
    expect(result.dataQuality.status).toBe('QUALIFIED')
  })
  it('responds to raw-event perturbation and does not return a fixed demo score', () => {
    const original = computeMotion(sample())
    const changed = computeMotion(sample([0, 100, 300, 800]))
    expect(original.observations.intervalVariability.value).toBe(40.8)
    expect(changed.observations.intervalVariability.value).toBe(63.7)
  })
  it.each([{ times: [] }, { times: [0] }, { times: [0, 100] }])('returns insufficiency for too few valid events $times', ({ times }) => {
    const result = computeMotion(sample(times))
    expect(result.dataQuality.status).toBe('INSUFFICIENT')
    expect(result.observations.intervalVariability.value).toBeNull()
    expect(result.observations.intervalVariability.reasonCode).toBe('INSUFFICIENT_EVENTS')
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
  })
  it('stores zero only when measured; constant intervals have zero variation and decay', () => {
    const result = computeMotion(sample([0, 100, 200, 300, 400, 500, 600]))
    expect(result.observations.intervalVariability.value).toBe(0)
    expect(result.observations.speedDecay.value).toBe(0)
    expect(result.observations.speedDecay.reasonCode).toBeNull()
    expect(computeMotion(sample([])).observations.validEventCount.value).toBeNull()
  })
})

describe('quality receipts preserve raw observations', () => {
  it.each([
    ['negative', [-1, 100, 300, 600], 'NEGATIVE_EVENT_TIME'],
    ['unsorted', [0, 300, 100, 600], 'UNSORTED_EVENT_TIME'],
    ['duplicate time', [0, 100, 100, 600], 'DUPLICATE_EVENT_TIME'],
    ['outside elapsed', [0, 100, 300, 6001], 'EVENT_OUTSIDE_ELAPSED_TIME']
  ] as const)('flags %s and retains the exact raw input', (_name, times, issue) => {
    const input = sample([...times])
    const before = JSON.stringify(input)
    const result = computeMotion(input)
    expect(result.dataQuality.status).toBe('INVALID')
    expect(result.dataQuality.issues).toContain(issue)
    expect(result.dataQuality.cleaningLog.some(line => line.includes(issue))).toBe(true)
    expect(JSON.stringify(input)).toBe(before)
    expect(selectReferenceSet(session(input), history()).comparison.status).toBe('NOT_AVAILABLE')
  })
  it('rejects duplicate event IDs while retaining raw rows', () => {
    const input = sample()
    input.rawEvents[2].eventId = input.rawEvents[0].eventId
    expect(computeMotion(input).dataQuality.issues).toContain('DUPLICATE_EVENT_ID')
    expect(input.rawEvents).toHaveLength(4)
  })
  it.each([
    [{ status: 'INTERRUPTED' }, 'TEST_INTERRUPTED'],
    [{ elapsedMs: 3000 }, 'TEST_DURATION_INCOMPLETE'],
    [{ elapsedMs: -1 }, 'INVALID_ELAPSED_TIME'],
    [{ hand: 'LEFT' }, 'HAND_PROTOCOL_MISMATCH'],
    [{ hand: 'RIGHT' }, 'HAND_PROTOCOL_MISMATCH'],
    [{ protocolVersion: 'unknown-protocol' }, 'UNSUPPORTED_PROTOCOL'],
    [{ expectedDurationMs: 20000 }, 'PROTOCOL_DURATION_MISMATCH'],
    [{ modality: 'MIXED' }, 'MIXED_INPUT_MODALITIES']
  ])('prevents comparison for incompatible/incomplete input %j', (change, reason) => {
    const input = { ...sample(), ...change } as MotionInput
    const result = computeMotion(input)
    expect(result.dataQuality.status).toBe('INVALID')
    expect(result.dataQuality.issues).toContain(reason)
    expect(selectReferenceSet(session(input), history()).comparison.status).toBe('NOT_AVAILABLE')
  })
  it('replays native starting-left alternation and the unrounded 20% rejection rule', () => {
    const input = sample(Array.from({ length: 501 }, (_, index) => index * 10))
    let accepted = 0
    input.rawEvents = input.rawEvents.map((event, index) => {
      const expected = accepted % 2 === 0 ? 'left' : 'right'
      if (index < 100) return { ...event, side: expected === 'left' ? 'right' : 'left' }
      accepted += 1
      return { ...event, side: expected }
    })
    // 100 rejected / 501 attempts=19.96008%; native rounds display to20.0 but does not invalidate.
    expect(computeMotion(input).dataQuality.status).toBe('QUALIFIED')
    expect(computeMotion(input).observations.validEventCount.value).toBe(401)
    const wrongStart = sample()
    wrongStart.rawEvents[0].side = 'right'
    const result = computeMotion(wrongStart)
    expect(result.dataQuality.issues).toContain('ALTERNATION_ERROR_RATE_TOO_HIGH')
    expect(result.dataQuality.validEventIds).not.toContain('tap-0')
  })
})

describe('personal prior-session descriptive comparison', () => {
  it('uses five prior compatible sessions and arithmetic deltas only', () => {
    const target = session(sample([0, 200, 400, 600]))
    const { referenceSet, comparison } = selectReferenceSet(target, history())
    expect(referenceSet.includedSessionIds).toHaveLength(5)
    expect(referenceSet.clinicalValidation).toBe('NOT_CLINICALLY_VALIDATED')
    expect(referenceSet.minimumSessions).toBe(5)
    expect(comparison.status).toBe('AVAILABLE')
    expect(comparison.interpretation).toBe('DESCRIPTIVE_ONLY')
    expect(comparison.metrics.intervalVariability).toEqual({ currentValue: 0, referenceMean: 40.8, delta: -40.8, unit: '%' })
    expect(comparison.metrics.speedDecay).toBeUndefined()
    expect(comparison.reasonCodes).toContain('OPTIONAL_SPEED_DECAY_UNAVAILABLE')
    expect(referenceSet.inputs.every(item => item.rawInputHash === 'a'.repeat(64))).toBe(true)
  })
  it('refuses four sessions and allows a stricter engineering minimum', () => {
    expect(selectReferenceSet(session(sample()), history(4)).comparison.reasonCodes).toContain('INSUFFICIENT_COMPATIBLE_PRIOR_SESSIONS')
    expect(selectReferenceSet(session(sample()), history(5), 6).comparison.status).toBe('NOT_AVAILABLE')
    for (const minimum of [0, 4, 5.5, Infinity, 1001]) expect(() => selectReferenceSet(session(sample()), history(), minimum)).toThrow('REFERENCE_MINIMUM_INVALID')
  })
  it.each([
    [{ subjectId: 'synthetic-other' }, 'SUBJECT_MISMATCH'],
    [{ origin: 'DEVELOPER_CAPTURE' }, 'ORIGIN_MISMATCH'],
    [{ hand: 'LEFT' }, 'HAND_MISMATCH'],
    [{ device: 'another-device' }, 'DEVICE_MISMATCH'],
    [{ modality: 'POINTER' }, 'MODALITY_MISMATCH'],
    [{ protocolVersion: 'another-protocol' }, 'PROTOCOL_MISMATCH'],
    [{ status: 'INTERRUPTED' }, 'REFERENCE_INTERRUPTED'],
    [{ rawEvents: [] }, 'REFERENCE_DATA_QUALITY_NOT_QUALIFIED'],
    [{ startedAt: '2026-09-21T00:00:00Z' }, 'NOT_PREVIOUSLY_COMPLETED']
  ])('excludes incompatible history %j with explicit reasons', (change, reason) => {
    const candidates = history()
    candidates[0] = { ...candidates[0], ...change } as MotionSession
    const result = selectReferenceSet(session(sample()), candidates)
    expect(result.referenceSet.includedSessionIds).toHaveLength(4)
    expect(result.referenceSet.excludedSessions[0].reasonCodes).toContain(reason)
    expect(result.comparison.status).toBe('NOT_AVAILABLE')
  })
  it('excludes the current session, concurrent completion and all duplicate IDs', () => {
    const target = session(sample())
    const candidates = history()
    const result = selectReferenceSet(target, [...candidates, candidates[0], target, { ...sample(undefined, 80), rawInputHash: 'b'.repeat(64), startedAt: '2026-09-20T09:59:59+08:00' }])
    expect(result.referenceSet.includedSessionIds).toHaveLength(4)
    expect(result.referenceSet.excludedSessions.find(item => item.sessionId === candidates[0].sessionId)?.reasonCodes).toContain('DUPLICATE_SESSION_ID')
    expect(result.referenceSet.excludedSessions.find(item => item.sessionId === target.sessionId)?.reasonCodes).toContain('CURRENT_SESSION_EXCLUDED')
    expect(result.referenceSet.excludedSessions.find(item => item.sessionId === uuid(80))?.reasonCodes).toContain('NOT_PREVIOUSLY_COMPLETED')
    expect(new Set(result.referenceSet.excludedSessions.map(item => item.sessionId)).size).toBe(result.referenceSet.excludedSessions.length)
  })
  it('compares wall-clock instants with their own offsets', () => {
    const target = session({ ...sample(), startedAt: '2026-09-20T10:00:00+08:00' })
    const candidates = history()
    candidates[0].startedAt = '2026-09-20T02:00:00Z'
    expect(selectReferenceSet(target, candidates).referenceSet.excludedSessions[0].reasonCodes).toContain('NOT_PREVIOUSLY_COMPLETED')
  })
  it('uses actual wall completion when the active test clock was paused', () => {
    const target = session(sample())
    const candidates = history()
    candidates[0] = { ...candidates[0], startedAt: '2026-09-20T09:59:00+08:00', endedAt: '2026-09-20T10:00:01+08:00' }
    // Active6000ms would falsely suggest completion09:59:06; the actual end is after target start.
    expect(computeMotion(candidates[0]).dataQuality.status).toBe('QUALIFIED')
    expect(selectReferenceSet(target, candidates).referenceSet.excludedSessions[0].reasonCodes).toContain('NOT_PREVIOUSLY_COMPLETED')
    candidates[0].endedAt = target.startedAt
    expect(selectReferenceSet(target, candidates).comparison.status).toBe('AVAILABLE')
  })
  it('rejects a wall finish before start and disqualifies impossible active duration', () => {
    expect(() => validateMotionInput({ ...sample(), endedAt: '2026-09-20T09:59:59+08:00' })).toThrow('ENDED_AT_BEFORE_STARTED_AT')
    expect(() => validateMotionInput({ ...sample(), endedAt: '2026-09-20T10:00:06' })).toThrow('ENDED_AT_OFFSET_TIMESTAMP_REQUIRED')
    const invalid = { ...sample(), endedAt: '2026-09-20T10:00:01+08:00' }
    expect(computeMotion(invalid).dataQuality.issues).toContain('WALL_DURATION_SHORTER_THAN_ACTIVE_TIME')
    expect(selectReferenceSet(session(invalid), history()).comparison.status).toBe('NOT_AVAILABLE')
  })
  it('never fills developer history with synthetic samples', () => {
    const target = session({ ...sample(), origin: 'DEVELOPER_CAPTURE', subjectId: `dev-${uuid(90)}`, modality: 'KEYBOARD', protocolVersion: 'alternating-two-hand/standard20/v1', expectedDurationMs: 20000, elapsedMs: 20000, endedAt: '2026-09-20T10:00:20+08:00', rawEvents: sample().rawEvents.map(event => ({ ...event, modality: 'KEYBOARD' })) })
    const result = selectReferenceSet(target, history())
    expect(result.referenceSet.includedSessionIds).toEqual([])
    expect(result.comparison.status).toBe('NOT_AVAILABLE')
  })
})

describe('medication event semantics', () => {
  const event = (eventType: MedicationEvent['eventType'], eventId = eventType): MedicationEvent => ({ eventId, eventType, occurredAt: '2026-09-20T08:00:00+08:00', recordedAt: '2026-09-20T08:01:00+08:00', source: 'local-developer-input', origin: 'DEVELOPER_CAPTURE' })
  it('never infers taken medication from schedule, dispensing or cup removal', () => {
    const events = validateMedicationEvents([event('SCHEDULED'), event('DISPENSED'), event('CUP_REMOVED')])
    expect(events.map(item => item.eventType)).toEqual(['SCHEDULED', 'DISPENSED', 'CUP_REMOVED'])
    expect(deriveMedicationStatus(events, 'DEVELOPER_CAPTURE')).toEqual({ taken: 'UNKNOWN', occurredAt: null })
  })
  it('records self report without granting causal, dosage or clinical fields', () => {
    expect(deriveMedicationStatus([event('SELF_REPORTED_TAKEN')], 'DEVELOPER_CAPTURE')).toEqual({ taken: 'SELF_REPORTED', occurredAt: '2026-09-20T08:00:00+08:00' })
    expect(deriveMedicationStatus([event('SELF_REPORTED_TAKEN')], 'SYNTHETIC')).toEqual({ taken: 'UNKNOWN', occurredAt: null })
    expect(() => validateMedicationEvents([{ ...event('SELF_REPORTED_TAKEN'), dose: 4 }])).toThrow('MEDICATION_EVENT_FIELDS_INVALID')
  })
  it('rejects duplicate IDs, timezone omission and reports recorded before occurrence', () => {
    expect(() => validateMedicationEvents([event('DISPENSED'), event('DISPENSED')])).toThrow('DUPLICATE_MEDICATION_EVENT_ID')
    expect(() => validateMedicationEvents([{ ...event('DISPENSED'), occurredAt: '2026-09-20T08:00:00' }])).toThrow('MEDICATION_OFFSET_TIMESTAMP_REQUIRED')
    expect(() => validateMedicationEvents([{ ...event('SELF_REPORTED_TAKEN'), recordedAt: '2026-09-20T07:00:00+08:00' }])).toThrow('MEDICATION_OCCURRENCE_AFTER_RECORDING')
  })
})
