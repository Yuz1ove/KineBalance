/**
 * Measurement Core Contracts for Hand Finger-Tapping Analysis.
 * Strict, deterministic, UI-independent, and model-independent.
 */

export type HandSide = 'LEFT' | 'RIGHT' | 'UNKNOWN'

export interface NormalizedLandmark {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly visibility?: number
  readonly presence?: number
}

export interface LandmarkFrame {
  readonly frameIndex: number
  readonly timestampMs: number
  readonly frameWidth?: number
  readonly frameHeight?: number
  readonly sourceTimestampMs?: number
  readonly inferenceStartedAtMs?: number
  readonly inferenceCompletedAtMs?: number
  readonly renderAtMs?: number
  readonly handedness?: HandSide
  readonly handednessScore?: number
  readonly detectionConfidence?: number
  readonly tracked: boolean
  readonly landmarks: readonly NormalizedLandmark[]
}

export type MeasurementSource = 'CAMERA' | 'REAL_VIDEO' | 'SYNTHETIC_TEST_DATA' | 'UNKNOWN'
export interface EventDecision { timestampMs:number;distance:number;state:string;open:number;close:number;reason:string }

export interface MeasurementInput {
  readonly source?: MeasurementSource
  readonly sessionId: string
  readonly protocolVersion: string
  readonly handSide: HandSide
  readonly mirrored: boolean
  readonly displayMirrored?: boolean
  readonly frames: readonly LandmarkFrame[]
}

export interface TapCycle {
  readonly cycleIndex: number
  readonly startMs: number
  readonly peakMs: number
  readonly endMs: number
  readonly durationMs: number
  readonly maxOpeningDistanceNorm: number
  readonly openingSpeedNorm: number
  readonly closingSpeedNorm: number
}

export interface TrackingLossInterval {
  readonly startMs: number
  readonly endMs: number
  readonly durationMs: number
  readonly reason: 'TRACKING_LOST' | 'TIME_GAP' | 'INVALID_LANDMARKS'
}

export interface MeasurementQuality {
  readonly acquisition?: { readonly source?: MeasurementSource; readonly decisions?: readonly EventDecision[]; readonly rawFrames: readonly LandmarkFrame[]; readonly coordinateSpace: string; readonly events: readonly TapCycle[]; readonly sourceMirrored: boolean; readonly displayMirrored?: boolean;
    readonly validity: readonly import('./frame-validity.ts').FrameKinematic[];
    readonly thresholds: {open:number;close:number} }
  readonly qualityVersion: string
  readonly totalFrames: number
  readonly validFrames: number
  readonly validFrameRatio: number
  readonly trackingLossIntervals: readonly TrackingLossInterval[]
  readonly largeGapDetected: boolean
  readonly sideConfidence: number | null
  readonly acceptableForKinematics: boolean
  readonly unreliabilityReasons: readonly string[]
}

export interface KinematicMetrics {
  readonly validTapCount: number
  readonly effectiveDurationSeconds: number
  readonly averageFrequencyHz: number | null
  readonly intervalSequenceMs: readonly number[]
  readonly intervalVariabilityCv: number | null
  readonly amplitudeSequenceNorm: readonly number[]
  readonly averageAmplitudeNorm: number | null
  readonly amplitudeDecayRatio: number | null
  readonly speedDecayRatio: number | null
  readonly calculationNotes: readonly string[]
}

export interface MeasurementOutput {
  readonly schemaVersion: string
  readonly sessionId: string
  readonly calculatedAt: string
  readonly algorithmVersion: string
  readonly handSide: HandSide
  readonly quality: MeasurementQuality
  readonly metrics: KinematicMetrics
  readonly trace?: {
    readonly decisions?: readonly EventDecision[]
    readonly coordinateSpace: string
    readonly frames: readonly import('./frame-validity.ts').FrameKinematic[]
    readonly cycles: readonly TapCycle[]
    readonly thresholds: { open: number; close: number }
  }
  readonly limitations: readonly string[]
}
