/**
 * Hand tracking & kinematic measurement client utility.
 * Integrates MediaPipe Hands with canvas rendering and real-time hysteresis tap detection.
 */

import type { HandTrackingFrame, HandLandmark } from './kbpdApi'

export interface RealtimeKinematics {
  tapCount: number
  currentFrequencyHz: number
  normalizedDistance: number
  isTracking: boolean
}

export class HandDetectorService {
  private hands: any = null
  private stream: MediaStream | null = null
  private animationFrameId: number | null = null
  private isRunning = false
  private capturedFrames: HandTrackingFrame[] = []
  private startTimeMs = 0

  // Real-time kinematic tracking state
  private tapCount = 0
  private lastValleyTime = 0
  private lastPeakDist = 0
  private tapIntervals: number[] = []
  private state: 'SEEKING_PEAK' | 'SEEKING_VALLEY' = 'SEEKING_PEAK'
  private currentNormDist = 0

  // Load MediaPipe script dynamically if not present
  async ensureScriptLoaded(): Promise<void> {
    if (typeof window === 'undefined') return
    if ((window as any).Hands) return

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="hands.js"]')
      if (existing) {
        if ((window as any).Hands) return resolve()
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', (err) => reject(err))
        return
      }

      const script = document.createElement('script')
      script.src = '/vendor/mediapipe/hands.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = (e) => reject(new Error('Failed to load MediaPipe Hands script: ' + e))
      document.head.appendChild(script)
    })
  }

  async initialize(): Promise<void> {
    await this.ensureScriptLoaded()
    const HandsClass = (window as any).Hands
    if (!HandsClass) {
      throw new Error('MediaPipe Hands library could not be initialized')
    }

    this.hands = new HandsClass({
      locateFile: (file: string) => `/vendor/mediapipe/${file}`,
    })

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
  }

  resetRecording() {
    this.capturedFrames = []
    this.tapCount = 0
    this.lastValleyTime = 0
    this.lastPeakDist = 0
    this.tapIntervals = []
    this.state = 'SEEKING_PEAK'
    this.currentNormDist = 0
    this.startTimeMs = performance.now()
  }

  getCapturedFrames(): HandTrackingFrame[] {
    return [...this.capturedFrames]
  }

  getKinematics(): RealtimeKinematics {
    let currentFrequencyHz = 0
    if (this.tapIntervals.length > 0) {
      const recent = this.tapIntervals.slice(-3)
      const avgInterval = recent.reduce((a, b) => a + b, 0) / recent.length
      if (avgInterval > 0) {
        currentFrequencyHz = Math.round((1000 / avgInterval) * 10) / 10
      }
    }

    return {
      tapCount: this.tapCount,
      currentFrequencyHz,
      normalizedDistance: this.currentNormDist,
      isTracking: this.isRunning,
    }
  }

  // Real-time distance and hysteresis peak-valley detection
  private processLandmarks(landmarks: HandLandmark[], timestampMs: number) {
    if (!landmarks || landmarks.length < 21) return

    // Thumb tip = 4, Index tip = 8, Wrist = 0, Middle MCP = 9
    const thumb = landmarks[4]
    const index = landmarks[8]
    const wrist = landmarks[0]
    const mcp = landmarks[9]

    const tapDist = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z)
    const palmLength = Math.hypot(wrist.x - mcp.x, wrist.y - mcp.y, wrist.z - mcp.z)

    const normDist = palmLength > 0.001 ? tapDist / palmLength : tapDist
    this.currentNormDist = Math.round(normDist * 100) / 100

    // Record frame
    this.capturedFrames.push({
      frameIndex: this.capturedFrames.length,
      timestampMs: Math.round(timestampMs),
      landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z })),
      confidence: 0.9,
    })

    // Hysteresis peak-valley detection
    // Normal open hand is ~ 0.7 - 1.2; closed pinch is ~ 0.15 - 0.35
    const PEAK_THRESHOLD = 0.55
    const VALLEY_THRESHOLD = 0.35

    if (this.state === 'SEEKING_PEAK') {
      if (normDist > PEAK_THRESHOLD && normDist > this.lastPeakDist) {
        this.lastPeakDist = normDist
      } else if (normDist < PEAK_THRESHOLD - 0.08 && this.lastPeakDist > PEAK_THRESHOLD) {
        // Passed peak, now seeking valley (contact closure)
        this.state = 'SEEKING_VALLEY'
      }
    } else if (this.state === 'SEEKING_VALLEY') {
      if (normDist <= VALLEY_THRESHOLD) {
        // Valid tap closed!
        this.tapCount++
        if (this.lastValleyTime > 0) {
          const interval = timestampMs - this.lastValleyTime
          if (interval > 80 && interval < 1500) {
            this.tapIntervals.push(interval)
          }
        }
        this.lastValleyTime = timestampMs
        this.lastPeakDist = 0
        this.state = 'SEEKING_PEAK'
      }
    }
  }

  async startCamera(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onFrameProcessed?: (kinematics: RealtimeKinematics) => void
  ): Promise<void> {
    await this.initialize()

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
      },
      audio: false,
    })

    videoElement.srcObject = this.stream
    await videoElement.play()

    this.isRunning = true
    this.resetRecording()

    const canvasCtx = canvasElement.getContext('2d')
    if (!canvasCtx) throw new Error('Canvas 2D context unavailable')

    this.hands.onResults((results: any) => {
      if (!this.isRunning) return

      canvasElement.width = videoElement.videoWidth || 640
      canvasElement.height = videoElement.videoHeight || 480

      canvasCtx.save()
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
      // Mirror canvas to match selfie preview
      canvasCtx.translate(canvasElement.width, 0)
      canvasCtx.scale(-1, 1)

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const rawLandmarks = results.multiHandLandmarks[0]
        const landmarks: HandLandmark[] = rawLandmarks.map((pt: any) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z || 0,
        }))

        const elapsed = performance.now() - this.startTimeMs
        this.processLandmarks(landmarks, elapsed)

        // Draw skeleton
        this.drawHandSkeleton(canvasCtx, landmarks, canvasElement.width, canvasElement.height)
      }

      canvasCtx.restore()

      if (onFrameProcessed) {
        onFrameProcessed(this.getKinematics())
      }
    })

    const processFrame = async () => {
      if (!this.isRunning) return
      if (videoElement.readyState >= 2) {
        await this.hands.send({ image: videoElement })
      }
      this.animationFrameId = requestAnimationFrame(processFrame)
    }

    this.animationFrameId = requestAnimationFrame(processFrame)
  }

  // Draw hand skeleton with elegant sage-green and terracotta lines
  drawHandSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: HandLandmark[],
    width: number,
    height: number
  ) {
    const CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],// Ring
      [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [5, 9], [9, 13], [13, 17]              // Palm
    ]

    // Draw bones
    ctx.lineWidth = 3
    ctx.strokeStyle = '#506953'
    ctx.lineCap = 'round'

    for (const [start, end] of CONNECTIONS) {
      const p1 = landmarks[start]
      const p2 = landmarks[end]
      ctx.beginPath()
      ctx.moveTo(p1.x * width, p1.y * height)
      ctx.lineTo(p2.x * width, p2.y * height)
      ctx.stroke()
    }

    // Connect Thumb (4) and Index (8) with dashed terracotta accent line
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#A46D50'
    ctx.lineWidth = 2
    ctx.moveTo(landmarks[4].x * width, landmarks[4].y * height)
    ctx.lineTo(landmarks[8].x * width, landmarks[8].y * height)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i]
      ctx.beginPath()
      const isTip = (i === 4 || i === 8)
      ctx.arc(pt.x * width, pt.y * height, isTip ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = isTip ? '#A46D50' : '#FFFDFA'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = isTip ? '#FFFDFA' : '#506953'
      ctx.stroke()
    }
  }

  stopCamera() {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop()
      })
      this.stream = null
    }

    if (this.hands) {
      try {
        this.hands.close()
      } catch {}
      this.hands = null
    }
  }
}

export const handDetector = new HandDetectorService()
