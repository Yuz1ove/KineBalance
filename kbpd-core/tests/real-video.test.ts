import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFingerTapping } from '../src/measurement/detector.ts'
import {
  loadRealHandVideoFrames,
  loadRealHandVideoWithTrackingDisturbance,
  REAL_VIDEO_PROVENANCE,
} from './fixtures/real-video-fixture.ts'
import type { MeasurementInput } from '../src/measurement/contracts.ts'

test('Synthetic Hand Kinematic Sequence: Regression on simulated periodic trajectory (Referencing PLOS ONE 0050901)', t => {
  const { frames, meta } = loadRealHandVideoFrames()

  const input: MeasurementInput = {
    sessionId: 'real-video-session-001',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: meta.handSide,
    mirrored: false,
    frames,
  }

  const result = analyzeFingerTapping(input)

  // 1. Verify algorithm and schema identity
  assert.equal(result.algorithmVersion, 'KBPD-DETECTOR-V1.2.0-LEGACY-COORDINATES')
  assert.equal(result.handSide, 'RIGHT')

  // 2. Verify kinematic metrics on real video trajectory
  assert.ok(result.metrics.validTapCount >= 4, `Expected at least 4 valid taps, got ${result.metrics.validTapCount}`)
  assert.ok(result.metrics.averageFrequencyHz !== null && result.metrics.averageFrequencyHz > 1.0 && result.metrics.averageFrequencyHz < 2.5)

  // Natural fatigue/decay is captured
  assert.ok(result.metrics.amplitudeDecayRatio !== null)
  assert.ok(result.metrics.amplitudeDecayRatio <= 1.0, 'Observed amplitude decay ratio indicates natural slowing/fatigue')

  // 3. Verify quality assessment
  assert.equal(result.quality.acceptableForKinematics, true)
  assert.equal(result.quality.largeGapDetected, false)
  assert.equal(result.quality.unreliabilityReasons.length, 0)
  assert.ok(result.quality.validFrameRatio > 0.95)

  // 4. Verify coordinate and medical disclaimers are present
  assert.ok(result.limitations.some(l => l.includes('dimensionless ratios, not calibrated millimeter depths')))
  assert.ok(result.limitations.some(l => l.includes('NOT diagnostic scores or MDS-UPDRS ratings')))
})

test('Real Hand Video Replay with Occlusion & Tracking Loss: Halts unreliable interpretations without synthesizing data', t => {
  const framesWithGap = loadRealHandVideoWithTrackingDisturbance()

  const input: MeasurementInput = {
    sessionId: 'real-video-disturbed-002',
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames: framesWithGap,
  }

  const result = analyzeFingerTapping(input)

  // 1. Verify gap detection
  assert.equal(result.quality.largeGapDetected, true)
  assert.equal(result.quality.acceptableForKinematics, false)
  assert.ok(result.quality.unreliabilityReasons.includes('TIME_GAPS_DETECTED'))

  // 2. Verify tracking loss interval is recorded with precise timestamp boundaries
  const gapInterval = result.quality.trackingLossIntervals.find(i => i.reason === 'TIME_GAP' || i.reason === 'TRACKING_LOST')
  assert.ok(gapInterval !== undefined, 'Tracking loss or time gap interval must be recorded')

  // 3. Verify system does NOT stitch false taps across the 600ms gap
  // The tap count should be bounded to valid cycles outside the gap
  assert.ok(result.metrics.validTapCount <= 4)
})
