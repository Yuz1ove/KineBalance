import type { MeasurementInput } from './contracts.ts'

// Engineering admission limits; not clinical reference ranges.
export function validateRawMeasurement(input: MeasurementInput): string | null {
  if (!input || !['LEFT', 'RIGHT', 'UNKNOWN'].includes(input.handSide) ||
      typeof input.protocolVersion !== 'string' || !input.protocolVersion || typeof input.mirrored !== 'boolean') return 'REQUIRED_FIELDS'
  if (['frequency', 'frequencyHz', 'metrics', 'analysis', 'score', 'interpretation'].some(k => k in input)) return 'DERIVED_FIELDS_NOT_ACCEPTED'
  if (!Array.isArray(input.frames) || input.frames.length < 2 || input.frames.length > 900) return 'FRAME_COUNT'
  let previous = -1
  for (const f of input.frames) {
    if (!Number.isFinite(f.timestampMs) || f.timestampMs < 0 || f.timestampMs <= previous || f.timestampMs > 30000) return 'TIMESTAMP'
    if (!Number.isInteger(f.frameIndex) || f.frameIndex < 0 || typeof f.tracked !== 'boolean') return 'FRAME_FIELDS'
    previous = f.timestampMs
    const confidence = (f as any).confidence
    if (confidence !== undefined && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) return 'CONFIDENCE'
    if (!Array.isArray(f.landmarks) || (f.tracked && f.landmarks.length !== 21)) return 'LANDMARK_COUNT'
    for (const lm of f.landmarks) {
      if (!['x','y','z'].every(k => Number.isFinite((lm as any)[k]) && Math.abs((lm as any)[k]) <= 2)) return 'LANDMARK_OUTLIER'
      if ([lm.visibility, lm.presence].some(v => v !== undefined && (!Number.isFinite(v) || v < 0 || v > 1))) return 'CONFIDENCE'
    }
  }
  return null
}
