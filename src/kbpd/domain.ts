import { calculateTapMetrics } from '../lib/tapMetrics'
import type {
  Comparison, DataOrigin, DataQuality, MedicationEvent, MedicationStatus, MetricName, MotionComputation,
  MotionEvent, MotionInput, MotionSession, Observation, ReferenceSet
} from './contracts'

export const ALGORITHM_VERSION = 'KBPD-NATIVE-TAP-1'
export const POLICY_VERSION = 'KBPD-LOCAL-READ-1'
export const COMPARISON_RULE_VERSION = 'KBPD-REFERENCE-1'
export const SUPPORTED_PROTOCOLS: Readonly<Record<string, number>> = Object.freeze({
  'alternating-two-hand/demo6/v1': 6000,
  'alternating-two-hand/standard20/v1': 20000,
  'alternating-two-hand/standard20/workspace1': 20000
})
export const MAX_RAW_EVENTS = 10000
const MAX_TIME_MS = 3600000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MODALITIES = ['KEYBOARD', 'POINTER', 'SYNTHETIC', 'MIXED', 'UNKNOWN'] as const
const METRIC_NAMES: MetricName[] = ['validEventCount', 'rate', 'intervalVariability', 'speedDecay']

export class InputValidationError extends Error {
  constructor(public readonly reasonCode: string) { super(reasonCode); this.name = 'InputValidationError' }
}
function fail(reason: string): never { throw new InputValidationError(reason) }
function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`${label}_OBJECT_REQUIRED`)
  return value as Record<string, unknown>
}
function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value))) {
    fail(`${label}_FIELDS_INVALID`)
  }
}
function text(value: unknown, label: string, maximum = 100): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum || !/^[a-zA-Z0-9._:/-]+$/.test(value)) {
    fail(`${label}_INVALID`)
  }
}
function finite(value: unknown, label: string, minimum: number, maximum: number): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) fail(`${label}_INVALID`)
}
function enumeration(value: unknown, choices: readonly unknown[], label: string) {
  if (!choices.includes(value)) fail(`${label}_INVALID`)
}

/** A wall-clock instant must carry its own offset. Invalid calendar dates never roll over. */
export function isOffsetTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] || hour > 23 || minute > 59 || second > 59) return false
  const offset = match[7]
  if (offset !== 'Z') {
    const hours = Number(offset.slice(1, 3))
    const minutes = Number(offset.slice(4, 6))
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0) || offset === '-00:00') return false
  }
  return Number.isFinite(Date.parse(value))
}

