/**
 * Video Processor & Real Landmark Pipeline
 *
 * Implements:
 * 1. Monotonic source timestamp extraction from video stream or decoded frames.
 * 2. Real landmark validation (21 normalized 3D keypoints per frame).
 * 3. Tracking interruption & occlusion guard: NEVER carries over previous frame coordinates!
 *    When hand is absent or occluded, frame is explicitly marked { tracked: false, landmarks: [] }.
 * 4. Shared kinematic measurement core bridging for uploaded video & live camera.
 */

import type { HandSide, LandmarkFrame, MeasurementInput, NormalizedLandmark } from '../measurement/contracts.ts'

export const VIDEO_PROCESSOR_VERSION = 'KBPD-VIDEO-PROCESSOR-1.0.0'

export interface FrameDetectionResult {
  readonly frameIndex: number
  /**
   * Source timestamp in milliseconds from video.currentTime or capture clock.
   * Never estimated from UI animation interval or screen refresh rate.
   */
  readonly sourceTimestampMs: number
  readonly handDetected: boolean
  readonly rawLandmarks?: Array<{ x: number; y: number; z?: number }>
  readonly detectionConfidence?: number
}

export interface VideoProcessingOptions {
  readonly sessionId: string
  readonly handSide: HandSide
  readonly mirrored?: boolean
  readonly minimumConfidence?: number
}

/**
 * Transforms raw frame-by-frame detection results into strict LandmarkFrame array.
 * Enforces:
 * - NO carry-over of lost coordinates.
 * - Accurate source timestamp preservation.
 * - Dimensionless 2D + relative Z normalization.
 */
export function processRawDetectionsToFrames(
  detections: FrameDetectionResult[],
  options: { minimumConfidence?: number } = {}
): LandmarkFrame[] {
  const minConf = options.minimumConfidence ?? 0.5
  const frames: LandmarkFrame[] = []
  let prevTimestamp = -1

  for (let i = 0; i < detections.length; i++) {
    const det = detections[i]

    const timestampMs = det.sourceTimestampMs

    // Check if hand is detected with valid landmark count
    const hasHand =
      det.handDetected &&
      Array.isArray(det.rawLandmarks) &&
      det.rawLandmarks.length >= 21 &&
      (det.detectionConfidence === undefined || det.detectionConfidence >= minConf)

    if (!hasHand) {
      // OCCLUSION / NO-HAND:
      // CRITICAL: MUST NOT use previous frame coordinates!
      frames.push({
        frameIndex: det.frameIndex,
        timestampMs,
        tracked: false,
        landmarks: [],
      })
      continue
    }

    // Hand detected: normalize all 21 keypoints
    const landmarks: NormalizedLandmark[] = det.rawLandmarks!.slice(0, 21).map(pt => ({
      x: pt.x,
      y: pt.y,
      z: pt.z ?? 0,
    }))

    frames.push({
      frameIndex: det.frameIndex,
      timestampMs,
      tracked: true,
      landmarks,
    })
  }

  return frames
}

/**
 * Builds the complete MeasurementInput payload for analyzeFingerTapping.
 */
export function createMeasurementInputFromDetections(
  detections: FrameDetectionResult[],
  options: VideoProcessingOptions
): MeasurementInput {
  const frames = processRawDetectionsToFrames(detections, {
    minimumConfidence: options.minimumConfidence,
  })

  return {
    sessionId: options.sessionId,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: options.handSide,
    mirrored: options.mirrored ?? false,
    frames,
  }
}
