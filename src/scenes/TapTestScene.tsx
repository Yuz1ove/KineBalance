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
import {
  calculateTapMetrics,
  DEMO_INTERVALS,
  evaluateTestAssistance
} from '../lib/tapMetrics'

type Mode = 'standard' | 'demo'
type TestState = 'ready' | 'countdown' | 'running' | 'complete'
type Side = 'left' | 'right'

interface TapTestSceneProps {
  onNext: () => void
}

export function TapTestScene({ onNext }: TapTestSceneProps) {
  const [mode, setMode] = useState<Mode>('demo')
  const [testState, setTestState] = useState<TestState>('ready')
  const [countdown, setCountdown] = useState(3)
  const [remainingMs, setRemainingMs] = useState(6000)
  const [tapTimes, setTapTimes] = useState<number[]>([])
  const [expectedSide, setExpectedSide] = useState<Side>('left')
  const [invalidTaps, setInvalidTaps] = useState(0)
  const [interrupted, setInterrupted] = useState(false)
  const [completedElapsedMs, setCompletedElapsedMs] = useState(0)
  const [flashSide, setFlashSide] = useState<Side | null>(null)
  const [consecutiveAlternationFailures, setConsecutiveAlternationFailures] = useState(0)
  const [assistanceRequested, setAssistanceRequested] = useState(false)
  const startTime = useRef(0)
  const demoIndex = useRef(0)
  const demoElapsed = useRef(0)
  const completionRecorded = useRef(false)

  const duration = mode === 'demo' ? 6000 : 20000

  const intervals = useMemo(
    () => tapTimes.slice(1).map((time, index) => time - tapTimes[index]),
    [tapTimes]
  )
  const elapsed =
    testState === 'complete' ? completedElapsedMs : Math.max(0, duration - remainingMs)
  const metrics = calculateTapMetrics(intervals, elapsed, invalidTaps, {
    expectedDurationMs: duration,
    interrupted,
    personalRateRange: [0.8, 4]
  })
  const alternationFailed = metrics.validity.reasons.includes('左右交替錯誤過多')
  const assistance = evaluateTestAssistance({
    consecutiveAlternationFailures,
    assistanceRequested
  })

  const reset = useCallback((nextMode = mode, clearAssistanceHistory = false) => {
    setMode(nextMode)
    setTestState('ready')
    setCountdown(3)
    setRemainingMs(nextMode === 'demo' ? 6000 : 20000)
    setTapTimes([])
    setExpectedSide('left')
    setInvalidTaps(0)
    setInterrupted(false)
    setCompletedElapsedMs(0)
    setFlashSide(null)
    setAssistanceRequested(false)
    if (clearAssistanceHistory) setConsecutiveAlternationFailures(0)
    completionRecorded.current = false
    demoIndex.current = 0
    demoElapsed.current = 0
  }, [mode])

  const registerTap = useCallback((side: Side, timestamp = performance.now()) => {
    if (testState !== 'running') return
    if (side !== expectedSide) {
      setInvalidTaps((value) => value + 1)
      return
    }
    setTapTimes((times) => [...times, timestamp])
    setExpectedSide(side === 'left' ? 'right' : 'left')
    setFlashSide(side)
    window.setTimeout(() => setFlashSide(null), 110)
  }, [expectedSide, testState])

  useEffect(() => {
    if (testState !== 'countdown') return
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          startTime.current = performance.now()
          setTestState('running')
          return 0
        }
        return value - 1
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [testState])

  useEffect(() => {
    if (testState !== 'running') return
    const ticker = window.setInterval(() => {
      const elapsedNow = performance.now() - startTime.current
      const nextRemaining = Math.max(0, duration - elapsedNow)
      setRemainingMs(nextRemaining)
      if (nextRemaining === 0) {
        window.clearInterval(ticker)
        setCompletedElapsedMs(duration)
        setTestState('complete')
      }
    }, 50)
    return () => window.clearInterval(ticker)
  }, [duration, testState])

  useEffect(() => {
    if (testState !== 'complete' || completionRecorded.current) return
    completionRecorded.current = true
    setConsecutiveAlternationFailures((count) => alternationFailed ? count + 1 : 0)
  }, [alternationFailed, testState])

  useEffect(() => {
    if (testState !== 'running' || mode !== 'demo') return
    const timers: number[] = []
    let accumulated = 180
    const scheduleTap = (delay: number, side: Side) => {
      timers.push(window.setTimeout(() => {
        setTapTimes((times) => [...times, startTime.current + delay])
        setExpectedSide(side === 'left' ? 'right' : 'left')
        setFlashSide(side)
        window.setTimeout(() => setFlashSide(null), 110)
      }, delay))
    }

    scheduleTap(accumulated, 'left')
    DEMO_INTERVALS.forEach((interval, index) => {
      accumulated += interval
      const delay = accumulated
      const side: Side = index % 2 === 0 ? 'right' : 'left'
      scheduleTap(delay, side)
    })
    return () => timers.forEach(window.clearTimeout)
  }, [mode, testState])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f') registerTap('left')
      if (event.key.toLowerCase() === 'j') registerTap('right')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [registerTap])

  const start = () => {
    completionRecorded.current = false
    setAssistanceRequested(false)
    setCountdown(3)
    setTestState('countdown')
  }

  const interruptTest = () => {
    setInterrupted(true)
    setCompletedElapsedMs(Math.max(0, duration - remainingMs))
    setTestState('complete')
  }

  const qualityExplanation =
    metrics.quality === '資料品質不足'
      ? alternationFailed
        ? '左右交替錯誤過多，本次不納入動作趨勢；請依下方照護協助分流處理。'
        : `${metrics.validity.reasons.join('、')}。建議重測；本次不納入趨勢，也不影響原處方。`
      : metrics.speedRange === '低於個人近期範圍'
        ? '測試有效，但本次速度低於個人近期範圍。'
        : '測試有效；動作特徵與測試有效性分開記錄。'

  return (
    <SceneShell
      eyebrow="場景 02 · 服藥前評估"
      title="服藥前，留下 20 秒動作快照"
      description="左右交替點擊。系統分開記錄測試有效性與動作特徵，不診斷疾病狀態，也不阻擋或延誤依醫囑用藥。"
      aside={
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
                tone={metrics.quality === '測試有效' ? 'teal' : 'amber'}
                icon={metrics.quality === '測試有效' ? 'success' : 'alert'}
              >
                {metrics.quality}
              </StatusPill>
            ) : (
              <StatusPill>準備就緒</StatusPill>
            )}
          </div>

          <div className="progress-track" aria-hidden="true">
            <span style={{ transform: `scaleX(${1 - remainingMs / duration})` }} />
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
              onPointerDown={() => registerTap('left')}
              disabled={testState !== 'running' || mode === 'demo'}
              aria-label="左側點擊區，可按 F 鍵"
            >
              <span>左</span>
              <small>F 鍵</small>
            </button>
            <button
              className={`tap-pad right ${expectedSide === 'right' && testState === 'running' ? 'expected' : ''} ${flashSide === 'right' ? 'pressed' : ''}`}
              onPointerDown={() => registerTap('right')}
              disabled={testState !== 'running' || mode === 'demo'}
              aria-label="右側點擊區，可按 J 鍵"
            >
              <span>右</span>
              <small>J 鍵</small>
            </button>
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
                  前往發藥核對 <ArrowRight />
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
        </section>

        <aside className="metrics-panel" aria-live="polite">
          <header>
            <span><Gauge /> 即時計算</span>
            <small>概念展示／模擬資料</small>
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
          <div className={`quality-card ${metrics.quality === '資料品質不足' ? 'warning' : ''}`}>
            {testState === 'complete' && metrics.quality === '測試有效'
              ? <Check />
              : metrics.quality === '資料品質不足'
                ? <CircleAlert />
                : <Zap />}
            <div>
              <small>測試有效性</small>
              <strong>
                {testState === 'ready'
                  ? '等待測試'
                  : testState === 'complete'
                    ? metrics.speedRange === '低於個人近期範圍'
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
                <small>照護協助分流</small>
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
            <Info />「運動反應分數」是原型指標，不是診斷，也不是臨床量表替代品。
          </p>
        </aside>
      </div>
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