/** Schema validation rejects malformed values. Quality errors remain in the returned raw events. */
export function validateMotionInput(value: unknown): MotionInput {
  const data = object(value, 'MOTION')
  exactKeys(data, ['schemaVersion', 'sessionId', 'subjectId', 'origin', 'clinicalUse', 'hand', 'device', 'modality', 'protocolVersion', 'startedAt', 'endedAt', 'elapsedMs', 'expectedDurationMs', 'status', 'rawEvents'], 'MOTION')
  if (data.schemaVersion !== 'KBPD-MOTION-1') fail('MOTION_SCHEMA_VERSION_INVALID')
  if (typeof data.sessionId !== 'string' || !UUID.test(data.sessionId)) fail('SESSION_ID_INVALID')
  enumeration(data.origin, ['SYNTHETIC', 'DEVELOPER_CAPTURE'], 'ORIGIN')
  if (typeof data.subjectId !== 'string' || (data.origin === 'DEVELOPER_CAPTURE'
    ? !data.subjectId.startsWith('dev-') || !UUID.test(data.subjectId.slice(4))
    : !/^synthetic-[a-zA-Z0-9-]{1,64}$/.test(data.subjectId))) fail('ANONYMOUS_SUBJECT_ID_REQUIRED')
  if (data.clinicalUse !== false) fail('CLINICAL_USE_FORBIDDEN')
  enumeration(data.hand, ['BOTH', 'LEFT', 'RIGHT'], 'HAND')
  text(data.device, 'DEVICE')
  enumeration(data.modality, MODALITIES, 'MODALITY')
  text(data.protocolVersion, 'PROTOCOL_VERSION')
  if (!isOffsetTimestamp(data.startedAt)) fail('STARTED_AT_OFFSET_TIMESTAMP_REQUIRED')
  if (!isOffsetTimestamp(data.endedAt)) fail('ENDED_AT_OFFSET_TIMESTAMP_REQUIRED')
  if (Date.parse(data.endedAt) < Date.parse(data.startedAt)) fail('ENDED_AT_BEFORE_STARTED_AT')
  finite(data.elapsedMs, 'ELAPSED_MS', -MAX_TIME_MS, MAX_TIME_MS)
  finite(data.expectedDurationMs, 'EXPECTED_DURATION_MS', 1, MAX_TIME_MS)
  enumeration(data.status, ['COMPLETED', 'INTERRUPTED'], 'STATUS')
  if (!Array.isArray(data.rawEvents) || data.rawEvents.length > MAX_RAW_EVENTS) fail('RAW_EVENTS_BOUNDS_INVALID')
  for (const value of data.rawEvents) {
    const event = object(value, 'EVENT')
    exactKeys(event, ['eventId', 'relativeTimeMs', 'side', 'modality'], 'EVENT')
    text(event.eventId, 'EVENT_ID', 80)
    finite(event.relativeTimeMs, 'EVENT_TIME_MS', -MAX_TIME_MS, MAX_TIME_MS)
    enumeration(event.side, ['left', 'right'], 'EVENT_SIDE')
    enumeration(event.modality, ['KEYBOARD', 'POINTER', 'SYNTHETIC'], 'EVENT_MODALITY')
  }
  // Copy, preserving event order and values; callers cannot mutate the submitted object through us.
  return { ...data, rawEvents: data.rawEvents.map(event => ({ ...event })) } as unknown as MotionInput
}

export function validateMedicationEvents(value: unknown): MedicationEvent[] {
  if (!Array.isArray(value) || value.length > 200) fail('MEDICATION_EVENTS_BOUNDS_INVALID')
  const seen = new Set<string>()
  return value.map(item => {
    const data = object(item, 'MEDICATION_EVENT')
    exactKeys(data, ['eventId', 'occurredAt', 'recordedAt', 'source', 'eventType', 'origin'], 'MEDICATION_EVENT')
    text(data.eventId, 'MEDICATION_EVENT_ID', 80)
    if (seen.has(data.eventId)) fail('DUPLICATE_MEDICATION_EVENT_ID')
    seen.add(data.eventId)
    if (!isOffsetTimestamp(data.occurredAt) || !isOffsetTimestamp(data.recordedAt)) fail('MEDICATION_OFFSET_TIMESTAMP_REQUIRED')
    text(data.source, 'MEDICATION_SOURCE', 80)
    enumeration(data.eventType, ['SCHEDULED', 'DISPENSED', 'CUP_REMOVED', 'SELF_REPORTED_TAKEN'], 'MEDICATION_EVENT_TYPE')
    enumeration(data.origin, ['SYNTHETIC', 'DEVELOPER_CAPTURE'], 'MEDICATION_ORIGIN')
    if (data.eventType !== 'SCHEDULED' && Date.parse(data.occurredAt) > Date.parse(data.recordedAt)) fail('MEDICATION_OCCURRENCE_AFTER_RECORDING')
    return { ...data } as unknown as MedicationEvent
  })
}

/** A device event is never evidence of ingestion. This status records self-report only. */
export function deriveMedicationStatus(events: MedicationEvent[], origin: DataOrigin): MedicationStatus {
  const reports = events.filter(event => event.origin === origin && event.eventType === 'SELF_REPORTED_TAKEN')
  const latest = reports.reduce<MedicationEvent | null>((result, event) => !result || Date.parse(event.occurredAt) > Date.parse(result.occurredAt) ? event : result, null)
  return latest ? { taken: 'SELF_REPORTED', occurredAt: latest.occurredAt } : { taken: 'UNKNOWN', occurredAt: null }
}

