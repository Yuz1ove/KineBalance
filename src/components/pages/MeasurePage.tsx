import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  Video,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Save,
  HelpCircle,
  Activity,
  Clock,
  ShieldCheck
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { kbpdApi, getQuality, toAnalysisOutput, type HandTrackingFrame, type AnalysisOutput } from '../../services/kbpdApi'
import { analyzeFingerTapping } from '../../../kbpd-core/src/measurement/detector.ts'
import type { MeasurementOutput } from '../../../kbpd-core/src/measurement/contracts.ts'
import { handDetector, type RealtimeKinematics } from '../../services/handDetector'
import { MotionSection } from '../motion/MotionSection'
import { MetricGlassCard } from '../motion/MetricGlassCard'

const cameraMessage=(code:string)=>({
  CAMERA_UNSUPPORTED:'目前瀏覽器或執行環境不支援相機擷取，可改用本機影片或其他瀏覽器。',
  CAMERA_REQUEST_TIMEOUT:'等待相機回應已達 15 秒，已取消本次啟動。這不代表瀏覽器拒絕權限；確認權限後可按重試。',
  PERMISSION_DENIED:'瀏覽器拒絕了相機權限。請確認權限設定後再重試。',DEVICE_NOT_FOUND:'找不到相機設備。',DEVICE_NOT_READABLE:'目前無法讀取相機，請確認是否被其他程式占用。',
  CONSTRAINT_UNSUPPORTED:'設備不支援本次相機設定。',MODEL_LOAD_FAILED:'手部模型載入失敗，請稍後重試。',MODEL_LOAD_TIMEOUT:'手部追蹤引擎載入逾時，已釋放相機。請確認連線後重試。',
  VIDEO_TOO_SHORT:'影片少於 1 秒，資料不足。請選擇較完整的手部開合影片。',VIDEO_DECODE_FAILED:'無法解碼這段影片。請改用瀏覽器支援的 MP4（H.264）或 WebM，再重新選檔。',VIDEO_PLAY_TIMEOUT:'影片尚無法播放，已停止等候。',VIDEO_NO_NEW_FRAMES:'影片沒有提供新影格，已停止本次擷取。',INFERENCE_FAILED:'手部模型推論中斷，請重試。',INFERENCE_TIMEOUT:'手部模型推論等候逾時，已停止擷取。',
  VIDEO_DURATION_LIMIT:'影片需在 30 秒內，且具有可讀取的時長。',CAPTURE_LIMIT:'已達本次擷取上限。'
} as Record<string,string>)[code.split(':')[0]]??'無法完成本次量測，請重新選擇來源後重試。'

interface MeasurePageProps {
  hasIdentity: boolean
  onNavigateToInsights: (measurementId: string) => void
  onRecordSaved: () => void
  onPromptRegister: () => void
}

type MeasureStep = 1 | 2 | 3 | 4

