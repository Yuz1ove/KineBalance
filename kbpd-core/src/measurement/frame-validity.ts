import type { LandmarkFrame, MeasurementInput, NormalizedLandmark } from './contracts.ts'

export type MeasurementValidity = 'VALID' | 'LOW_CONFIDENCE' | 'OCCLUDED' | 'LANDMARK_JUMP' | 'TRACK_LOST' | 'REACQUIRING' | 'INVALID_TIMESTAMP' | 'INVALID_GEOMETRY' | 'WRONG_HAND'
export interface FrameKinematic {
  frameIndex: number
  timestampMs: number
  rawDistance: number
  palmScale: number
  normalizedDistance: number
  valid: boolean
  validity: MeasurementValidity
  invalidReason?: string
}

// Image-plane geometry only. Raw z remains in the input for future validated 3D work.
export function imageDistance(a: NormalizedLandmark, b: NormalizedLandmark, width: number, height: number): number {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height)
}

export function validateMeasurementFrames(input: MeasurementInput): FrameKinematic[] {
  let previousTimestamp = -Infinity
  let previous: LandmarkFrame | undefined
  let reacquiring = false
  let stableFrames = 0
  const strictImage = input.protocolVersion === 'KBPD-FT-IMAGE-2' || input.frames.some(f=>f.frameWidth || f.frameHeight)
  return input.frames.map(f => {
    let validity: MeasurementValidity = 'VALID'
    const hasImage = Number.isFinite(f.frameWidth) && Number.isFinite(f.frameHeight) && f.frameWidth! > 0 && f.frameHeight! > 0
    const distance = (a: NormalizedLandmark,b: NormalizedLandmark) => hasImage
      ? imageDistance(a,b,f.frameWidth!,f.frameHeight!)
      : Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)) // explicitly versioned legacy compatibility
    let palmScale=0,rawDistance=0
    const dt = f.timestampMs - previousTimestamp
    if (!Number.isFinite(f.timestampMs) || f.timestampMs < 0 || dt <= 0) validity='INVALID_TIMESTAMP'
    else {
      if (dt > 400 && Number.isFinite(previousTimestamp)) {reacquiring=true;stableFrames=0;previous=undefined}
      previousTimestamp=f.timestampMs
      if (!f.tracked || !f.landmarks || f.landmarks.length!==21) validity='TRACK_LOST'
      else if (f.landmarks.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z))) validity='INVALID_GEOMETRY'
      else if (strictImage && !hasImage) validity='INVALID_GEOMETRY'
      else if (f.landmarks.some(p=>p.x<0||p.x>1||p.y<0||p.y>1)) validity='OCCLUDED'
      else if ((f.detectionConfidence!==undefined && (!Number.isFinite(f.detectionConfidence)||f.detectionConfidence<.5)) || (f.handednessScore!==undefined && (!Number.isFinite(f.handednessScore)||f.handednessScore<.5))) validity='LOW_CONFIDENCE'
      else if (f.handedness && f.handedness!=='UNKNOWN' && input.handSide!=='UNKNOWN' && f.handedness!==input.handSide) validity='WRONG_HAND'
      else if (strictImage && (!f.handedness || f.handedness==='UNKNOWN')) validity='LOW_CONFIDENCE'
      else {
        palmScale=distance(f.landmarks[0],f.landmarks[9]);rawDistance=distance(f.landmarks[4],f.landmarks[8])
        if (palmScale < (hasImage ? Math.min(f.frameWidth!,f.frameHeight!)*.02 : .02)) validity='INVALID_GEOMETRY'
        else if(previous && hasImage){
          // Only a coherent whole-palm relocation can trigger this conservative guard.
          // Finger-tip speed, tremor, range, rhythm and pauses NEVER drive quality rejection.
          const anchors=[0,5,9,13,17]
          const displacement=anchors.map(i=>imageDistance(previous!.landmarks[i],f.landmarks[i],f.frameWidth!,f.frameHeight!)/palmScale)
          if(displacement.every(d=>d>2+8*Math.max(0,dt)/1000)) validity='LANDMARK_JUMP'
        }
      }
    }
    if(validity!=='VALID') {reacquiring=true;stableFrames=0;previous=undefined}
    else {
      if(previous && (previous.frameWidth!==f.frameWidth || previous.frameHeight!==f.frameHeight)){reacquiring=true;stableFrames=0}
      previous=f
      if(reacquiring && ++stableFrames<2) validity='REACQUIRING'
      else reacquiring=false
    }
    return {frameIndex:f.frameIndex,timestampMs:f.timestampMs,rawDistance,palmScale,normalizedDistance:palmScale>0?rawDistance/palmScale:0,valid:validity==='VALID',validity,...(validity==='VALID'?{}:{invalidReason:validity})}
  })
}