function observation(value: number | null, unit: Observation['unit'], formula: string, minimumEvents: number, reasonCode: string | null): Observation {
  return { value: value !== null && Number.isFinite(value) ? value : null, unit, formula, minimumEvents, reasonCode: value !== null && !Number.isFinite(value) ? 'NON_FINITE_RESULT_REJECTED' : reasonCode }
}

/** Replays the native two-hand protocol: start left, reject wrong-side attempts, never sort raw input. */
export function computeMotion(input: MotionInput): MotionComputation {
  const issues: string[] = []
  const fatal = new Set<string>()
  const cleaningLog: string[] = []
  const add = (reason: string, invalid = true) => { if (!issues.includes(reason)) issues.push(reason); if (invalid) fatal.add(reason) }
  const expected = Object.hasOwn(SUPPORTED_PROTOCOLS, input.protocolVersion) ? SUPPORTED_PROTOCOLS[input.protocolVersion] : undefined
  if (expected === undefined) add('UNSUPPORTED_PROTOCOL')
  else if (input.expectedDurationMs !== expected) add('PROTOCOL_DURATION_MISMATCH')
  if (input.hand !== 'BOTH') add('HAND_PROTOCOL_MISMATCH')
  if (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 0) add('INVALID_ELAPSED_TIME')
  if (!Number.isFinite(input.expectedDurationMs) || input.expectedDurationMs <= 0) add('INVALID_EXPECTED_DURATION')
  const wallDurationMs = Date.parse(input.endedAt) - Date.parse(input.startedAt)
  if (!Number.isFinite(wallDurationMs) || wallDurationMs < 0) add('INVALID_WALL_CLOCK_DURATION')
  else if (input.elapsedMs > wallDurationMs + 1) add('WALL_DURATION_SHORTER_THAN_ACTIVE_TIME')
  if (input.modality === 'MIXED') add('MIXED_INPUT_MODALITIES')
  if ((input.origin === 'SYNTHETIC') !== (input.modality === 'SYNTHETIC')) add('ORIGIN_MODALITY_MISMATCH')
  if (input.origin === 'SYNTHETIC' && input.protocolVersion !== 'alternating-two-hand/demo6/v1') add('ORIGIN_PROTOCOL_MISMATCH')
  if (input.origin === 'DEVELOPER_CAPTURE' && !['alternating-two-hand/standard20/v1', 'alternating-two-hand/standard20/workspace1'].includes(input.protocolVersion)) add('ORIGIN_PROTOCOL_MISMATCH')
  if (input.status === 'INTERRUPTED') add('TEST_INTERRUPTED')
  const seenIds = new Set<string>()
  const seenTimes = new Set<number>()
  const valid: MotionEvent[] = []
  let previousRawTime: number | null = null
  let expectedSide: MotionEvent['side'] = 'left'
  let invalidAlternations = 0
  for (const event of input.rawEvents) {
    const reasons: string[] = []
    if (!Number.isFinite(event.relativeTimeMs)) reasons.push('NON_FINITE_EVENT_TIME')
    else {
      if (event.relativeTimeMs < 0) reasons.push('NEGATIVE_EVENT_TIME')
      if (event.relativeTimeMs > input.elapsedMs) reasons.push('EVENT_OUTSIDE_ELAPSED_TIME')
      if (seenTimes.has(event.relativeTimeMs)) reasons.push('DUPLICATE_EVENT_TIME')
      if (previousRawTime !== null && event.relativeTimeMs < previousRawTime) reasons.push('UNSORTED_EVENT_TIME')
      previousRawTime = Math.max(previousRawTime ?? event.relativeTimeMs, event.relativeTimeMs)
      seenTimes.add(event.relativeTimeMs)
    }
    if (seenIds.has(event.eventId)) reasons.push('DUPLICATE_EVENT_ID')
    seenIds.add(event.eventId)
    if (event.modality !== input.modality || event.modality === 'MIXED' || event.modality === 'UNKNOWN') reasons.push('EVENT_MODALITY_MISMATCH')
    if (reasons.length) {
      reasons.forEach(reason => add(reason))
      cleaningLog.push(`EXCLUDED ${event.eventId}: ${reasons.join(',')}`)
      continue
    }
    if (event.side !== expectedSide) {
      invalidAlternations += 1
      add('WRONG_SIDE_ATTEMPT', false)
      cleaningLog.push(`EXCLUDED ${event.eventId}: WRONG_SIDE_ATTEMPT`)
      continue
    }
    valid.push(event)
    expectedSide = expectedSide === 'left' ? 'right' : 'left'
  }
  const intervals = valid.slice(1).map((event, index) => event.relativeTimeMs - valid[index].relativeTimeMs)
  const elapsedValid = Number.isFinite(input.elapsedMs) && input.elapsedMs > 0
  const safeElapsed = elapsedValid ? input.elapsedMs : 0
  const native = calculateTapMetrics(intervals, safeElapsed, invalidAlternations, {
    tapCount: valid.length,
    expectedDurationMs: Number.isFinite(input.expectedDurationMs) && input.expectedDurationMs > 0 ? input.expectedDurationMs : 0,
    interrupted: input.status === 'INTERRUPTED'
  })
  if (elapsedValid && input.elapsedMs / input.expectedDurationMs < 0.9) add('TEST_DURATION_INCOMPLETE')
  if (native.validity.reasons.includes('左右交替錯誤過多')) add('ALTERNATION_ERROR_RATE_TOO_HIGH')
  if (!valid.length) add('NO_VALID_EVENTS', false)
  if (!elapsedValid) add('NO_VALID_ELAPSED_TIME', false)
  if (valid.length < 3) add('INTERVAL_VARIABILITY_INSUFFICIENT_EVENTS', false)
  if (valid.length < 7) add('SPEED_DECAY_INSUFFICIENT_EVENTS', false)
  const observations = {
    validEventCount: observation(valid.length || null, 'events', 'Count accepted alternating left/right events, starting left, within active elapsed time.', 1, valid.length ? null : 'NO_VALID_EVENTS'),
    rate: observation(valid.length && elapsedValid ? native.rate : null, 'events/s', 'Accepted event count / (active elapsed milliseconds / 1000); native rounding to 1 decimal.', 1, !valid.length ? 'NO_VALID_EVENTS' : !elapsedValid ? 'NO_VALID_ELAPSED_TIME' : null),
    intervalVariability: observation(native.variability, '%', '100 × population SD(consecutive accepted intervals) / mean(intervals); native rounding to 1 decimal.', 3, valid.length < 3 ? 'INSUFFICIENT_EVENTS' : null),
    speedDecay: observation(native.fatigue, '%', '100 × (second-half mean interval − first-half mean interval) / first-half mean; split=floor(interval count/2), native rounding to 1 decimal.', 7, valid.length < 7 ? 'INSUFFICIENT_EVENTS' : null)
  }
  const dataQuality: DataQuality = {
    status: fatal.size ? 'INVALID' : METRIC_NAMES.filter(key => key !== 'speedDecay').some(key => observations[key].value === null) ? 'INSUFFICIENT' : 'QUALIFIED',
    issues,
    cleaningLog,
    validEventIds: valid.map(event => event.eventId)
  }
  return { observations, dataQuality }
}

