/** Legacy MediaPipe model retained. Raw measurement and overlay rendering are independent. */
import type { HandTrackingFrame, HandLandmark } from './kbpdApi'
import { ALGORITHM_VERSION, analyzeFingerTapping } from '../../kbpd-core/src/measurement/detector.ts'
import type { MeasurementOutput } from '../../kbpd-core/src/measurement/contracts.ts'

export interface CapturePerformance {
  width: number | null
  height: number | null
  requestedFps: number | null
  source: string
  algorithmVersion: string
  validRatio: number | null
  gaps: number
  losses: number
  reacquisitions: number
  cameraFps: number | null
  inferenceFps: number | null
  renderFps: number | null
  skippedPresentedFrames: number | null
  duplicateFramesSkipped: number
  inferenceLatencyMs: number | null
  cameraSettingsFps: number | null
}
export interface RealtimeKinematics {
  tapCount: number
  currentFrequencyHz: number
  normalizedDistance: number
  isTracking: boolean
  validity?: string
  readyToMeasure?: boolean
  progress?: { processed: number; seconds: number; duration: number }
  performance?: CapturePerformance
}

export class HandDetectorService {
  private cancellations = new Set<()=>void>()
  private watchdog: ReturnType<typeof setTimeout> | null = null
  private ended: (()=>void) | null = null
  private replayDuration = 0
  private source: 'CAMERA' | 'REAL_VIDEO' = 'CAMERA'
  private bounded<T>(promise:Promise<T>,run:number,code:string,ms=15000):Promise<T> {
    return new Promise((resolve,reject)=>{
      const cancel=()=>finish(new Error('CANCELLED'))
      const timer=setTimeout(()=>finish(new Error(code)),ms)
      const finish=(error?:Error,value?:T)=>{clearTimeout(timer);this.cancellations.delete(cancel);error?reject(error):resolve(value as T)}
      this.cancellations.add(cancel)
      promise.then(value=>run===this.runId?finish(undefined,value):finish(new Error('CANCELLED')),error=>finish(error))
    })
  }

  private hands: any = null
  private stream: MediaStream | null = null
  private animationFrameId: number | null = null
  private videoFrameId: number | null = null
  private renderFrameId: number | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private isRunning = false
  private recording = false
  private runId = 0
  private recordingId = 0
  private capturedFrames: HandTrackingFrame[] = []
  private firstSourceMs: number | null = null
  private lastSourceMs = -Infinity
  private expectedHand: 'LEFT' | 'RIGHT' = 'RIGHT'
  private analysis: MeasurementOutput | null = null
  private stableFrames = 0
  private telemetryStart = 0
  private renderCount = 0
  private inferenceCount = 0
  private latencyTotal = 0
  private duplicates = 0
  private firstPresented: number | null = null
  private lastPresented: number | null = null
  private cameraFirstMs: number | null = null
  private cameraLastMs: number | null = null
  private skipped = 0

