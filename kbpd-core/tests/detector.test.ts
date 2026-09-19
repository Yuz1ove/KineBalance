import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFingerTapping } from '../src/measurement/detector.ts'
import type { LandmarkFrame, MeasurementInput, NormalizedLandmark } from '../src/measurement/contracts.ts'

function createSyntheticFrame(
  frameIndex: number,
  timestampMs: number,
  distanceFactor: number,
  tracked = true,
  scale = 0.2
): LandmarkFrame {
  if (!tracked) {
    return {
      frameIndex,
      timestampMs,
      tracked: false,
      landmarks: [],
    }
  }

  // Wrist at (0.5, 0.8, 0)
  // Middle MCP at (0.5, 0.8 - scale, 0) -> Palm length is exactly `scale`
  const wrist: NormalizedLandmark = { x: 0.5, y: 0.8, z: 0 }
  const middleMcp: NormalizedLandmark = { x: 0.5, y: 0.8 - scale, z: 0 }

  // Thumb tip at (0.45, 0.5, 0)
  // Index tip at (0.45 + distanceFactor * scale, 0.5, 0)
  // Euclidean distance = distanceFactor * scale
  // Normalized distance = distanceFactor
  const thumbTip: NormalizedLandmark = { x: 0.45, y: 0.5, z: 0 }
  const indexTip: NormalizedLandmark = { x: 0.45 + distanceFactor * scale, y: 0.5, z: 0 }

  const landmarks: NormalizedLandmark[] = new Array(21).fill(null).map((_, i) => {
    if (i === 0) return wrist
    if (i === 9) return middleMcp
    if (i === 4) return thumbTip
    if (i === 8) return indexTip
    return { x: 0.5, y: 0.5, z: 0 }
  })

  return {
    frameIndex,
    timestampMs,
    tracked: true,
    landmarks,
  }
}

test('Measurement Core: Clean periodic tapping (8 cycles)', () => {
  const fps = 30
  const dt = 1000 / fps
  const numCycles = 8
  const cycleDurationMs = 300 // ~3.33 Hz
  const totalFrames = Math.floor((numCycles * cycleDurationMs) / dt)

  const frames: LandmarkFrame[] = []
  for (let i = 0; i < totalFrames; i++) {
    const t = i * dt
    const phase = (2 * Math.PI * t) / cycleDurationMs
    // distance oscillates between 0.1 and 0.7 palm scale
    const distanceFactor = 0.4 + 0.3 * Math.sin(phase)
    frames.push(createSyntheticFrame(i, Math.round(t), distanceFactor, true, 0.25))
  }

  const input: MeasurementInput = {
    sessionId: '00000000-0000-4000-8000-000000000001',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames,
  }

  const result = analyzeFingerTapping(input)

  assert.equal(result.sessionId, input.sessionId)
  assert.equal(result.handSide, 'RIGHT')
  assert.ok(result.metrics.validTapCount >= 7 && result.metrics.validTapCount <= 9, `Expected ~8 taps, got ${result.metrics.validTapCount}`)
  assert.ok(result.metrics.averageFrequencyHz !== null && result.metrics.averageFrequencyHz >= 3.0 && result.metrics.averageFrequencyHz <= 3.6)
  assert.ok(result.metrics.intervalVariabilityCv !== null && result.metrics.intervalVariabilityCv < 0.15, 'Periodic signal should have low CV')
  assert.equal(result.quality.acceptableForKinematics, true)
  assert.equal(result.quality.largeGapDetected, false)
})

