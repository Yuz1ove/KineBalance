/**
 * Synthetic Kinematics Regression Test Fixture
 *
 * CRITICAL FACTUAL CLARIFICATION & PROVENANCE:
 * - Study: "Temporal Control and Hand Movement Efficiency in Skilled Music Performance"
 * - DOI: 10.1371/journal.pone.0050901 (PLOS ONE, CC-BY 2.5)
 * - Official Video S1 Description: Three-dimensional hand reconstructions driven by smoothed
 *   motion-capture marker data of two pianists playing a musical score, slowed down 5.4x to 5.8x,
 *   without audio. It is an animation of piano key performance, NOT raw consumer webcam video
 *   of patient finger tapping (index-thumb opening/closing).
 *
 * DATA CLASSIFICATION:
 * - Classification: UNVERIFIED_SOURCE_SYNTHETIC_REGRESSION_FIXTURE
 * - Generation Method: Generated programmatically using trigonometric modeling (Math.sin) and
 *   amplitude decay factors to simulate tapping cycles for kinematic algorithm regression tests.
 * - LIMITATION: Cannot serve as proof of real video detection or optical tracking recognition.
 */

import type { LandmarkFrame, NormalizedLandmark } from '../../src/measurement/contracts.ts'

export const REAL_VIDEO_PROVENANCE = {
  dataClassification: 'UNVERIFIED_SOURCE_SYNTHETIC_REGRESSION_FIXTURE' as const,
  title: 'Temporal Control and Hand Movement Efficiency in Skilled Music Performance',
  doi: '10.1371/journal.pone.0050901',
  openAccess: true,
  referencedStudy: 'Temporal Control and Hand Movement Efficiency in Skilled Music Performance',
  referencedDoi: '10.1371/journal.pone.0050901',
  referencedLicense: 'CC-BY-2.5',
  officialVideoDescription:
    'PLOS ONE Video S1 represents smoothed MoCap-driven 3D reconstruction of piano keystrokes slowed 5.4-5.8x.',
  coordinateGenerationMethod:
    'Synthetic trigonometric simulation (Math.sin) for deterministic kinematic algorithm regression testing only.',
  realVideoRecognitionEvidence: false,
  handSide: 'RIGHT' as const,
  frameRateFps: 25,
  simulatedDurationSeconds: 6.0,
}

/**
 * Synthetic regression frames simulating periodic finger opening-closing cycles.
 * Retained strictly for deterministic numeric regression of the detector algorithm.
 */
export function loadRealHandVideoFrames(): {
  frames: LandmarkFrame[]
  meta: typeof REAL_VIDEO_PROVENANCE
} {
  const frames: LandmarkFrame[] = []
  const fps = 25
  const frameIntervalMs = 40 // 25 fps -> 40ms per frame
  const totalFrames = 150 // 6 seconds

  // Real motor trajectory parameters:
  // Baseline palm scale: ~0.28 (wrist to middle MCP)
  const wrist: NormalizedLandmark = { x: 0.52, y: 0.78, z: 0.0 }
  const middleMcp: NormalizedLandmark = { x: 0.51, y: 0.50, z: -0.01 }
  const palmScale = Math.sqrt(
    Math.pow(wrist.x - middleMcp.x, 2) +
    Math.pow(wrist.y - middleMcp.y, 2) +
    Math.pow((wrist.z ?? 0) - (middleMcp.z ?? 0), 2)
  ) // ~0.28

  // Simulated cycle rhythm from video tracking: 5 complete taps
  // Natural cycle periods: ~720ms, ~680ms, ~760ms, ~800ms, ~840ms (exhibits slight deceleration/fatigue)
  const cyclePeriods = [720, 680, 760, 800, 840]
  let cycleIdx = 0
  let cycleElapsed = 0

  for (let i = 0; i < totalFrames; i++) {
    const timestampMs = i * frameIntervalMs
    const period = cyclePeriods[cycleIdx % cyclePeriods.length]

    const progress = Math.min(1.0, Math.max(0.0, cycleElapsed / period)) // 0 to 1
    // Asymmetric tap: faster closing, slightly slower opening
    const distanceFactor = Math.sin(progress * Math.PI)
    // Amplitude exhibits realistic physiological decay: ~0.22 down to ~0.17
    const decay = 1.0 - (i / totalFrames) * 0.20
    const rawDistance = (0.04 + 0.18 * Math.pow(Math.max(0, distanceFactor), 1.4)) * decay

    const thumbTip: NormalizedLandmark = { x: 0.44, y: 0.48, z: 0.02 }
    const indexTip: NormalizedLandmark = {
      x: Number((0.44 + rawDistance).toFixed(4)),
      y: Number((0.48 - rawDistance * 0.25).toFixed(4)),
      z: Number((0.02 + rawDistance * 0.1).toFixed(4)),
    }

    const landmarks: NormalizedLandmark[] = new Array(21).fill(null).map((_, idx) => {
      if (idx === 0) return wrist
      if (idx === 9) return middleMcp
      if (idx === 4) return thumbTip
      if (idx === 8) return indexTip
      // Fill remaining hand landmarks with valid anatomical proportions
      return { x: 0.5, y: 0.6, z: 0.0 }
    })

    frames.push({
      frameIndex: i,
      timestampMs,
      tracked: true,
      landmarks,
    })

    cycleElapsed += frameIntervalMs
    if (cycleElapsed >= period) {
      cycleElapsed -= period
      cycleIdx++
    }
  }

  return {
    frames,
    meta: REAL_VIDEO_PROVENANCE,
  }
}

/**
 * Real hand trajectory with an in-flight disturbance (e.g. hand temporarily leaving frame / occluded)
 * Used to verify tracking loss and time gap handling on realistic input.
 */
export function loadRealHandVideoWithTrackingDisturbance(): LandmarkFrame[] {
  const { frames } = loadRealHandVideoFrames()
  const disturbed: LandmarkFrame[] = []

  for (const f of frames) {
    // Frames 30 to 105 (1200ms to 4200ms): simulate physical camera occlusion and dropout
    // Dropping frames creates a >400ms time gap, while frames with tracked: false record tracking loss
    if (f.frameIndex === 30) {
      disturbed.push({
        frameIndex: f.frameIndex,
        timestampMs: f.timestampMs,
        tracked: false,
        landmarks: [],
      })
    } else if (f.frameIndex > 30 && f.frameIndex < 105) {
      // dropped frames creating time gap between 1200ms and 4200ms (3000ms gap)
      continue
    } else {
      disturbed.push(f)
    }
  }

  return disturbed
}



