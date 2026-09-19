/**
 * Vision Pipeline & Landmark Validation for Hand Finger-Tapping.
 *
 * Explicit Coordinate System & Normalization:
 * - Coordinate System: 'MEDIAPIPE_NORMALIZED_2D_RELATIVE_Z'
 * - X: Normalized to [0.0, 1.0] by frame width (left to right).
 * - Y: Normalized to [0.0, 1.0] by frame height (top to bottom).
 * - Z: Relative depth to the wrist landmark (0), estimated roughly on the scale of X.
 *      CRITICAL: Model-estimated Z coordinates are dimensionless ratios, NOT calibrated physical millimeters.
 * - Palm Scale Normalization: Euclidean distance between Landmark 0 (Wrist) and Landmark 9 (Middle MCP).
 *      All movement amplitudes are normalized by palm scale to maintain scale invariance across varying camera distances.
 */

import type {
  HandSide,
  LandmarkFrame,
  MeasurementInput,
  NormalizedLandmark,
} from '../measurement/contracts.ts'

export const VISION_PIPELINE_VERSION = 'KBPD-VISION-V1.0.0'
export const COORDINATE_SYSTEM = 'MEDIAPIPE_NORMALIZED_2D_RELATIVE_Z'
export const MIN_FRAME_RATE_RECOMMENDED_FPS = 25
export const MAX_ACCEPTABLE_TIME_GAP_MS = 400

export interface VisionCaptureMetadata {
  readonly deviceLabel?: string
  readonly frameWidth: number
  readonly frameHeight: number
  readonly targetFps: number
  readonly durationMs: number
  readonly handSide: HandSide
  readonly mirrored: boolean
  readonly coordinateSystem: string
  readonly pipelineVersion: string
}

export interface RawFrameInput {
  readonly frameIndex: number
  readonly timestampMs: number
  readonly tracked: boolean
  readonly rawLandmarks?: Array<{ x: number; y: number; z?: number; visibility?: number }>
}

export function buildMeasurementInputFromRawFrames(
  sessionId: string,
  handSide: HandSide,
  metadata: VisionCaptureMetadata,
  rawFrames: RawFrameInput[]
): MeasurementInput {
  const frames: LandmarkFrame[] = []
  let previousTimestamp = -1

  for (let i = 0; i < rawFrames.length; i++) {
    const raw = rawFrames[i]

    const timestampMs = raw.timestampMs

    if (!raw.tracked || !raw.rawLandmarks || raw.rawLandmarks.length < 21) {
      frames.push({
        frameIndex: raw.frameIndex,
        timestampMs,
        tracked: false,
        landmarks: [],
      })
      continue
    }

    // Normalize coordinates strictly
    const landmarks: NormalizedLandmark[] = raw.rawLandmarks.slice(0, 21).map(pt => ({
      x: pt.x,
      y: pt.y,
      z: pt.z ?? 0,
      visibility: pt.visibility !== undefined ? pt.visibility : undefined,
    }))

    frames.push({
      frameIndex: raw.frameIndex,
      timestampMs,
      tracked: true,
      landmarks,
    })
  }

  return {
    sessionId,
    protocolVersion: 'KBPD-FT-1.0',
    handSide,
    mirrored: metadata.mirrored,
    frames: frames.map(f => ({...f, frameWidth: metadata.frameWidth, frameHeight: metadata.frameHeight})),
  }
}