/** The native 7–14 paired trend rule is inapplicable to unpaired sessions; this is an engineering minimum only. */
export function selectReferenceSet(target: MotionSession, candidates: MotionSession[], minimum = 5): { referenceSet: ReferenceSet; comparison: Comparison } {
  if (!Number.isInteger(minimum) || minimum < 5 || minimum > 1000) fail('REFERENCE_MINIMUM_INVALID')
  const targetResult = computeMotion(target)
  const targetStart = Date.parse(target.startedAt)
  const duplicateIds = new Set(candidates.filter((candidate, index) => candidates.findIndex(other => other.sessionId === candidate.sessionId) !== index).map(candidate => candidate.sessionId))
  const referenceSet: ReferenceSet = {
    subjectId: target.subjectId, origin: target.origin, source: 'LOCAL_ANALYSIS_STORE', hand: target.hand,
    device: target.device, modality: target.modality, protocolVersion: target.protocolVersion,
    comparisonRuleVersion: COMPARISON_RULE_VERSION, minimumSessions: minimum,
    includedSessionIds: [], excludedSessions: [], inputs: [], clinicalValidation: 'NOT_CLINICALLY_VALIDATED'
  }
  for (const candidate of candidates) {
    const reasons: string[] = []
    if (duplicateIds.has(candidate.sessionId)) reasons.push('DUPLICATE_SESSION_ID')
    if (candidate.sessionId === target.sessionId) reasons.push('CURRENT_SESSION_EXCLUDED')
    if (candidate.subjectId !== target.subjectId) reasons.push('SUBJECT_MISMATCH')
    if (candidate.origin !== target.origin) reasons.push('ORIGIN_MISMATCH')
    if (candidate.hand !== target.hand) reasons.push('HAND_MISMATCH')
    if (candidate.device !== target.device) reasons.push('DEVICE_MISMATCH')
    if (candidate.modality !== target.modality) reasons.push('MODALITY_MISMATCH')
    if (candidate.protocolVersion !== target.protocolVersion) reasons.push('PROTOCOL_MISMATCH')
    const candidateStart = Date.parse(candidate.startedAt)
    const candidateEnd = Date.parse(candidate.endedAt)
    if (!Number.isFinite(targetStart) || !Number.isFinite(candidateStart) || !Number.isFinite(candidateEnd) || candidateStart >= targetStart || candidateEnd > targetStart) reasons.push('NOT_PREVIOUSLY_COMPLETED')
    if (candidate.status !== 'COMPLETED') reasons.push('REFERENCE_INTERRUPTED')
    const result = computeMotion(candidate)
    if (result.dataQuality.status !== 'QUALIFIED') reasons.push('REFERENCE_DATA_QUALITY_NOT_QUALIFIED')
    if (reasons.length) {
      const existing = referenceSet.excludedSessions.find(item => item.sessionId === candidate.sessionId)
      if (existing) existing.reasonCodes = [...new Set([...existing.reasonCodes, ...reasons])]
      else referenceSet.excludedSessions.push({ sessionId: candidate.sessionId, reasonCodes: reasons })
    } else {
      referenceSet.includedSessionIds.push(candidate.sessionId)
      referenceSet.inputs.push({ sessionId: candidate.sessionId, rawInputHash: candidate.rawInputHash, observations: result.observations })
    }
  }
  const reasonCodes: string[] = []
  if (targetResult.dataQuality.status !== 'QUALIFIED') reasonCodes.push(`TARGET_DATA_QUALITY_${targetResult.dataQuality.status}`)
  if (referenceSet.inputs.length < minimum) reasonCodes.push('INSUFFICIENT_COMPATIBLE_PRIOR_SESSIONS')
  const comparison: Comparison = { status: reasonCodes.length ? 'NOT_AVAILABLE' : 'AVAILABLE', reasonCodes, referenceCount: referenceSet.inputs.length, metrics: {}, interpretation: 'DESCRIPTIVE_ONLY' }
  if (!reasonCodes.length) {
    for (const key of METRIC_NAMES) {
      if (targetResult.observations[key].value === null || referenceSet.inputs.some(input => input.observations[key].value === null)) {
        comparison.reasonCodes.push(`OPTIONAL_${key === 'speedDecay' ? 'SPEED_DECAY' : key}_UNAVAILABLE`)
        continue
      }
      const values = referenceSet.inputs.map(input => input.observations[key].value as number)
      const currentValue = targetResult.observations[key].value as number
      const referenceMean = values.reduce((sum, value) => sum + value, 0) / values.length
      comparison.metrics[key] = { currentValue, referenceMean, delta: currentValue - referenceMean, unit: targetResult.observations[key].unit }
    }
  }
  return { referenceSet, comparison }
}