test('Measurement Core: Insufficient samples (<3 taps) returns null metrics', () => {
  const frames: LandmarkFrame[] = []
  // Only 1 cycle (30 frames at 30fps = 1000ms)
  for (let i = 0; i < 30; i++) {
    const t = i * 33.3
    const phase = (2 * Math.PI * t) / 1000
    const distanceFactor = 0.4 + 0.3 * Math.sin(phase)
    frames.push(createSyntheticFrame(i, Math.round(t), distanceFactor))
  }

  const input: MeasurementInput = {
    sessionId: '00000000-0000-4000-8000-000000000002',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'LEFT',
    mirrored: false,
    frames,
  }

  const result = analyzeFingerTapping(input)

  assert.ok(result.metrics.validTapCount < 3)
  assert.equal(result.metrics.averageFrequencyHz, null)
  assert.equal(result.metrics.intervalVariabilityCv, null)
  assert.equal(result.metrics.amplitudeDecayRatio, null)
  assert.ok(result.metrics.calculationNotes.some(n => n.includes('INSUFFICIENT_CYCLES')))
  // Acquisition quality is independent of a participant producing fewer than three cycles.
  assert.equal(result.quality.acceptableForKinematics, true)
})

test('Measurement Core: Missing frames and time gaps are NOT bridged as cycles', () => {
  const frames: LandmarkFrame[] = []
  let frameIndex = 0

  // First burst: 3 cycles (1000ms)
  for (let t = 0; t <= 1000; t += 33.3) {
    const phase = (2 * Math.PI * t) / 333
    const distanceFactor = 0.4 + 0.3 * Math.sin(phase)
    frames.push(createSyntheticFrame(frameIndex++, Math.round(t), distanceFactor))
  }

  // BIG TIME GAP: jump from 1000ms to 2500ms (1500ms gap)
  for (let t = 2500; t <= 3500; t += 33.3) {
    const phase = (2 * Math.PI * (t - 2500)) / 333
    const distanceFactor = 0.4 + 0.3 * Math.sin(phase)
    frames.push(createSyntheticFrame(frameIndex++, Math.round(t), distanceFactor))
  }

  const input: MeasurementInput = {
    sessionId: '00000000-0000-4000-8000-000000000003',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames,
  }

  const result = analyzeFingerTapping(input)

  assert.equal(result.quality.largeGapDetected, true)
  assert.ok(result.quality.trackingLossIntervals.some(loss => loss.reason === 'TIME_GAP' && loss.durationMs >= 1400))
  // Cycles should NOT have duration > 1500ms because large gap resets cycle detector
  for (const interval of result.metrics.intervalSequenceMs) {
    assert.ok(interval < 1000, `Found bridged cycle with interval ${interval}ms`)
  }
})

test('Measurement Core: Untracked frames (hand out of view) handled correctly', () => {
  const frames: LandmarkFrame[] = []
  for (let i = 0; i < 60; i++) {
    const tracked = i < 20 || i > 40
    frames.push(createSyntheticFrame(i, i * 33, 0.5, tracked))
  }

  const input: MeasurementInput = {
    sessionId: '00000000-0000-4000-8000-000000000004',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames,
  }

  const result = analyzeFingerTapping(input)
  assert.ok(result.quality.validFrameRatio < 0.7)
  assert.ok(result.quality.trackingLossIntervals.some(i => i.reason === 'TRACKING_LOST'))
})

test('Measurement Core: Scale invariance (small vs large hand image)', () => {
  const framesSmall: LandmarkFrame[] = []
  const framesLarge: LandmarkFrame[] = []

  for (let i = 0; i < 60; i++) {
    const t = i * 33.3
    const phase = (2 * Math.PI * t) / 300
    const normDist = 0.4 + 0.25 * Math.sin(phase)

    // Hand scale 0.15 vs 0.35 (simulating distance from camera)
    framesSmall.push(createSyntheticFrame(i, Math.round(t), normDist, true, 0.15))
    framesLarge.push(createSyntheticFrame(i, Math.round(t), normDist, true, 0.35))
  }

  const resSmall = analyzeFingerTapping({
    sessionId: '00000000-0000-4000-8000-000000000005',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames: framesSmall,
  })

  const resLarge = analyzeFingerTapping({
    sessionId: '00000000-0000-4000-8000-000000000006',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames: framesLarge,
  })

  assert.equal(resSmall.metrics.validTapCount, resLarge.metrics.validTapCount)
  assert.equal(resSmall.metrics.averageAmplitudeNorm, resLarge.metrics.averageAmplitudeNorm)
})
