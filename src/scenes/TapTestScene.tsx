import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BellRing,
  Check,
  CircleAlert,
  Gauge,
  Info,
  Play,
  RotateCcw,
  Timer,
  Zap
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'
import { AnalysisPanel } from '../kbpd/AnalysisPanel'
import { developerSubjectId } from '../kbpd/client'
import type { InputModality, MotionEvent, MotionInput } from '../kbpd/contracts'
import {
  calculateTapMetrics,
  DEMO_INTERVALS,
  evaluateTestAssistance
} from '../lib/tapMetrics'

type Mode = 'standard' | 'demo'
type TestState = 'ready' | 'countdown' | 'running' | 'complete'
type Side = 'left' | 'right'

const ORIENTATION_GATE_CHANGE_EVENT = 'kinebalance:orientation-gate-change'

interface OrientationGateChangeDetail {
  active: boolean
}

interface TapTestSceneProps {
  onNext: () => void
  active?: boolean
  workspace?: { subjectId: string; dataset: 'DEMO' | 'CAPTURE'; renderResult: (session: MotionInput | null) => ReactNode; onActivity: (active: boolean) => void }
}

export function TapTestScene({ onNext, active = true, workspace }: TapTestSceneProps) {
  const initialOrientationPaused =
    document.documentElement.dataset.orientationGateActive === 'true'
  const [mode, setMode] = useState<Mode>(workspace?.dataset === 'CAPTURE' ? 'standard' : 'demo')
  const [testState, setTestState] = useState<TestState>('ready')
  const [countdown, setCountdown] = useState(3)
  const [remainingMs, setRemainingMs] = useState(workspace?.dataset === 'CAPTURE' ? 20000 : 6000)
  const [tapTimes, setTapTimes] = useState<number[]>([])
  const [expectedSide, setExpectedSide] = useState<Side>('left')
  const [invalidTaps, setInvalidTaps] = useState(0)
  const [interrupted, setInterrupted] = useState(false)
  const [completedElapsedMs, setCompletedElapsedMs] = useState(0)
  const [flashSide, setFlashSide] = useState<Side | null>(null)
  const [consecutiveAlternationFailures, setConsecutiveAlternationFailures] = useState(0)
  const [assistanceRequested, setAssistanceRequested] = useState(false)
  const [orientationPaused, setOrientationPaused] = useState(initialOrientationPaused)
  const startTime = useRef(0)
  const demoIndex = useRef(0)
  const completionRecorded = useRef(false)
  const testStateRef = useRef<TestState>('ready')
  const activeRef = useRef(active)
  const expectedSideRef = useRef<Side>('left')
  const orientationPausedRef = useRef(initialOrientationPaused)
  const pausedAt = useRef<number | null>(null)
  const accumulatedPausedMs = useRef(0)
  const flashTimeout = useRef<number | null>(null)
  const [captureId, setCaptureId] = useState(() => crypto.randomUUID())
  const rawEvents = useRef<MotionEvent[]>([])
  const captureStartedAt = useRef('')
  const captureEndedAt = useRef('')
  const captureSubject = useRef('')
  const captureDevice = useRef('browser-input-v1')

  const duration = mode === 'demo' ? 6000 : 20000
  useEffect(() => { workspace?.onActivity(testState === 'running' || testState === 'countdown'); return () => workspace?.onActivity(false) }, [testState, workspace?.onActivity])
  const runtimePaused = !active || orientationPaused

  const intervals = useMemo(
    () => tapTimes.slice(1).map((time, index) => time - tapTimes[index]),
    [tapTimes]
  )
  const elapsed =
    testState === 'complete' ? completedElapsedMs : Math.max(0, duration - remainingMs)
  const metrics = calculateTapMetrics(intervals, elapsed, invalidTaps, {
    expectedDurationMs: duration,
    interrupted,
    personalRateRange: mode === 'demo' ? [0.8, 4] : undefined,
    tapCount: tapTimes.length
  })
  const alternationFailed = metrics.validity.reasons.includes('左右交替錯誤過多')
  const assistance = evaluateTestAssistance({
    consecutiveAlternationFailures,
    assistanceRequested
  })

  testStateRef.current = testState
  activeRef.current = active

  const getActiveElapsed = useCallback((now = performance.now()) => {
    const currentPauseMs = pausedAt.current === null ? 0 : now - pausedAt.current
    return Math.max(
      0,
      now - startTime.current - accumulatedPausedMs.current - currentPauseMs
    )
  }, [])

  const syncRuntimePause = useCallback((now = performance.now()) => {
    if (testStateRef.current !== 'running') {
      pausedAt.current = null
      return
    }

    const shouldPause = !activeRef.current || orientationPausedRef.current
    if (shouldPause && pausedAt.current === null) {
      pausedAt.current = now
    } else if (!shouldPause && pausedAt.current !== null) {
      accumulatedPausedMs.current += now - pausedAt.current
      pausedAt.current = null
    }
  }, [])

  const showTapFlash = useCallback((side: Side) => {
    if (flashTimeout.current !== null) window.clearTimeout(flashTimeout.current)
    setFlashSide(side)
    flashTimeout.current = window.setTimeout(() => {
      setFlashSide(null)
      flashTimeout.current = null
    }, 110)
  }, [])

  const reset = useCallback((nextMode = mode, clearAssistanceHistory = false) => {
    setMode(nextMode)
    setTestState('ready')
    setCountdown(3)
    setRemainingMs(nextMode === 'demo' ? 6000 : 20000)
    setTapTimes([])
    expectedSideRef.current = 'left'
    setExpectedSide('left')
    setInvalidTaps(0)
    setInterrupted(false)
    setCompletedElapsedMs(0)
    setFlashSide(null)
    setAssistanceRequested(false)
    if (clearAssistanceHistory) setConsecutiveAlternationFailures(0)
    testStateRef.current = 'ready'
    completionRecorded.current = false
    demoIndex.current = 0
    rawEvents.current = []
    captureStartedAt.current = ''
    captureEndedAt.current = ''
    captureSubject.current = ''
    setCaptureId(crypto.randomUUID())
    accumulatedPausedMs.current = 0
    pausedAt.current = null
    if (flashTimeout.current !== null) {
      window.clearTimeout(flashTimeout.current)
      flashTimeout.current = null
    }
  }, [mode])

  const registerTap = useCallback((side: Side, modality: InputModality) => {
    if (
      testStateRef.current !== 'running' ||
      mode === 'demo' ||
      !activeRef.current ||
      orientationPausedRef.current
    ) return
    const relativeTimeMs = getActiveElapsed()
    // Preserve every original attempt before the legacy display rejects an
    // incorrect side. The analysis owns its own cleaning and event audit.
    rawEvents.current.push({ eventId: crypto.randomUUID(), relativeTimeMs, side, modality })
    if (side !== expectedSideRef.current) {
      setInvalidTaps((value) => value + 1)
      return
    }
    const nextExpectedSide = side === 'left' ? 'right' : 'left'
    expectedSideRef.current = nextExpectedSide
    setTapTimes((times) => [...times, relativeTimeMs])
    setExpectedSide(nextExpectedSide)
    showTapFlash(side)
  }, [getActiveElapsed, mode, showTapFlash])

  useEffect(() => {
    const handleOrientationGateChange = (event: Event) => {
      const detail = (event as CustomEvent<OrientationGateChangeDetail>).detail
      if (typeof detail?.active !== 'boolean' || detail.active === orientationPausedRef.current) {
        return
      }

      const now = performance.now()
      orientationPausedRef.current = detail.active
      syncRuntimePause(now)

      if (detail.active) {
        if (flashTimeout.current !== null) {
          window.clearTimeout(flashTimeout.current)
          flashTimeout.current = null
        }
        setFlashSide(null)
      }

      setOrientationPaused(detail.active)
    }

    window.addEventListener(ORIENTATION_GATE_CHANGE_EVENT, handleOrientationGateChange)
    return () => {
      window.removeEventListener(ORIENTATION_GATE_CHANGE_EVENT, handleOrientationGateChange)
    }
  }, [syncRuntimePause])

  useEffect(() => {
    syncRuntimePause()
    if (!active) {
      if (flashTimeout.current !== null) {
        window.clearTimeout(flashTimeout.current)
        flashTimeout.current = null
      }
      setFlashSide(null)
    }
  }, [active, syncRuntimePause])

  useEffect(() => () => {
    if (flashTimeout.current !== null) window.clearTimeout(flashTimeout.current)
  }, [])

  useEffect(() => {
    if (testState !== 'countdown' || runtimePaused) return
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (!activeRef.current || orientationPausedRef.current) return value
        if (value <= 1) {
          window.clearInterval(timer)
          startTime.current = performance.now()
          captureStartedAt.current = new Date().toISOString()
          captureSubject.current = workspace?.subjectId ?? (mode === 'demo' ? 'synthetic-demo' : developerSubjectId())
          accumulatedPausedMs.current = 0
          pausedAt.current = null
          testStateRef.current = 'running'
          setTestState('running')
          return 0
        }
        return value - 1
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [mode, runtimePaused, testState])

  useEffect(() => {
    if (testState !== 'running' || runtimePaused) return
    const ticker = window.setInterval(() => {
      if (!activeRef.current || orientationPausedRef.current) return
      const elapsedNow = getActiveElapsed()
      const nextRemaining = Math.max(0, duration - elapsedNow)
      setRemainingMs(nextRemaining)
      if (nextRemaining === 0) {
        window.clearInterval(ticker)
        captureEndedAt.current = new Date().toISOString()
        setCompletedElapsedMs(duration)
        testStateRef.current = 'complete'
        setTestState('complete')
      }
    }, 50)
    return () => window.clearInterval(ticker)
  }, [duration, getActiveElapsed, runtimePaused, testState])

  useEffect(() => {
    if (testState !== 'complete' || completionRecorded.current) return
    completionRecorded.current = true
    setConsecutiveAlternationFailures((count) => alternationFailed ? count + 1 : 0)
  }, [alternationFailed, testState])

  useEffect(() => {
    if (testState !== 'running' || mode !== 'demo' || runtimePaused) return
    const timers: number[] = []
    const schedule: Array<{ elapsedMs: number; side: Side }> = [
      { elapsedMs: 180, side: 'left' }
    ]
    let accumulated = 180
    DEMO_INTERVALS.forEach((interval, index) => {
      accumulated += interval
      schedule.push({
        elapsedMs: accumulated,
        side: index % 2 === 0 ? 'right' : 'left'
      })
    })

    const elapsedAtSchedule = getActiveElapsed()
    // The final scheduled tap lands just before the six-second boundary. Keep
    // the deterministic sequence intact even when the browser timer wakes a
    // few milliseconds late near completion.
    schedule.slice(demoIndex.current).forEach(({ elapsedMs, side }, offset) => {
      const index = demoIndex.current + offset
      const delay = Math.max(0, elapsedMs - elapsedAtSchedule)
      timers.push(window.setTimeout(() => {
        if (
          !activeRef.current ||
          orientationPausedRef.current ||
          testStateRef.current !== 'running'
        ) return
        demoIndex.current = Math.max(demoIndex.current, index + 1)
        const nextExpectedSide = side === 'left' ? 'right' : 'left'
        expectedSideRef.current = nextExpectedSide
        rawEvents.current.push({ eventId: crypto.randomUUID(), relativeTimeMs: elapsedMs, side, modality: 'SYNTHETIC' })
        setTapTimes((times) => [...times, elapsedMs])
        setExpectedSide(nextExpectedSide)
        showTapFlash(side)
      }, delay))
    })
    return () => timers.forEach(window.clearTimeout)
  }, [getActiveElapsed, mode, runtimePaused, showTapFlash, testState])

  useEffect(() => {
    if (!active) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f') registerTap('left', 'KEYBOARD')
      if (event.key.toLowerCase() === 'j') registerTap('right', 'KEYBOARD')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, registerTap])

  const start = () => {
    if (!activeRef.current || orientationPausedRef.current) return
    completionRecorded.current = false
    if (workspace) {
      const pads = Array.from(document.querySelectorAll('.w-measurement .tap-pad')).map(p => p.getBoundingClientRect())
      captureDevice.current = `browser-ws1-${window.innerWidth}x${window.innerHeight}-dpr${window.devicePixelRatio}-pad${Math.round(pads[0]?.width??0)}x${Math.round(pads[0]?.height??0)}-gap${Math.round((pads[1]?.left??0)-(pads[0]?.right??0))}`
    }
    setAssistanceRequested(false)
    setCountdown(3)
    testStateRef.current = 'countdown'
    setTestState('countdown')
  }

  const interruptTest = () => {
    if (!activeRef.current || orientationPausedRef.current) return
    setInterrupted(true)
    captureEndedAt.current = new Date().toISOString()
    setCompletedElapsedMs(Math.min(duration, getActiveElapsed()))
    testStateRef.current = 'complete'
    setTestState('complete')
  }

  useEffect(() => {
    if (!workspace) return
    const changed = () => {
      if (testStateRef.current !== 'running') return
      setInterrupted(true)
      captureEndedAt.current = new Date().toISOString()
      setCompletedElapsedMs(Math.min(duration, getActiveElapsed()))
      testStateRef.current = 'complete'
      setTestState('complete')
    }
    const hidden = () => { if (document.visibilityState === 'hidden') changed() }
    window.addEventListener('resize', changed)
    document.addEventListener('visibilitychange', hidden)
    return () => {window.removeEventListener('resize',changed);document.removeEventListener('visibilitychange',hidden)}
  }, [!!workspace, duration, getActiveElapsed])

  const completeInputInsufficient = testState === 'complete' && tapTimes.length < 3
  const qualityExplanation =
    completeInputInsufficient
      ? '本次有效輸入少於 3 次，輸入資料不足；無法完成動作特徵分析，也不納入個人參考。本次結果不影響依醫囑用藥。'
      : metrics.quality === '資料品質不足'
      ? alternationFailed
        ? '左右交替錯誤過多，本次不納入動作趨勢；請依下方照護協助分流處理。'
        : `${metrics.validity.reasons.join('、')}。建議重測；本次不納入趨勢，也不影響原處方。`
      : metrics.speedRange === '低於個人近期範圍'
        ? '測試有效，但本次速度低於個人近期範圍。'
        : mode === 'standard'
          ? '本次操作通過既有時間與交替檢核；個人參考資料不足，尚未比較。'
          : '模擬測試有效；固定展示範圍只供概念演示。'

  const capturedModalities = new Set(rawEvents.current.map((event) => event.modality))
  const capturedSession: MotionInput | null = testState === 'complete' && captureStartedAt.current ? {
    schemaVersion: 'KBPD-MOTION-1',
    sessionId: captureId,
    subjectId: captureSubject.current,
    origin: mode === 'demo' ? 'SYNTHETIC' : 'DEVELOPER_CAPTURE',
    clinicalUse: false,
    hand: 'BOTH',
    device: captureDevice.current,
    modality: capturedModalities.size > 1 ? 'MIXED' : rawEvents.current[0]?.modality ?? (mode === 'demo' ? 'SYNTHETIC' : 'UNKNOWN'),
    protocolVersion: mode === 'demo' ? 'alternating-two-hand/demo6/v1' : workspace ? 'alternating-two-hand/standard20/workspace1' : 'alternating-two-hand/standard20/v1',
    startedAt: captureStartedAt.current,
    endedAt: captureEndedAt.current,
    elapsedMs: completedElapsedMs,
    expectedDurationMs: duration,
    status: interrupted ? 'INTERRUPTED' : 'COMPLETED',
    rawEvents: rawEvents.current.map((event) => ({ ...event }))
  } : null

  return (
    <SceneShell
      eyebrow={workspace ? "MEASUREMENT / 左右交替操作" : "場景 02 · 服藥前評估"}
      title={workspace ? "留下這次操作的原始紀錄" : "服藥前，留下 20 秒動作快照"}
      description="左右交替點擊。系統分開記錄測試有效性與動作特徵，不診斷疾病狀態，也不阻擋或延誤依醫囑用藥。"
      aside={workspace ? undefined :
        <div className="mode-switch" aria-label="測試模式">
          <button
            className={mode === 'demo' ? 'active' : ''}
            onClick={() => reset('demo', true)}
          >
            快速展示 · 6 秒
          </button>
          <button
            className={mode === 'standard' ? 'active' : ''}
            onClick={() => reset('standard', true)}
          >
            標準測試 · 20 秒
          </button>
        </div>
      }
    >
      <div className="tap-layout">
        <section className="tap-stage">
          <div className="test-header">
            <div className="timer-block">
              <Timer />
              <span>
                <small>剩餘時間</small>
                <strong>{(remainingMs / 1000).toFixed(1)} 秒</strong>
              </span>
            </div>
            {testState === 'running' ? (
              <StatusPill tone="blue" icon="loading">蒐集中</StatusPill>
            ) : testState === 'complete' ? (
              <StatusPill
                tone={!completeInputInsufficient && metrics.quality === '測試有效' ? 'teal' : 'amber'}
                icon={!completeInputInsufficient && metrics.quality === '測試有效' ? 'success' : 'alert'}
              >
                {completeInputInsufficient ? '輸入資料不足' : metrics.quality}
              </StatusPill>
            ) : (
              <StatusPill>準備就緒</StatusPill>
            )}
          </div>

          <div className="progress-track" aria-hidden="true">
            <span style={{ transform: `scaleX(${1 - remainingMs / duration})` }} />
          </div>

          <div className="test-actions">
            {testState === 'ready' ? (
              <button className="primary-button large" onClick={start}>
                <Play /> {mode === 'demo' ? '播放可重現模擬' : '開始 20 秒測試'}
              </button>
            ) : testState === 'complete' ? (
              <>
                <button className="secondary-button" onClick={() => reset(mode, false)}>
                  <RotateCcw /> 重新測試
                </button>
                <button className="primary-button" onClick={onNext}>
                  {workspace ? '查看個案總覽' : '前往發藥核對'} <ArrowRight />
                </button>
              </>
            ) : (
              <>
                <p aria-live="polite">
                  {mode === 'demo' ? '正在播放固定節奏的概念展示…' : `下一次：${expectedSide === 'left' ? '左側' : '右側'}`}
                </p>
                {mode === 'standard' ? (
                  <button className="text-button interrupt-button" onClick={interruptTest}>
                    中止測試
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div className={`tap-controls state-${testState}`}>
            {testState === 'countdown' ? (
              <div className="countdown-overlay" aria-live="assertive">
                <strong>{countdown}</strong>
                <span>準備雙手</span>
              </div>
            ) : null}
            {testState === 'ready' ? (
              <div className="tap-instruction">
                <span className="gesture-mark">L</span>
                <div className="gesture-line" />
                <span className="gesture-mark">R</span>
                <p>從左側開始，依亮起順序交替點擊</p>
              </div>
            ) : null}
            <button
              className={`tap-pad left ${expectedSide === 'left' && testState === 'running' ? 'expected' : ''} ${flashSide === 'left' ? 'pressed' : ''}`}
              onPointerDown={() => registerTap('left', 'POINTER')}
              disabled={testState !== 'running' || mode === 'demo' || runtimePaused}
              aria-label="左側點擊區，可按 F 鍵"
            >
              <span>左</span>
              <small>F 鍵</small>
            </button>
            <button
              className={`tap-pad right ${expectedSide === 'right' && testState === 'running' ? 'expected' : ''} ${flashSide === 'right' ? 'pressed' : ''}`}
              onPointerDown={() => registerTap('right', 'POINTER')}
              disabled={testState !== 'running' || mode === 'demo' || runtimePaused}
              aria-label="右側點擊區，可按 J 鍵"
            >
              <span>右</span>
              <small>J 鍵</small>
            </button>
          </div>
        </section>

        <aside className="metrics-panel" aria-live="polite">
          <header>
            <span><Gauge /> 即時計算</span>
            <small>{mode === 'demo' ? 'SYNTHETIC · 固定合成展示' : 'DEVELOPER_CAPTURE · 開發者操作'}</small>
          </header>
          <div className="metric-grid">
            <Metric label="有效點擊" value={`${metrics.count}`} unit="次" />
            <Metric label="每秒速度" value={metrics.rate.toFixed(1)} unit="次／秒" />
            <Metric
              label="間隔變異"
              value={metrics.variability === null ? '樣本不足' : metrics.variability.toFixed(1)}
              unit={metrics.variability === null ? '' : '%'}
              unavailable={metrics.variability === null}
            />
            <Metric
              label="速度遞減"
              value={metrics.fatigue === null ? '樣本不足' : metrics.fatigue.toFixed(1)}
              unit={metrics.fatigue === null ? '' : '%'}
              unavailable={metrics.fatigue === null}
            />
            <Metric
              label="交替錯誤"
              value={metrics.validity.alternationErrorRate.toFixed(1)}
              unit="%"
            />
          </div>
          <div className={`quality-card ${completeInputInsufficient || metrics.quality === '資料品質不足' ? 'warning' : ''}`}>
            {testState === 'complete' && !completeInputInsufficient && metrics.quality === '測試有效'
              ? <Check />
              : completeInputInsufficient || metrics.quality === '資料品質不足'
                ? <CircleAlert />
                : <Zap />}
            <div>
              <small>測試有效性</small>
              <strong>
                {testState === 'ready'
                  ? '等待測試'
                  : testState === 'complete'
                    ? completeInputInsufficient
                      ? '輸入資料不足'
                      : metrics.speedRange === '低於個人近期範圍'
                      ? '動作速度偏低'
                      : metrics.quality
                    : metrics.quality}
              </strong>
              <p>
                {testState === 'complete'
                  ? qualityExplanation
                  : '依完成時間、交替錯誤、中斷與輸入遺失檢核；不以點擊次數判定有效性。'}
              </p>
            </div>
          </div>
          {testState === 'complete' && alternationFailed ? (
            <div
              className={`tap-assistance-card ${assistance.notifyCaregiver ? 'notified' : ''}`}
              aria-live="polite"
            >
              <BellRing />
              <div>
                <small>照護協助分流（本機展示，未傳送通知）</small>
                <strong>{assistance.headline}</strong>
                <p>
                  {assistance.notifyCaregiver
                    ? assistance.guidance
                    : `第 ${consecutiveAlternationFailures} 次交替操作失敗；再次發生或本人求助時通知家屬。`}
                </p>
              </div>
              {!assistance.notifyCaregiver ? (
                <button
                  className="secondary-button"
                  onClick={() => setAssistanceRequested(true)}
                >
                  <BellRing /> 請家屬協助
                </button>
              ) : null}
            </div>
          ) : null}
          {testState === 'complete' ? (
            <div className="medication-safety-note">
              <Check />
              <p>
                <strong>本次結果不影響依醫囑用藥。</strong>
                AI 不會更改藥物、劑量或服藥時間。
              </p>
            </div>
          ) : null}
          <p className="metric-note">
            <Info />{mode === 'demo' ? '固定節奏與比較範圍均為模擬展示，不能當作個人基線。' : '目前為開發者動作擷取；需保存分析後檢視樣本品質與參考條件。'}不是診斷或臨床量表替代品。
          </p>
        </aside>
      </div>
      {workspace ? workspace.renderResult(capturedSession) : <AnalysisPanel key={captureId} session={capturedSession} />}
    </SceneShell>
  )
}

function Metric({
  label,
  value,
  unit,
  unavailable = false
}: {
  label: string
  value: string
  unit: string
  unavailable?: boolean
}) {
  return (
    <div className={`metric ${unavailable ? 'unavailable' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  )
}
