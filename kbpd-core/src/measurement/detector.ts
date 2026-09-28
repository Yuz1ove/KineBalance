import { validateMeasurementFrames } from './frame-validity.ts'
import type {
  HandSide,
  KinematicMetrics,
  LandmarkFrame,
  MeasurementInput,
  MeasurementOutput,
  MeasurementQuality,
  NormalizedLandmark,
  TapCycle,
  TrackingLossInterval,
} from './contracts.ts'

export const ALGORITHM_VERSION = 'KBPD-DETECTOR-V1.2.1'
export const SCHEMA_VERSION = 'KBPD-MEASUREMENT-OUT-1'
export const QUALITY_VERSION = 'KBPD-QUALITY-V1.1.0'

const MAX_TIME_GAP_MS = 400
const MIN_CYCLES_FOR_METRICS = 3

export function analyzeFingerTapping(input: MeasurementInput): MeasurementOutput {
  const frames = input.frames || []
  const calculatedAt = new Date().toISOString()
  const limitations: string[] = []
  const imageSpace = input.protocolVersion === 'KBPD-FT-IMAGE-2' || frames.some(f => f.frameWidth && f.frameHeight)
  const algorithmVersion = `${ALGORITHM_VERSION}-${imageSpace ? 'IMAGE-2D' : 'LEGACY-COORDINATES'}`
  if (!imageSpace) limitations.push('LEGACY_COORDINATE_SPACE: source dimensions absent; uncorrected historical ratios are not comparable to IMAGE-2D.')

  if (frames.length === 0) {
    return {
      schemaVersion: SCHEMA_VERSION,
      sessionId: input.sessionId,
      calculatedAt,
      algorithmVersion,
      handSide: input.handSide,
      quality: {
        qualityVersion: QUALITY_VERSION,
        totalFrames: 0,
        validFrames: 0,
        validFrameRatio: 0,
        trackingLossIntervals: [],
        largeGapDetected: false,
        sideConfidence: null,
        acceptableForKinematics: false,
        unreliabilityReasons: ['NO_FRAMES_PROVIDED'],
      },
      metrics: {
        validTapCount: 0,
        effectiveDurationSeconds: 0,
        averageFrequencyHz: null,
        intervalSequenceMs: [],
        intervalVariabilityCv: null,
        amplitudeSequenceNorm: [],
        averageAmplitudeNorm: null,
        amplitudeDecayRatio: null,
        speedDecayRatio: null,
        calculationNotes: ['INSUFFICIENT_DATA: 0 frames'],
      },
      limitations: ['Empty input data cannot be analyzed.'],
    }
  }

  // 1. Validate frames, palm scale normalization and tracking continuity
  const processedFrames = validateMeasurementFrames(input)
  const trackingLossIntervals: TrackingLossInterval[] = []
  let previousTimestamp = -Infinity
  let largeGapDetected = false
  let previousInvalid = false
  for (const f of processedFrames) {
    if (Number.isFinite(previousTimestamp) && f.timestampMs - previousTimestamp > MAX_TIME_GAP_MS) {
      largeGapDetected = true
      trackingLossIntervals.push({startMs:previousTimestamp,endMs:f.timestampMs,durationMs:f.timestampMs-previousTimestamp,reason:'TIME_GAP'})
    }
    if (Number.isFinite(f.timestampMs) && f.timestampMs > previousTimestamp) previousTimestamp=f.timestampMs
    if (!f.valid) {
      const reason = f.validity === 'TRACK_LOST' ? 'TRACKING_LOST' : 'INVALID_LANDMARKS'
      const last = trackingLossIntervals[trackingLossIntervals.length-1]
      if (previousInvalid && last && last.reason===reason && f.timestampMs>=last.endMs) {
        trackingLossIntervals[trackingLossIntervals.length-1]={...last,endMs:f.timestampMs,durationMs:f.timestampMs-last.startMs}
      } else trackingLossIntervals.push({startMs:f.timestampMs,endMs:f.timestampMs,durationMs:0,reason})
    }
    previousInvalid = !f.valid
  }

  const validFrames = processedFrames.filter(f => f.valid)
  const validFrameRatio = frames.length > 0 ? validFrames.length / frames.length : 0

  // Causal hysteresis: only the last completed excursion informs the next opening.
  // The absolute floor is an engineering noise guard, NOT calibrated model accuracy.
  const minimumExcursion = 0.01
  const cycles: TapCycle[] = []
  const decisions: {timestampMs:number;distance:number;state:string;open:number;close:number;reason:string}[] = []
  let state: 'WAIT_OPEN' | 'OPENING' | 'CLOSING' = 'WAIT_OPEN'
  let cycleStartIdx = -1, peakIdx = -1
  let baseline = 0, peak = 0, previousExcursion = 0
  let openThreshold = minimumExcursion, closeThreshold = 0
  let uncertain = false
  // Require observed support for the open phase, not just one threshold crossing.
  // 40 ms retains the frozen 5 Hz small-motion fixture (50 ms open support).
  // This is an engineering impulse guard, not a calibrated human noise threshold.
  const minimumOpenSupportMs = 40
  let openSince = 0, lastOpen = 0, segmentHasCycle = false, lastObservedTime = -Infinity
  for (let i=0;i<processedFrames.length;i++) {
    const curr=processedFrames[i]
    const gap=Number.isFinite(lastObservedTime) && curr.timestampMs-lastObservedTime>MAX_TIME_GAP_MS
    if(Number.isFinite(curr.timestampMs))lastObservedTime=Math.max(lastObservedTime,curr.timestampMs)
    if (!curr.valid || gap) {
      state='WAIT_OPEN';cycleStartIdx=-1;previousExcursion=0;segmentHasCycle=false;openSince=0;lastOpen=0
      decisions.push({timestampMs:curr.timestampMs,distance:curr.normalizedDistance,state,open:openThreshold,close:closeThreshold,reason:gap?'TIME_GAP_RESET':'INVALID_RESET'})
      if (!curr.valid) continue
    }
    const d=curr.normalizedDistance
    let reason='WAITING_FOR_EXCURSION'
    if (state==='WAIT_OPEN') {
      baseline=d;peak=d;cycleStartIdx=i;peakIdx=i;state='OPENING'
    }
    if (state==='OPENING') {
      if (d<baseline) {baseline=d;peak=d;peakIdx=i}
      openThreshold=baseline+Math.max(minimumExcursion,previousExcursion*.55)
      if (d>peak) {peak=d;peakIdx=i}
      if (d>=openThreshold) {state='CLOSING';openSince=curr.timestampMs;lastOpen=curr.timestampMs;reason='OPEN_CANDIDATE'}
      else if (peak-baseline>1e-8) {reason='BELOW_OPEN_THRESHOLD';if(d<peak && peak-baseline<minimumExcursion)uncertain=true}
    }
    if (state==='CLOSING') {
      if (d>peak) {peak=d;peakIdx=i}
      if(d>=openThreshold)lastOpen=curr.timestampMs
      closeThreshold=baseline+(peak-baseline)*.35
      if (d<=closeThreshold) {
        const start=processedFrames[cycleStartIdx],top=processedFrames[peakIdx]
        // A return materially below the initial anchor proves it was a partial opening.
        const initialPartial=!segmentHasCycle && d<baseline-minimumExcursion
        const supported=lastOpen-openSince>=minimumOpenSupportMs
        if(!supported){reason='TRANSIENT_EXCURSION_REJECTED';uncertain=true}
        if(initialPartial)reason='INITIAL_PARTIAL_REJECTED'
        if (supported && !initialPartial && top.timestampMs>start.timestampMs && curr.timestampMs>top.timestampMs) {
          cycles.push({cycleIndex:cycles.length+1,startMs:start.timestampMs,peakMs:top.timestampMs,endMs:curr.timestampMs,
            durationMs:curr.timestampMs-start.timestampMs,maxOpeningDistanceNorm:peak,
            openingSpeedNorm:(peak-start.normalizedDistance)/Math.max(1,top.timestampMs-start.timestampMs)*1000,
            closingSpeedNorm:(peak-d)/Math.max(1,curr.timestampMs-top.timestampMs)*1000})
          previousExcursion=peak-baseline;segmentHasCycle=true;reason='COMPLETE_CYCLE'
        }
        state='OPENING';cycleStartIdx=i;peakIdx=i;baseline=d;peak=d
      }
    }
    decisions.push({timestampMs:curr.timestampMs,distance:d,state,open:openThreshold,close:closeThreshold,reason})
  }
  // 3. Compute Metrics
  const calculationNotes: string[] = []
  const validTapCount = cycles.length

  const finiteTimes = frames.map(f => f.timestampMs).filter(t => Number.isFinite(t) && t >= 0)
  const firstTimestamp = finiteTimes.length ? Math.min(...finiteTimes) : 0
  const lastTimestamp = finiteTimes.length ? Math.max(...finiteTimes) : 0
  const effectiveDurationSeconds = Math.max(0, (lastTimestamp - firstTimestamp) / 1000)

  let averageFrequencyHz: number | null = null
  let intervalVariabilityCv: number | null = null
  let averageAmplitudeNorm: number | null = null
  let amplitudeDecayRatio: number | null = null
  let speedDecayRatio: number | null = null

  // A recording can begin in an already-closed pose. Only two observed closures
  // establish a period; continuity equality prevents intervals spanning tracking loss.
  const intervalSequenceMs = cycles.flatMap((c,i) => i>0 && c.startMs===cycles[i-1].endMs ? [c.endMs-cycles[i-1].endMs] : [])
  if (!intervalSequenceMs.length) calculationNotes.push('INSUFFICIENT_CONTIGUOUS_INTERVALS')
  const amplitudeSequenceNorm = cycles.map(c => c.maxOpeningDistanceNorm)

  if (validTapCount < MIN_CYCLES_FOR_METRICS) {
    calculationNotes.push(`INSUFFICIENT_CYCLES: detected ${validTapCount} (minimum ${MIN_CYCLES_FOR_METRICS})`)
  } else {
    const meanInterval = intervalSequenceMs.length ? intervalSequenceMs.reduce((a, b) => a + b, 0) / intervalSequenceMs.length : 0
    averageFrequencyHz = meanInterval > 0 ? Number((1000 / meanInterval).toFixed(2)) : null
    const variance = intervalSequenceMs.length ? intervalSequenceMs.reduce((acc, v) => acc + Math.pow(v - meanInterval, 2), 0) / intervalSequenceMs.length : 0
    const stdDev = Math.sqrt(variance)
    intervalVariabilityCv = meanInterval > 0 ? Number((stdDev / meanInterval).toFixed(3)) : null

    // Average amplitude
    const meanAmp = amplitudeSequenceNorm.reduce((a, b) => a + b, 0) / amplitudeSequenceNorm.length
    averageAmplitudeNorm = Number(meanAmp.toFixed(3))

    // Decay calculation: first half vs second half
    const half = Math.floor(cycles.length / 2)
    const firstHalfAmps = amplitudeSequenceNorm.slice(0, half)
    const secondHalfAmps = amplitudeSequenceNorm.slice(cycles.length - half)
    const firstMeanAmp = firstHalfAmps.reduce((a, b) => a + b, 0) / firstHalfAmps.length
    const secondMeanAmp = secondHalfAmps.reduce((a, b) => a + b, 0) / secondHalfAmps.length
    amplitudeDecayRatio = firstMeanAmp > 0 ? Number((secondMeanAmp / firstMeanAmp).toFixed(3)) : null

    // Speed decay
    const firstHalfSpeeds = cycles.slice(0, half).map(c => c.openingSpeedNorm)
    const secondHalfSpeeds = cycles.slice(cycles.length - half).map(c => c.openingSpeedNorm)
    const firstMeanSpeed = firstHalfSpeeds.reduce((a, b) => a + b, 0) / firstHalfSpeeds.length
    const secondMeanSpeed = secondHalfSpeeds.reduce((a, b) => a + b, 0) / secondHalfSpeeds.length
    speedDecayRatio = firstMeanSpeed > 0 ? Number((secondMeanSpeed / firstMeanSpeed).toFixed(3)) : null
  }

  // 4. Determine Quality & Limitations
  const unreliabilityReasons: string[] = []
  if (validFrameRatio < 0.6) {
    unreliabilityReasons.push('LOW_VALID_FRAME_RATIO')
  }
  if (largeGapDetected) {
    unreliabilityReasons.push('TIME_GAPS_DETECTED')
  }
  if (validFrames.length < 15) {
    unreliabilityReasons.push('INSUFFICIENT_VALID_FRAMES')
  }

  if (uncertain) unreliabilityReasons.push('LOW_EXCURSION_UNCERTAIN')
  const acceptableForKinematics = unreliabilityReasons.length === 0 // acquisition quality is independent of movement performance

  if (imageSpace) limitations.push('IMAGE-2D: z preserved as raw only; planar relative amplitude, not calibrated depth. Causal event thresholds have an uncalibrated 0.01 palm-ratio noise floor; inspect raw curve.')
  limitations.push('EVENT-SUPPORT: opening requires at least 40 ms of observed above-threshold support before closure; isolated impulses are excluded without smoothing raw coordinates. Sustained model noise cannot always be distinguished from small real motion.')
  limitations.push('Palm scale normalization mitigates depth variance but does not fully correct for off-axis camera angles.')
  limitations.push('Model estimated coordinates are dimensionless ratios, not calibrated millimeter depths.')
  limitations.push('Kinematic measures reflect motor performance in this test and are NOT diagnostic scores or MDS-UPDRS ratings.')

  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId: input.sessionId,
    calculatedAt,
    algorithmVersion,
    handSide: input.handSide,
    quality: {
      qualityVersion: QUALITY_VERSION,
      totalFrames: frames.length,
      validFrames: validFrames.length,
      validFrameRatio: Number(validFrameRatio.toFixed(3)),
      trackingLossIntervals,
      largeGapDetected,
      sideConfidence: null, // UNKNOWN: no calibrated session-level confidence
      acceptableForKinematics,
      unreliabilityReasons,
      acquisition: { rawFrames: frames, coordinateSpace: imageSpace ? 'IMAGE-2D-PALM-RATIO' : 'LEGACY-NORMALIZED-XYZ', events: cycles,sourceMirrored:input.mirrored,displayMirrored:input.displayMirrored,validity:processedFrames,thresholds:{open:openThreshold,close:closeThreshold}, decisions, source:input.source ?? 'UNKNOWN' },
    },
    metrics: {
      validTapCount,
      effectiveDurationSeconds: Number(effectiveDurationSeconds.toFixed(2)),
      averageFrequencyHz,
      intervalSequenceMs,
      intervalVariabilityCv,
      amplitudeSequenceNorm,
      averageAmplitudeNorm,
      amplitudeDecayRatio,
      speedDecayRatio,
      calculationNotes,
    },
    trace: {coordinateSpace: imageSpace ? 'IMAGE-2D-PALM-RATIO' : 'LEGACY-NORMALIZED-XYZ', frames: processedFrames, cycles, thresholds: {open:openThreshold,close:closeThreshold}, decisions},
    limitations,
  }
}