  async initialize(run=this.runId): Promise<any> {
    if (!(window as any).Hands) {
      await new Promise<void>((resolve,reject)=>{
        const script=document.createElement('script')
        const cleanup=()=>{clearTimeout(timer);this.cancellations.delete(cancel);script.onload=null;script.onerror=null}
        const fail=(code:string)=>{cleanup();script.remove();reject(new Error(code))}
        const cancel=()=>fail('CANCELLED')
        const timer=setTimeout(()=>fail('MODEL_LOAD_TIMEOUT'),15000)
        this.cancellations.add(cancel)
        script.src='/vendor/mediapipe/0.4.1675469240/hands.js';script.async=true
        script.onload=()=>{cleanup();resolve()};script.onerror=()=>fail('MODEL_LOAD_FAILED')
        document.head.appendChild(script)
      })
    }
    if(run!==this.runId)throw new Error('CANCELLED')
    const hands=new (window as any).Hands({locateFile:(file:string)=>`/vendor/mediapipe/0.4.1675469240/${file}`})
    hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.5,minTrackingConfidence:.5})
    this.hands=hands
    if(hands.initialize) await this.bounded(Promise.resolve(hands.initialize()),run,'MODEL_LOAD_TIMEOUT',30000)
    return hands
  }
  resetRecording() {
    this.recordingId++
    this.recording=true
    this.capturedFrames=[]
    this.firstSourceMs=null
    this.analysis=null
    this.stableFrames=0
  }
  getCapturedFrames(): HandTrackingFrame[] { return structuredClone(this.capturedFrames) }
  getAnalysis(): MeasurementOutput | null { return this.analysis }
  getPerformance(): CapturePerformance {
    const seconds=(performance.now()-this.telemetryStart)/1000
    const cameraSeconds=((this.cameraLastMs??0)-(this.cameraFirstMs??0))/1000
    return {
      width:this.video?.videoWidth||null,height:this.video?.videoHeight||null,requestedFps:this.source==='CAMERA'?30:null,
      source:this.source,algorithmVersion:ALGORITHM_VERSION,validRatio:this.analysis?.quality.validFrameRatio??null,
      gaps:this.analysis?.quality.trackingLossIntervals.filter(x=>x.reason==='TIME_GAP').length??0,
      losses:this.analysis?.quality.trackingLossIntervals.filter(x=>x.reason==='TRACKING_LOST').length??0,
      reacquisitions:this.analysis?.trace?.frames.filter(x=>x.validity==='REACQUIRING').length??0,
      cameraFps:cameraSeconds>0&&this.lastPresented!==null&&this.firstPresented!==null ? (this.lastPresented-this.firstPresented)/cameraSeconds : null,
      inferenceFps:seconds>0?this.inferenceCount/seconds:null,
      renderFps:seconds>0?this.renderCount/seconds:null,
      skippedPresentedFrames:this.lastPresented===null?null:this.skipped,
      duplicateFramesSkipped:this.duplicates,
      inferenceLatencyMs:this.inferenceCount?this.latencyTotal/this.inferenceCount:null,
      cameraSettingsFps:this.stream?.getVideoTracks()[0]?.getSettings().frameRate??null,
    }
  }
  getKinematics(): RealtimeKinematics {
    const last=this.analysis?.trace?.frames.at(-1)
    return {tapCount:this.analysis?.metrics.validTapCount??0,currentFrequencyHz:this.analysis?.metrics.averageFrequencyHz??0,
      normalizedDistance:last?.valid ? last.normalizedDistance : 0,isTracking:this.isRunning && last?.valid===true,
      progress:this.source==='REAL_VIDEO'?{processed:this.capturedFrames.length,seconds:(this.capturedFrames.at(-1)?.sourceTimestampMs??0)/1000,duration:this.replayDuration}:undefined,
      validity:last?.validity??'TRACK_LOST',readyToMeasure:this.isRunning && this.stableFrames>=5,performance:this.getPerformance()}
  }

  private acceptResult(results:any, sourceMs:number, started:number, completed:number, width:number,height:number) {
    if(this.firstSourceMs===null)this.firstSourceMs=sourceMs
    const raw=results.multiHandLandmarks?.[0]??[]
    const handedness=results.multiHandedness?.[0]
    // MediaPipe Hands assumes mirrored input; our video pixels are unmirrored (CSS is display-only).
    const side=handedness?.label==='Left'?'RIGHT':handedness?.label==='Right'?'LEFT':'UNKNOWN'
    const frame:HandTrackingFrame={frameIndex:this.capturedFrames.length,timestampMs:sourceMs-this.firstSourceMs,sourceTimestampMs:sourceMs,
      frameWidth:width,frameHeight:height,inferenceStartedAtMs:started,inferenceCompletedAtMs:completed,
      tracked:raw.length===21,landmarks:raw.map((p:HandLandmark)=>({x:p.x,y:p.y,z:p.z})),handedness:side,handednessScore:handedness?.score}
    this.capturedFrames.push(frame)
    // Preview is bounded; the actual recording retains every source frame, including loss.
    if(!this.recording && this.capturedFrames.length>60)this.capturedFrames.shift()
    this.analysis=analyzeFingerTapping({sessionId:'preview-session',source:this.source,protocolVersion:'KBPD-FT-IMAGE-2',handSide:this.expectedHand,mirrored:false,displayMirrored:this.source==='CAMERA',frames:this.capturedFrames.map(f=>({...f,tracked:f.tracked===true}))})
    if(this.analysis.trace?.frames.at(-1)?.valid)this.stableFrames++;else this.stableFrames=0
    return raw
  }

  async startCamera(videoElement:HTMLVideoElement,canvasElement:HTMLCanvasElement,onFrameProcessed?:(k:RealtimeKinematics)=>void,expectedHand:'LEFT'|'RIGHT'='RIGHT',onError?:(message:string)=>void,onStage?:(stage:string)=>void,replay?:{url:string;onEnded:()=>void}):Promise<boolean> {
    this.stopCamera()
    const run=this.runId
    this.expectedHand=expectedHand
    this.source=replay?'REAL_VIDEO':'CAMERA'
    let stage='PERMISSION_WAITING'
    const update=(next:string)=>{stage=next;if(run===this.runId)onStage?.(next)}
    try {
      this.video=videoElement;this.canvas=canvasElement
      if(replay){update('VIDEO_LOADING');videoElement.src=replay.url;videoElement.load()}
      else {
        update('PERMISSION_WAITING')
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('DEVICE_NOT_FOUND')
        const request=navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30},facingMode:'user'},audio:false})
        request.then(stream=>{if(run!==this.runId)stream.getTracks().forEach(t=>t.stop())},()=>{})
        const stream=await this.bounded(request,run,'CAMERA_REQUEST_TIMEOUT')
        if(run!==this.runId){stream.getTracks().forEach(t=>t.stop());return false}
        this.stream=stream;videoElement.srcObject=stream;update('STREAM_ACQUIRED')
      }
      await this.bounded(videoElement.play(),run,'VIDEO_PLAY_TIMEOUT')
      update('VIDEO_PLAYABLE')
      if(replay){videoElement.pause();if(!Number.isFinite(videoElement.duration)||videoElement.duration>30)throw new Error('VIDEO_DURATION_LIMIT');if(videoElement.duration<1)throw new Error('VIDEO_TOO_SHORT');this.replayDuration=videoElement.duration}
      update('MODEL_LOADING')
      const hands=await this.initialize(run)
      if(run!==this.runId)return false
      update('MODEL_READY')
      const ctx=canvasElement.getContext('2d')
      if(!ctx)throw new Error('Canvas 2D context unavailable')
      // Snapshot freezes the source image associated with mediaTime while async inference runs.
      const snapshot=document.createElement('canvas'),snapshotCtx=snapshot.getContext('2d')!
      this.isRunning=true;this.resetRecording();this.recording=!!replay;this.lastSourceMs=-Infinity
      this.telemetryStart=performance.now();this.renderCount=0;this.inferenceCount=0;this.latencyTotal=0;this.duplicates=0
      this.firstPresented=null;this.lastPresented=null;this.cameraFirstMs=null;this.cameraLastMs=null;this.skipped=0
      let pending:{source:number;start:number;recording:number;width:number;height:number}|null=null
      const armWatchdog=(code:string)=>{
        if(this.watchdog)clearTimeout(this.watchdog)
        this.watchdog=setTimeout(()=>{if(run!==this.runId)return;this.stopCamera();onStage?.(code);onError?.(code)},10000)
      }
      hands.onResults((results:any)=>{
        if(!this.isRunning||run!==this.runId||!pending)return
        update('FIRST_INFERENCE');
        const completed=performance.now();this.inferenceCount++;this.latencyTotal+=completed-pending.start
        if(pending.recording!==this.recordingId)return
        if(canvasElement.width!==pending.width)canvasElement.width=pending.width
        if(canvasElement.height!==pending.height)canvasElement.height=pending.height
        this.renderCount++
        ctx.clearRect(0,0,canvasElement.width,canvasElement.height)
        const raw=this.acceptResult(results,pending.source,pending.start,completed,pending.width,pending.height)
        // One CSS mirror on both video and canvas; no context mirror and no measurement smoothing.
        if(raw.length===21 && raw.every((p:HandLandmark)=>Number.isFinite(p.x)&&Number.isFinite(p.y))) this.drawHandSkeleton(ctx,raw,canvasElement.width,canvasElement.height)
        const frame=this.capturedFrames.at(-1);if(frame)frame.renderAtMs=performance.now()
        const k=this.getKinematics();update(k.isTracking?'TRACKING':raw.length?'TRACKING_INVALID':'NO_HAND');onFrameProcessed?.(k)
      })
      const schedule=()=>{
        if(!this.isRunning||run!==this.runId||replay)return
        if(typeof videoElement.requestVideoFrameCallback==='function')this.videoFrameId=videoElement.requestVideoFrameCallback((_now,meta)=>void processFrame(meta.mediaTime*1000,meta.presentedFrames))
        else this.animationFrameId=requestAnimationFrame(()=>void processFrame(videoElement.currentTime*1000))
      }
      const processFrame=async(source:number,presented?:number)=>{
        if(!this.isRunning||run!==this.runId)return
        if(videoElement.readyState<2||!Number.isFinite(source)){schedule();return}
        if(source<=this.lastSourceMs){this.duplicates++;schedule();return}
        this.lastSourceMs=source
        if(presented!==undefined){
          if(this.lastPresented!==null)this.skipped+=Math.max(0,presented-this.lastPresented-1)
          if(this.firstPresented===null){this.firstPresented=presented;this.cameraFirstMs=source}
          this.lastPresented=presented;this.cameraLastMs=source
        }
        snapshot.width=videoElement.videoWidth;snapshot.height=videoElement.videoHeight
        if(!snapshot.width||!snapshot.height){schedule();return}
        snapshotCtx.drawImage(videoElement,0,0)
        if(this.recording && (this.capturedFrames.length>=900 || (this.firstSourceMs!==null && source-this.firstSourceMs>30000))){this.stopCamera();onError?.('CAPTURE_LIMIT');return}
        armWatchdog('INFERENCE_TIMEOUT')
        pending={source,start:performance.now(),recording:this.recordingId,width:snapshot.width,height:snapshot.height}
        try{await hands.send({image:snapshot})}catch(err){if(run===this.runId){console.error('[KineBalance] inference',err);this.stopCamera();onStage?.('INFERENCE_FAILED');onError?.('INFERENCE_FAILED: '+(err instanceof Error?err.message:'手部追蹤中斷'))}return}
        pending=null;if(run!==this.runId)return;if(this.watchdog)clearTimeout(this.watchdog);if(replay)return;armWatchdog('VIDEO_NO_NEW_FRAMES');schedule()
      }
      armWatchdog('VIDEO_NO_NEW_FRAMES')
      if(replay){
        // Paused decoding: inference consumes each 1/30-second media sample before seeking.
        // Wall-clock speed never determines completion and slow inference cannot skip samples.
        const decode=async()=>{
          try{
            for(let index=0;index<Math.ceil(this.replayDuration*30);index++){
              if(!this.isRunning||run!==this.runId)return
              const seconds=index/30
              if(Math.abs(videoElement.currentTime-seconds)>0.0001){
                await new Promise<void>((resolve,reject)=>{
                  const cleanup=()=>{clearTimeout(timer);this.cancellations.delete(cancel);videoElement.removeEventListener('seeked',done);videoElement.removeEventListener('error',fail)}
                  const done=()=>{cleanup();resolve()}
                  const fail=()=>{cleanup();reject(new Error('VIDEO_DECODE_FAILED'))}
                  const cancel=()=>{cleanup();reject(new Error('CANCELLED'))}
                  const timer=setTimeout(fail,10000)
                  this.cancellations.add(cancel)
                  videoElement.addEventListener('seeked',done,{once:true});videoElement.addEventListener('error',fail,{once:true})
                  videoElement.currentTime=seconds
                })
              }
              await processFrame(seconds*1000)
              // Yield for progress rendering and cancellation between decoded frames.
              await new Promise(resolve=>setTimeout(resolve,0))
            }
            if(this.isRunning&&run===this.runId)replay.onEnded()
          }catch(error){if(run===this.runId){console.error('[KineBalance] video decode',error);this.stopCamera();onError?.('VIDEO_DECODE_FAILED')}}
        }
        void decode()
      }else schedule()
      return true
    }catch(err){
      if(run!==this.runId)return false
      const name=typeof err==='object' && err!==null && 'name' in err?String(err.name):''
      console.error('[KineBalance] capture start',{stage,error:err})
      const code=({NotSupportedError:stage==='PERMISSION_WAITING'?'CAMERA_UNSUPPORTED':'VIDEO_DECODE_FAILED',NotAllowedError:'PERMISSION_DENIED',NotFoundError:'DEVICE_NOT_FOUND',NotReadableError:'DEVICE_NOT_READABLE',OverconstrainedError:'CONSTRAINT_UNSUPPORTED'} as Record<string,string>)[name]
        ?? (stage==='MODEL_LOADING'?'MODEL_LOAD_FAILED: ':'')+(err instanceof Error?err.message:String(err))
      this.stopCamera();onStage?.(code);throw new Error(code)
    }
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
    this.isRunning=false;this.runId++
    for(const cancel of [...this.cancellations])cancel()
    if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null
    if(this.video && this.ended)this.video.removeEventListener('ended',this.ended);this.ended=null
    if(this.animationFrameId!==null)cancelAnimationFrame(this.animationFrameId)
    if(this.renderFrameId!==null)cancelAnimationFrame(this.renderFrameId)
    if(this.videoFrameId!==null)this.video?.cancelVideoFrameCallback(this.videoFrameId)
    this.animationFrameId=null;this.renderFrameId=null;this.videoFrameId=null
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=null
    if(this.video){this.video.pause();this.video.srcObject=null;if(this.source==='REAL_VIDEO'){this.video.removeAttribute('src');this.video.load()}}
    this.video=null
    this.canvas?.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height);this.canvas=null
    const hands=this.hands;this.hands=null
    if(hands)try{Promise.resolve(hands.close()).catch(()=>{})}catch{}
  }
}
export const handDetector = new HandDetectorService()