export const MeasurePage: React.FC<MeasurePageProps> = ({
  hasIdentity,
  onNavigateToInsights,
  onRecordSaved,
  onPromptRegister,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [step, setStep] = useState<MeasureStep>(1)
  const [handSide, setHandSide] = useState<'RIGHT' | 'LEFT'>('RIGHT')
  const [inputMode, setInputMode] = useState<'CAMERA' | 'VIDEO'>('CAMERA')

  const [videoFile,setVideoFile]=useState<File|null>(null)
  const replayUrl=useRef<string|null>(null)
  const uiRun=useRef(0)
  const [cameraStage,setCameraStage]=useState('IDLE')
  const source=inputMode==='VIDEO'?'REAL_VIDEO':'CAMERA'
  // Step 3: Live measurement states
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [countdown, setCountdown] = useState(20)
  const [kinematics, setKinematics] = useState<RealtimeKinematics>({
    tapCount: 0,
    currentFrequencyHz: 0,
    normalizedDistance: 0,
    isTracking: false,
  })
  const [rawAnalysis,setRawAnalysis]=useState<MeasurementOutput|null>(null)
  const [isStartingCamera,setIsStartingCamera]=useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Step 4: Results and saving
  const [capturedFrames, setCapturedFrames] = useState<HandTrackingFrame[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisOutput | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedMeasurementId, setSavedMeasurementId] = useState<string | null>(null)
  const pendingMeasurementId = useRef<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const timerRef = useRef<any>(null)

  // Cleanup camera on unmount or tab switch
  useEffect(() => {
    return () => {
      uiRun.current++;handDetector.stopCamera()
      if(replayUrl.current)URL.revokeObjectURL(replayUrl.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Start Camera handler
  const handleStartCamera = async () => {
    pendingMeasurementId.current = null
    setCameraError(null)
    setSaveSuccess(false);setSavedMeasurementId(null);setSaveError(null);setAnalysisResult(null);setRawAnalysis(null)
    if (isStartingCamera) return
    if (!videoRef.current || !canvasRef.current) return

    const run=++uiRun.current
    setIsStartingCamera(true)
    setKinematics({tapCount:0,currentFrequencyHz:0,normalizedDistance:0,isTracking:false})
    try {
      if(inputMode==='VIDEO'){
        if(!videoFile)throw new Error('請先選擇本機影片')
        if(replayUrl.current)URL.revokeObjectURL(replayUrl.current)
        replayUrl.current=URL.createObjectURL(videoFile)
      }
      const started=await handDetector.startCamera(videoRef.current, canvasRef.current, (realtime) => {
        if(run===uiRun.current)setKinematics(realtime)
      },handSide,(message)=>{if(run!==uiRun.current)return;if(message==='CAPTURE_LIMIT'){void handleFinishRecording();return}setCameraError(cameraMessage(message));setKinematics({tapCount:0,currentFrequencyHz:0,normalizedDistance:0,isTracking:false});setIsCameraActive(false);setIsMeasuring(false);if(timerRef.current)clearInterval(timerRef.current)},stage=>{if(run===uiRun.current)setCameraStage(stage)},inputMode==='VIDEO'?{url:replayUrl.current!,onEnded:()=>{if(run===uiRun.current)void handleFinishRecording()}}:undefined)
      if(run!==uiRun.current)return
      setIsCameraActive(started)
      if(started && inputMode==='VIDEO')setIsMeasuring(true)
    } catch (err: any) {
      if(run!==uiRun.current)return
      setCameraError(cameraMessage(err.message || '無法開啟相機，請檢查瀏覽器權限設定。'))
      setIsCameraActive(false)
    } finally { if(run===uiRun.current)setIsStartingCamera(false) }
  }

  // Stop Camera handler
  const handleStopCamera = () => {
    uiRun.current++;setIsStartingCamera(false);setCameraStage('CANCELLED')
    setCameraError(null)
    handDetector.stopCamera()
    setIsCameraActive(false)
    setIsMeasuring(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  // Start 20s recording
  const handleStartRecording = () => {
    if (!kinematics.readyToMeasure) return
    setSaveSuccess(false);setSavedMeasurementId(null);setSaveError(null)
    handDetector.resetRecording()
    setIsMeasuring(true)
    setCountdown(20)

    const deadline=performance.now()+20000
    timerRef.current=setInterval(()=>{const remaining=Math.max(0,Math.ceil((deadline-performance.now())/1000));setCountdown(remaining);if(remaining===0){clearInterval(timerRef.current);void handleFinishRecording()}},200)
  }

  // Finish recording and transition to review
  const handleFinishRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsMeasuring(false)

    let frames = handDetector.getCapturedFrames()
    handDetector.stopCamera()
    setIsCameraActive(false)

    setCapturedFrames(frames)

    const result=analyzeFingerTapping({sessionId:'preview-session',source,handSide,mirrored:false,displayMirrored:inputMode==='CAMERA',
      protocolVersion:'KBPD-FT-IMAGE-2',frames:frames.map(f=>({...f,tracked:f.tracked===true}))})
    setRawAnalysis(result)
    setAnalysisResult(toAnalysisOutput(result))

    setStep(4)
  }, [handSide, inputMode])

  // Save measurement to backend
  const handleSaveMeasurement = async () => {
    if(!capturedFrames.length || !rawAnalysis?.quality.validFrames)return
    if (!hasIdentity) {
      onPromptRegister()
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      if (!pendingMeasurementId.current) {
        const session = await kbpdApi.createSession(handSide, source)
        pendingMeasurementId.current = session.id || (session as any).sessionId
      }
      const sessionId = pendingMeasurementId.current
      if (!sessionId) throw new Error('紀錄服務未建立有效紀錄，請重試。')

      const finalAnalysis = await kbpdApi.saveAnalysis(sessionId, handSide, capturedFrames, source)
      setAnalysisResult(finalAnalysis)
      setSavedMeasurementId(sessionId)
      setSaveSuccess(true)
      onRecordSaved()
    } catch (err: any) {
      setSaveError(err.message || '儲存紀錄時發生錯誤，請稍後重試。')
    } finally {
      setIsSaving(false)
    }
  }

  const stepsList = [
    { num: 1, label: '選擇方式' },
    { num: 2, label: '準備與來源' },
    { num: 3, label: '進行量測' },
    { num: 4, label: '成果與保存' },
  ]

  return (
    <div className="kb-measure-page">
      <p>影像僅在瀏覽器分析；量測紀錄由原有紀錄服務保存。</p>
      {/* Page Header */}
      <MotionSection className="kb-page-header">
        <div className="kb-page-tagline">KineBalance 運動學評估流程</div>
        <h1 className="kb-page-title">手指快速開合量測</h1>
        <p className="kb-page-desc">
          記錄拇指與食指的節奏與開合變化。鏡頭量測 20 秒；影片依實際片長分析，處理時間視裝置效能而定。
        </p>

        {/* Stepper Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 24,
            flexWrap: 'wrap',
          }}
        >
          {stepsList.map((item, idx) => {
            const isActive = step === item.num
            const isCompleted = step > item.num
            return (
              <React.Fragment key={item.num}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 'var(--kb-radius-pill)',
                    background: isActive
                      ? 'var(--kb-primary)'
                      : isCompleted
                      ? 'var(--kb-primary-light)'
                      : 'var(--kb-surface)',
                    color: isActive
                      ? '#fff'
                      : isCompleted
                      ? 'var(--kb-primary)'
                      : 'var(--kb-text-secondary)',
                    border: '1px solid var(--kb-divider)',
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all 0.25s ease',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : isCompleted
                        ? 'var(--kb-primary)'
                        : 'var(--kb-surface-subtle)',
                      color: isCompleted ? '#fff' : 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    {isCompleted ? '✓' : item.num}
                  </span>
                  <span>{item.label}</span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    style={{
                      width: 20,
                      height: 2,
                      background: step > item.num ? 'var(--kb-primary)' : 'var(--kb-divider)',
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </MotionSection>

      {/* STEP 1: Select Measurement Type */}
      {step === 1 && (
        <MotionSection key="step-1" className="kb-card">
          <h2 className="kb-card-title">選擇已實作的量測方式</h2>
          <p className="kb-card-subtitle">提供工程驗證中的量測；真實來源精度尚待獨立驗證</p>

          <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
            <div
              style={{
                border: '2px solid var(--kb-primary)',
                background: 'linear-gradient(135deg, var(--kb-surface) 0%, var(--kb-primary-light) 100%)',
                borderRadius: 'var(--kb-radius-lg)',
                padding: 24,
                boxShadow: 'var(--kb-shadow-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      padding: 10,
                      background: 'var(--kb-primary)',
                      color: '#fff',
                      borderRadius: 10,
                    }}
                  >
                    <Play size={22} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--kb-text-primary)',
                      }}
                    >
                      單手拇指與食指快速開合敲擊測驗 (Finger Tapping)
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: 'var(--kb-text-secondary)',
                        marginTop: 4,
                      }}
                    >
                      21 關鍵點、掌長尺度標準化、遲滯週期偵測與時間缺口防禦
                    </p>
                  </div>
                </div>
                <span className="kb-badge kb-badge-success">正式啟用</span>
              </div>
            </div>

            <div
              style={{
                border: '1px dashed var(--kb-divider)',
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-lg)',
                padding: 24,
                opacity: 0.65,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--kb-text-secondary)',
                    }}
                  >
                    步態分析 / 聲音震顫評估 (Gait & Voice)
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--kb-text-muted)',
                      marginTop: 4,
                    }}
                  >
                    目前核心尚未納入此類別演算法，誠實標示未啟用，不以假測驗充數。
                  </p>
                </div>
                <span className="kb-badge kb-badge-neutral">尚未啟用</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="kb-btn kb-btn-primary"
              onClick={() => setStep(2)}
            >
              <span>下一步：準備事項與影像來源</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </MotionSection>
      )}

      {/* STEP 2: Setup & Input Source */}
      {step === 2 && (
        <MotionSection key="step-2" className="kb-card">
          <h2 className="kb-card-title">確認準備事項與影像來源</h2>
          <p className="kb-card-subtitle">請選擇本次量測的手部與影像來源</p>

          <div style={{ marginTop: 24, display: 'grid', gap: 24 }}>
            {/* Hand Side Selection */}
            <div className="kb-form-group">
              <label className="kb-label">量測側別</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 'var(--kb-radius-md)',
                    border:
                      handSide === 'RIGHT'
                        ? '2px solid var(--kb-primary)'
                        : '1px solid var(--kb-divider)',
                    background:
                      handSide === 'RIGHT' ? 'var(--kb-primary-light)' : 'var(--kb-surface)',
                    color:
                      handSide === 'RIGHT' ? 'var(--kb-primary)' : 'var(--kb-text-primary)',
                    fontWeight: 600,
                    fontSize: 16,
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setHandSide('RIGHT')}
                >
                  右手 (Right Hand)
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 'var(--kb-radius-md)',
                    border:
                      handSide === 'LEFT'
                        ? '2px solid var(--kb-primary)'
                        : '1px solid var(--kb-divider)',
                    background:
                      handSide === 'LEFT' ? 'var(--kb-primary-light)' : 'var(--kb-surface)',
                    color:
                      handSide === 'LEFT' ? 'var(--kb-primary)' : 'var(--kb-text-primary)',
                    fontWeight: 600,
                    fontSize: 16,
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setHandSide('LEFT')}
                >
                  左手 (Left Hand)
                </button>
              </div>
            </div>

            {/* Input Source Selection */}
            <div className="kb-form-group">
              <label className="kb-label">影像來源選項</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    border:
                      inputMode === 'CAMERA'
                        ? '2px solid var(--kb-primary)'
                        : '1px solid var(--kb-divider)',
                    background:
                      inputMode === 'CAMERA' ? 'var(--kb-primary-light)' : 'var(--kb-surface)',
                    padding: 20,
                    borderRadius: 'var(--kb-radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setInputMode('CAMERA')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Camera size={20} color="var(--kb-primary)" />
                    <strong style={{ fontSize: 16 }}>本機鏡頭即時量測</strong>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--kb-text-secondary)',
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    需主動點選授權，不錄製聲音，不進行臉部識別。
                  </p>
                </div>

              </div>
            </div>

            <label className="kb-label">本機手部影片重播（不會上傳影像，10MB／30 秒內）
              <input type="file" accept="video/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024){setVideoFile(null);setCameraError('單檔最多 10MB，請重新選擇影片。');return}setVideoFile(file);setInputMode('VIDEO');setCameraError(null)}} />
              {videoFile && <button type="button" onClick={()=>{setInputMode('VIDEO');setCameraError(null)}}>使用已選影片：{videoFile.name}</button>}
              {cameraError && <p role="alert">{cameraError}</p>}
            </label>
            {/* Preparation Guidance */}
            <div
              style={{
                padding: 20,
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  fontWeight: 650,
                  color: 'var(--kb-text-primary)',
                }}
              >
                <HelpCircle size={18} color="var(--kb-primary)" />
                <span>量測準備建議</span>
              </div>
              <ul
                style={{
                  fontSize: 14,
                  color: 'var(--kb-text-secondary)',
                  marginTop: 10,
                  paddingLeft: 22,
                  lineHeight: 1.7,
                }}
              >
                <li>將手部平穩置於鏡頭中央約 40–60 公分處。</li>
                <li>手掌面向鏡頭，先讓拇指與食指閉合，再反覆張開與閉合。</li>
                <li>盡量維持固定光線與背景，避免大幅度前後位移。</li>
              </ul>
            </div>
          </div>

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              className="kb-btn kb-btn-secondary"
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={18} />
              <span>上一步</span>
            </button>
            <button
              type="button"
              className="kb-btn kb-btn-primary"
              onClick={() => setStep(3)}
            >
              <span>進入量測畫面</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </MotionSection>
      )}

      {/* STEP 3: Live Measurement */}
      {step === 3 && (
        <MotionSection key="step-3" className="kb-card">
          <div className="kb-card-header">
            <div>
              <h2 className="kb-card-title">進行手指開合量測</h2>
              <p className="kb-card-subtitle">
                側別：{handSide === 'RIGHT' ? '右手' : '左手'} · 來源：
                {source}
              </p>
            </div>
            {isMeasuring && inputMode==='CAMERA' && (
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--kb-danger-light)',
                  color: 'var(--kb-danger)',
                  padding: '8px 16px',
                  borderRadius: 'var(--kb-radius-pill)',
                  fontWeight: 700,
                }}
                animate={shouldReduceMotion ? undefined : { scale: [1, 1.03, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--kb-danger)',
                  }}
                />
                <span>量測倒數：{countdown} 秒</span>
              </motion.div>
            )}
          </div>

          {cameraError && (
            <div className="kb-alert kb-alert-danger">
              <AlertTriangle size={20} />
              <div>{cameraError}</div>
            </div>
          )}

          {!cameraError && <p role="status">{({IDLE:'尚未開始',VIDEO_LOADING:'正在解碼影片',PERMISSION_WAITING:'等待相機權限回應（最多等候 15 秒；超時不代表權限拒絕）',STREAM_ACQUIRED:'已取得串流',VIDEO_PLAYABLE:'影片可播放',MODEL_LOADING:'正在載入手部追蹤引擎（首次載入可能需 30 秒）',MODEL_READY:'追蹤引擎已就緒，等待首次分析',FIRST_INFERENCE:'已取得首次推論',TRACKING:'有效追蹤',NO_HAND:'尚未偵測到手',TRACKING_INVALID:'手部資料尚未符合量測條件',CANCELLED:'已取消'} as Record<string,string>)[cameraStage]??cameraMessage(cameraStage)}</p>}
          {inputMode==='VIDEO' && kinematics.progress && <p role="status">分析進度：{Math.min(100,Math.round(kinematics.progress.seconds/kinematics.progress.duration*100))}% · 已分析 {kinematics.progress.processed} 幀 · 影片 {kinematics.progress.seconds.toFixed(1)} / {kinematics.progress.duration.toFixed(1)} 秒。完成時間依裝置效能而定。</p>}
          {isStartingCamera && <button className="kb-btn kb-btn-secondary" onClick={handleStopCamera}>取消啟動</button>}
          {/* Main Video & Canvas Viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 640,
              height: 400,
              margin: '0 auto 24px',
              backgroundColor: '#1C221E',
              borderRadius: 'var(--kb-radius-lg)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: isCameraActive ? 0.95 : 0,
                transform: inputMode==='CAMERA'?'scaleX(-1)':'none',
              }}
            />

            <canvas
              ref={canvasRef}
              width={640}
              height={400}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                transform: inputMode==='CAMERA'?'scaleX(-1)':'none',
              }}
            />

            {!isCameraActive && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#FAF6EE',
                  padding: 24,
                  zIndex: 2,
                }}
              >
                <Activity
                  size={48}
                  style={{ margin: '0 auto 16px', opacity: 0.8, color: '#A4B8A6' }}
                />
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  {inputMode === 'CAMERA' ? '鏡頭尚未啟動' : '準備分析本機影片'}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: '#D0D8D1',
                    maxWidth: 380,
                    margin: '0 auto 20px',
                    lineHeight: 1.55,
                  }}
                >
                  {inputMode === 'CAMERA'
                    ? '請點擊下方按鈕啟動視訊鏡頭，系統將在您的瀏覽器本機端執行 MediaPipe 關節追蹤。'
                    : '逐幀解碼並以原有手部模型分析，影像不會上傳。影片時間走完即完成，慢速裝置可能超過 20 秒。'}
                </p>

                <button type="button" className="kb-btn kb-btn-primary" disabled={isStartingCamera || (inputMode==='VIDEO'&&!videoFile)} onClick={handleStartCamera}>
                  <Camera size={18} /><span>{isStartingCamera?'正在準備…':inputMode==='VIDEO'?'開始影片分析':cameraError?'重試鏡頭預覽':'啟用鏡頭預覽'}</span>
                </button>
                {isStartingCamera && <button type="button" onClick={handleStopCamera}>取消啟動</button>}
              </div>
            )}
          </div>

          {/* Real-time Kinematic Indicators */}
          {isCameraActive && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>
                  暫時計數（完成後確認）
                </span>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--kb-text-primary)',
                  }}
                >
                  {kinematics.tapCount}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400 }}>次</span>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>即時頻率</span>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--kb-text-primary)',
                  }}
                >
                  {kinematics.isTracking?kinematics.currentFrequencyHz:'—'}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400 }}>Hz</span>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>開合幅度</span>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--kb-text-primary)',
                  }}
                >
                  {kinematics.isTracking ? kinematics.normalizedDistance.toFixed(3) : '—'}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400 }}>x掌長</span>
                </div>
              </div>
            </div>
          )}

          {isCameraActive && <p role="status">{kinematics.readyToMeasure ? '鏡頭與手部追蹤已就緒' : `等待完整手部與所選側別：${kinematics.validity || 'REACQUIRING'}`}</p>}
          {isCameraActive && kinematics.performance && <details><summary>影格與推論效能</summary><p>
            觀察到的影片影格 {kinematics.performance.cameraFps?.toFixed(1) ?? 'UNKNOWN'} FPS ·
            推論 {kinematics.performance.inferenceFps?.toFixed(1) ?? 'UNKNOWN'} FPS ·
            Canvas 疊圖更新 {kinematics.performance.renderFps?.toFixed(1) ?? 'UNKNOWN'} FPS ·
            推論延遲 {kinematics.performance.inferenceLatencyMs?.toFixed(1) ?? 'UNKNOWN'} ms ·
            未送推論影格 {kinematics.performance.skippedPresentedFrames ?? 'UNKNOWN'} ·
            重複影格攔截 {kinematics.performance.duplicateFramesSkipped} ·
            影片尺寸 {kinematics.performance.width??'UNKNOWN'} × {kinematics.performance.height??'UNKNOWN'} ·
            請求 FPS {kinematics.performance.requestedFps??'UNKNOWN'} · track settings FPS {kinematics.performance.cameraSettingsFps??'UNKNOWN'} · 硬體 FPS UNKNOWN ·
            有效比例 {kinematics.performance.validRatio??'UNKNOWN'} · 缺口 {kinematics.performance.gaps} · 失追 {kinematics.performance.losses} · 重取得 {kinematics.performance.reacquisitions} ·
            {kinematics.performance.source} · {kinematics.performance.algorithmVersion}
          </p></details>}
          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="kb-btn kb-btn-secondary"
              onClick={() => {
                handleStopCamera()
                setStep(2)
              }}
            >
              <ArrowLeft size={18} />
              <span>返回調整準備</span>
            </button>

            <div style={{ display: 'flex', gap: 12 }}>
              {inputMode==='CAMERA' && isCameraActive && !isMeasuring && (
                <button
                  type="button"
                  className="kb-btn kb-btn-primary"
                  disabled={!kinematics.readyToMeasure}
                  onClick={handleStartRecording}
                >
                  <Play size={18} />
                  <span>開始 20 秒量測</span>
                </button>
              )}

              {isMeasuring && (
                <button
                  type="button"
                  className="kb-btn kb-btn-danger"
                  onClick={handleFinishRecording}
                >
                  <Square size={18} />
                  <span>提早結束並計算</span>
                </button>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  className="kb-btn kb-btn-ghost"
                  onClick={handleStopCamera}
                >
                  關閉鏡頭
                </button>
              )}
            </div>
          </div>
        </MotionSection>
      )}

      {/* STEP 4: Results & Save */}
      {step === 4 && analysisResult && (
        <MotionSection key="step-4" className="kb-card">
          <div className="kb-card-header">
            <div>
              <span className="kb-badge kb-badge-accent" style={{ marginBottom: 6 }}>
                本次量測結束
              </span>
              <h2 className="kb-card-title">本次量測結果與品質確認</h2><p>資料來源：{source}</p>
              <p className="kb-card-subtitle">
                側別：{handSide === 'RIGHT' ? '右手' : '左手'} · 採集影格：
                {capturedFrames.length} 幀
              </p>
            </div>

            <div>
              {(() => {
                const quality = getQuality(analysisResult)
                return quality.status === 'QUALIFIED' ? (
                  <span className="kb-badge kb-badge-success">
                    <CheckCircle2 size={14} /> 資料品質合格
                  </span>
                ) : (
                  <span className="kb-badge kb-badge-warning">
                    <AlertTriangle size={14} /> 品質受限：請參閱量測限制
                  </span>
                )
              })()}
            </div>
          </div>

          {getQuality(analysisResult).trackedFrames===0 && <p role="alert">沒有有效手部量測資料，無法產生可用結果或保存。請確認側別、光線及完整手部是否入鏡後重試。</p>}
          {rawAnalysis?.quality.unreliabilityReasons.includes('LOW_EXCURSION_UNCERTAIN') && <p>部分開合幅度不足以可靠確認週期，本次數值僅供動作紀錄參考，不能視為正常或異常判定。</p>}
          {/* Results Summary Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <MetricGlassCard
              label="有效開合次數"
              value={getQuality(analysisResult).trackedFrames>0?analysisResult.metrics.validTapCount:null}
              unit="次"
              subtext="本次有效完整開合週期"
              icon={Activity}
              delay={0.05}
            />
            <MetricGlassCard
              label="平均開合頻率"
              value={analysisResult.metrics.averageFrequencyHz}
              unit="Hz"
              subtext="指尖快速閉合頻率"
              icon={Clock}
              status="accent"
              delay={0.1}
            />
            <MetricGlassCard
              label="週期間隔變異 (CV)"
              value={
                analysisResult.metrics.intervalVariabilityCv !== null
                  ? Number((analysisResult.metrics.intervalVariabilityCv * 100).toFixed(1))
                  : null
              }
              unit="%"
              subtext="節奏穩定度係數"
              icon={Sparkles}
              status="accent"
              delay={0.15}
            />
            <MetricGlassCard
              label="振幅衰減比率"
              value={
                analysisResult.metrics.amplitudeDecayRatio !== null
                  ? Number((analysisResult.metrics.amplitudeDecayRatio * 100).toFixed(1))
                  : null
              }
              unit="%"
              subtext="後段相較前段動作幅度變化"
              icon={RotateCcw}
              delay={0.2}
            />
          </div>

          {/* Quality & Traceability Notes */}
          {(() => {
            const quality = getQuality(analysisResult)
            return (
              <div
                style={{
                  padding: 18,
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                  marginBottom: 24,
                  fontSize: 14,
                  color: 'var(--kb-text-secondary)',
                }}
              >
                <strong style={{ color: 'var(--kb-text-primary)' }}>
                  運動學特徵計算細節：
                </strong>
                <div
                  style={{
                    marginTop: 8,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 8,
                  }}
                >
                  <div>演算法：{analysisResult.algorithmVersion}</div>
                  <div>
                    有效追蹤比例：{(quality.effectiveTrackingRatio * 100).toFixed(1)}%
                  </div>
                  <div>時間缺口 (&gt;400ms)：{quality.timeGapsCount} 處</div>
                  <div>追蹤中斷段落：{quality.trackingLostCount} 處</div>
                </div>
              </div>
            )
          })()}

          {rawAnalysis?.trace && <details><summary>查看原始相對幅度與事件（未平滑）</summary>
            <p>2D 指尖距離／掌長；缺口不連線，保留未平滑的原始曲線。</p>
            <svg role="img" aria-label="原始相對幅度曲線" viewBox="0 0 600 150" style={{width:'100%',maxHeight:150}}>
              {rawAnalysis.trace.frames.map((f,i,all)=>{const prev=all[i-1];const tmax=Math.max(1,all.at(-1)?.timestampMs??1);const ymax=Math.max(1,...all.map(p=>p.normalizedDistance));
                return prev?.valid && f.valid && f.timestampMs-prev.timestampMs<=400 ? <line key={i} x1={prev.timestampMs/tmax*600} y1={145-prev.normalizedDistance/ymax*140} x2={f.timestampMs/tmax*600} y2={145-f.normalizedDistance/ymax*140} stroke="currentColor"/> : null})}
            </svg></details>}
          {/* Save Status & Action */}
          {saveError && (
            <div className="kb-alert kb-alert-danger">
              <AlertTriangle size={18} />
              <div>{saveError}</div>
            </div>
          )}

          {saveSuccess && (
            <div className="kb-alert kb-alert-success">
              <CheckCircle2 size={18} />
              <div>
                <strong>本次紀錄已成功保存！</strong>
                <p style={{ fontSize: 13, marginTop: 4 }}>
                  已妥善儲存運動學特徵與時序，您隨時可以在「紀錄與趨勢」重新查看。
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              borderTop: '1px solid var(--kb-divider)',
              paddingTop: 20,
            }}
          >
            <button
              type="button"
              className="kb-btn kb-btn-secondary"
              disabled={isSaving}
              onClick={() => {
                setSaveSuccess(false)
                setStep(2)
              }}
            >
              <RotateCcw size={16} />
              <span>重新量測</span>
            </button>

            <div style={{ display: 'flex', gap: 12 }}>
              {!saveSuccess ? (
                <button
                  type="button"
                  className="kb-btn kb-btn-primary"
                  disabled={isSaving || !rawAnalysis?.quality.validFrames}
                  onClick={handleSaveMeasurement}
                >
                  <Save size={18} />
                  <span>{isSaving ? '正在保存紀錄…' : '保存這次紀錄'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="kb-btn kb-btn-accent"
                  onClick={() => savedMeasurementId && onNavigateToInsights(savedMeasurementId)}
                >
                  <Sparkles size={18} />
                  <span>查看 ARCI 解讀</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </MotionSection>
      )}
    </div>
  )
}
export default MeasurePage
