import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import {
  ArrowRight,
  BellRing,
  Camera,
  Check,
  CircleAlert,
  LockKeyhole,
  PackageCheck,
  Play,
  RotateCcw,
  Scale,
  ShieldAlert
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'

type Scenario = 'normal' | 'anomaly'
export type DispensePhase =
  | 'idle'
  | 'release'
  | 'inspect'
  | 'route'
  | 'awaiting-caregiver'
  | 'retry-release'
  | 'retry-inspect'
  | 'retry-route'
  | 'complete'

interface DispenseSceneProps {
  onNext: () => void
}

interface PillDefinition {
  id: string
  offsetX: number
  offsetY: number
  delay: number
  batch: 'initial' | 'retry'
}

const NORMAL_PILLS: PillDefinition[] = [
  { id: 'initial-pill-1', offsetX: -12, offsetY: -3, delay: 0, batch: 'initial' },
  { id: 'initial-pill-2', offsetX: 12, offsetY: 5, delay: 120, batch: 'initial' }
]

const ANOMALY_PILLS: PillDefinition[] = [
  { id: 'initial-pill-1', offsetX: -20, offsetY: -3, delay: 0, batch: 'initial' },
  { id: 'initial-pill-2', offsetX: 0, offsetY: 7, delay: 120, batch: 'initial' },
  { id: 'initial-pill-3', offsetX: 20, offsetY: -1, delay: 240, batch: 'initial' }
]

const RETRY_PILLS: PillDefinition[] = [
  { id: 'retry-pill-1', offsetX: -12, offsetY: -3, delay: 0, batch: 'retry' },
  { id: 'retry-pill-2', offsetX: 12, offsetY: 5, delay: 120, batch: 'retry' }
]

const phaseLabels: Record<Exclude<DispensePhase, 'idle' | 'complete'>, string> = {
  release: '新批次進入核對盤',
  inspect: '影像與重量核對',
  route: '分流閘門導向抽屜',
  'awaiting-caregiver': '等待照顧者人工確認',
  'retry-release': '全新 2 顆重新執行',
  'retry-inspect': '重新核對影像與重量',
  'retry-route': '核對通過，導向取藥抽屜'
}

const phaseDelays: Partial<Record<DispensePhase, number>> = {
  release: 2600,
  inspect: 2450,
  route: 1750,
  'retry-release': 2450,
  'retry-inspect': 2450,
  'retry-route': 1750
}

export function DispenseScene({ onNext }: DispenseSceneProps) {
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [phase, setPhase] = useState<DispensePhase>('idle')
  const [inspectionStep, setInspectionStep] = useState(0)
  const [caregiverConfirmed, setCaregiverConfirmed] = useState(false)

  const reset = (nextScenario = scenario) => {
    setScenario(nextScenario)
    setPhase('idle')
    setInspectionStep(0)
    setCaregiverConfirmed(false)
  }

  useEffect(() => {
    if (!phaseDelays[phase]) return
    const nextPhase: Partial<Record<DispensePhase, DispensePhase>> = {
      release: 'inspect',
      inspect: 'route',
      route: scenario === 'anomaly' ? 'awaiting-caregiver' : 'complete',
      'retry-release': 'retry-inspect',
      'retry-inspect': 'retry-route',
      'retry-route': 'complete'
    }
    const timer = window.setTimeout(
      () => setPhase(nextPhase[phase] ?? 'complete'),
      phaseDelays[phase]
    )
    return () => window.clearTimeout(timer)
  }, [phase, scenario])

  const inspecting = phase === 'inspect' || phase === 'retry-inspect'

  useEffect(() => {
    if (!inspecting) {
      setInspectionStep(0)
      return
    }
    const timers = [
      window.setTimeout(() => setInspectionStep(1), 900),
      window.setTimeout(() => setInspectionStep(2), 1320),
      window.setTimeout(() => setInspectionStep(3), 1740)
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [inspecting])

  const initialPills = scenario === 'normal' ? NORMAL_PILLS : ANOMALY_PILLS
  const retrying =
    caregiverConfirmed &&
    ['retry-release', 'retry-inspect', 'retry-route', 'complete'].includes(phase)
  const activeCount = retrying ? 2 : initialPills.length
  const activeWeight = activeCount * 256
  const running = phase !== 'idle' && phase !== 'complete' && phase !== 'awaiting-caregiver'

  const verificationState = useMemo(() => {
    const initialInspected = [
      'route',
      'awaiting-caregiver',
      'retry-release',
      'retry-inspect',
      'retry-route',
      'complete'
    ].includes(phase)
    const initialRouted = [
      'awaiting-caregiver',
      'retry-release',
      'retry-inspect',
      'retry-route',
      'complete'
    ].includes(phase)
    const retryReleased = ['retry-inspect', 'retry-route', 'complete'].includes(phase)
    const retryInspected = ['retry-route', 'complete'].includes(phase)
    return { initialInspected, initialRouted, retryReleased, retryInspected }
  }, [phase])

  const confirmAndRetry = () => {
    setCaregiverConfirmed(true)
    setInspectionStep(0)
    setPhase('retry-release')
  }

  return (
    <SceneShell
      eyebrow="場景 03 · 實體發藥核對"
      title="每次交付，都經過實體核對"
      description="模型藥物依序進入核對盤；只有重量、影像、卡藥或重複出藥風險，才能暫停本次自動交付並等待照顧者人工確認。"
      aside={
        <div className="scenario-switch" aria-label="發藥情境">
          <button
            className={scenario === 'normal' ? 'active' : ''}
            disabled={phase !== 'idle' && phase !== 'complete'}
            onClick={() => reset('normal')}
          >
            正常發藥
          </button>
          <button
            className={scenario === 'anomaly' ? 'active anomaly' : ''}
            disabled={phase !== 'idle' && phase !== 'complete'}
            onClick={() => reset('anomaly')}
          >
            數量異常
          </button>
        </div>
      }
    >
      <div className="dispenser-layout">
        <section
          className={`machine-card scenario-${scenario} phase-${phase} ${inspecting ? 'is-inspecting' : ''}`}
        >
          <div className="machine-toolbar">
            <div>
              <span className={`live-dot ${running ? 'pulsing' : ''}`} />
              <strong>MotionCare Home · MC-01</strong>
            </div>
            <span>2D 動態驗證圖 · GSAP timeline</span>
          </div>
          <DispenserDiagram
            scenario={scenario}
            phase={phase}
            inspectionStep={inspectionStep}
            caregiverConfirmed={caregiverConfirmed}
          />
          <div className="diagram-legend">
            <span><i className="legend-teal" /> 核對通過路徑</span>
            <span><i className="legend-amber" /> 核對盤範圍</span>
            <span><i className="legend-red" /> 異常整批暫存</span>
          </div>
        </section>

        <aside className="verification-panel">
          <header>
            <span>分藥核對紀錄</span>
            {phase === 'idle' ? (
              <StatusPill>等待啟動</StatusPill>
            ) : phase === 'awaiting-caregiver' ? (
              <StatusPill tone="danger" icon="alert">自動交付已暫停</StatusPill>
            ) : phase === 'complete' ? (
              <StatusPill tone="teal" icon="success">核對通過</StatusPill>
            ) : (
              <StatusPill tone="blue" icon="loading">流程進行中</StatusPill>
            )}
          </header>

          <ol className="verification-steps">
            <VerificationStep
              active={phase === 'release'}
              done={phase !== 'idle' && phase !== 'release'}
              icon={<PackageCheck />}
              title="依核准處方任務釋出"
              detail={`預期 2 顆 · 本批次實際釋出 ${initialPills.length} 顆`}
              warning={scenario === 'anomaly' && phase !== 'idle'}
            />
            <VerificationStep
              active={phase === 'inspect'}
              done={verificationState.initialInspected}
              icon={<><Scale /><Camera /></>}
              title="核對盤停穩後掃描"
              detail={
                phase === 'idle' || phase === 'release'
                  ? '等待全部模型藥物停穩'
                  : `影像計數 ${initialPills.length}／2 · 模擬重量 ${initialPills.length * 256} mg`
              }
              warning={scenario === 'anomaly' && verificationState.initialInspected}
            />
            <VerificationStep
              active={phase === 'route'}
              done={verificationState.initialRouted}
              icon={scenario === 'normal' ? <Check /> : <ShieldAlert />}
              title={scenario === 'normal' ? '通過核對，送往取藥抽屜' : '數量異常，整批鎖定暫存'}
              detail={
                scenario === 'normal'
                  ? '2 顆全部進入核對通過取藥抽屜'
                  : '3 顆全部進入異常藥物暫存抽屜'
              }
              warning={scenario === 'anomaly' && verificationState.initialRouted}
            />
            {scenario === 'anomaly' ? (
              <>
                <VerificationStep
                  active={phase === 'retry-release'}
                  done={verificationState.retryReleased}
                  icon={<RotateCcw />}
                  title="照顧者確認後重新執行"
                  detail="使用全新的 2 顆模擬藥丸；異常批次不回流"
                />
                <VerificationStep
                  active={phase === 'retry-inspect' || phase === 'retry-route'}
                  done={verificationState.retryInspected}
                  icon={<><Scale /><Camera /></>}
                  title="新批次重新核對"
                  detail={
                    caregiverConfirmed
                      ? `影像計數 ${activeCount}／2 · 模擬重量 ${activeWeight} mg`
                      : '等待照顧者確認'
                  }
                />
              </>
            ) : null}
          </ol>

          {inspecting ? (
            <div className="inspection-confirmations" aria-live="polite">
              {['輪廓確認', '數量確認', '重量確認'].map((label, index) => (
                <span key={label} className={inspectionStep > index ? 'confirmed' : ''}>
                  {inspectionStep > index ? <Check /> : <i />}
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {phase === 'idle' ? (
            <button className="primary-button large" onClick={() => setPhase('release')}>
              <Play /> 展示{scenario === 'normal' ? '正常' : '異常'}流程
            </button>
          ) : phase === 'awaiting-caregiver' ? (
            <div className="hardware-pause-panel" aria-live="assertive">
              <div>
                <LockKeyhole />
                <p>
                  <strong>異常批次已鎖定，等待照顧者確認</strong>
                  本次自動交付已暫停；這不等於停止患者用藥。
                </p>
              </div>
              <p className="caregiver-alert"><BellRing /> 主要照顧者已收到非緊急硬體提醒</p>
              <button className="primary-button large" onClick={confirmAndRetry}>
                <RotateCcw /> 照顧者已確認，重新執行
              </button>
              <small>照顧者確認後，可重新執行原處方任務；不更改藥物、劑量或服藥時間。</small>
            </div>
          ) : phase === 'complete' ? (
            <div className="completion-actions">
              <div className="completion-message">
                <Check />
                <p>
                  <strong>
                    {scenario === 'normal'
                      ? '2 顆已送達核對通過取藥抽屜'
                      : '全新 2 顆已通過核對並送達取藥抽屜'}
                  </strong>
                  <span>
                    {scenario === 'anomaly'
                      ? '原異常 3 顆仍鎖定在暫存抽屜。'
                      : '發藥紀錄不等於患者已吞下藥物。'}
                  </span>
                </p>
              </div>
              <div>
                <button className="secondary-button" onClick={() => reset()}>
                  <RotateCcw /> 重播
                </button>
                <button className="primary-button" onClick={onNext}>
                  前往服藥後追蹤 <ArrowRight />
                </button>
              </div>
            </div>
          ) : (
            <div className="phase-readout" aria-live="polite">
              <span className="loader-line" />
              <p>
                <small>目前步驟</small>
                <strong>{phaseLabels[phase as Exclude<DispensePhase, 'idle' | 'complete'>]}</strong>
              </p>
            </div>
          )}
        </aside>
      </div>
      <p className="dispense-safety-disclaimer">
        <CircleAlert />
        暫停自動交付只處理本次硬體異常，不代表停止患者用藥；點擊結果不能觸發此流程。
      </p>
    </SceneShell>
  )
}

function VerificationStep({
  active,
  done,
  icon,
  title,
  detail,
  warning = false
}: {
  active: boolean
  done: boolean
  icon: React.ReactNode
  title: string
  detail: string
  warning?: boolean
}) {
  return (
    <li className={`${active ? 'active' : ''} ${done ? 'done' : ''} ${warning ? 'warning' : ''}`}>
      <span className="verification-icon">{done && !warning ? <Check /> : icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </li>
  )
}

function DispenserDiagram({
  scenario,
  phase,
  inspectionStep,
  caregiverConfirmed
}: {
  scenario: Scenario
  phase: DispensePhase
  inspectionStep: number
  caregiverConfirmed: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const initialPills = scenario === 'normal' ? NORMAL_PILLS : ANOMALY_PILLS
  const inspecting = phase === 'inspect' || phase === 'retry-inspect'
  const scanning = inspecting && inspectionStep === 0
  const inspectionPills = phase === 'retry-inspect' ? RETRY_PILLS : initialPills
  const showNormalRoute =
    scenario === 'normal'
      ? ['route', 'complete'].includes(phase)
      : ['retry-route', 'complete'].includes(phase)
  const showAnomalyRoute =
    scenario === 'anomaly' &&
    ['route', 'awaiting-caregiver', 'retry-release', 'retry-inspect', 'retry-route', 'complete'].includes(phase)

  useLayoutEffect(() => {
    const root = svgRef.current
    if (!root) return

    const context = gsap.context(() => {
      const pills = Array.from(root.querySelectorAll<SVGGElement>('.pill-token'))
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const isRetryPhase = phase.startsWith('retry')
      const activeBatch = isRetryPhase ? 'retry' : 'initial'
      const activePills = pills.filter((pill) => pill.dataset.batch === activeBatch)

      const pointFor = (
        pill: SVGGElement,
        location: 'source' | 'tray' | 'pickup' | 'quarantine'
      ) => {
        const offsetX = Number(pill.dataset.offsetX ?? 0)
        const offsetY = Number(pill.dataset.offsetY ?? 0)
        if (location === 'source') return { x: 232, y: 162 }
        if (location === 'tray') return { x: 545 + offsetX, y: 270 + offsetY }
        if (location === 'pickup') return { x: 405 + offsetX, y: 421 + offsetY }
        return { x: 627 + offsetX, y: 414 + offsetY }
      }

      const placeFromLocation = (pill: SVGGElement) => {
        const location = pill.dataset.location
        if (location === 'inspection-tray') {
          gsap.set(pill, { ...pointFor(pill, 'tray'), autoAlpha: 1, scale: 1, rotation: 0 })
        } else if (location === 'pickup-drawer') {
          gsap.set(pill, { ...pointFor(pill, 'pickup'), autoAlpha: 1, scale: 0.92, rotation: 0 })
        } else if (location === 'quarantine-drawer') {
          gsap.set(pill, { ...pointFor(pill, 'quarantine'), autoAlpha: 1, scale: 0.92, rotation: 0 })
        } else {
          gsap.set(pill, { ...pointFor(pill, 'source'), autoAlpha: 0, scale: 0.86, rotation: -8 })
        }
      }

      pills.forEach(placeFromLocation)
      gsap.set(pills, { transformOrigin: '50% 50%', willChange: 'transform,opacity' })

      if (reducedMotion) return

      if (phase === 'idle') {
        gsap.fromTo(
          root.querySelectorAll('.module, .camera-stand, .inspection-tray, .split-gate'),
          { y: 7, autoAlpha: 0.7 },
          { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.045, ease: 'power2.out' }
        )
        return
      }

      if (phase === 'release' || phase === 'retry-release') {
        const master = gsap.timeline({ defaults: { overwrite: 'auto' } })
        master.addLabel('disc-entry', 0.24)
        master.addLabel('disc-index', 0.54)
        master.addLabel('tray-exit', 1.28)
        activePills.forEach((pill, index) => {
          const destination = pointFor(pill, 'tray')
          const pillTimeline = gsap.timeline()
            .set(pill, { ...pointFor(pill, 'source'), autoAlpha: 0, scale: 0.82, rotation: -12 })
            .to(pill, { autoAlpha: 1, scale: 0.94, duration: 0.16, ease: 'power1.out' })
            .to(pill, { x: 278, y: 207, rotation: 9, duration: 0.27, ease: 'power2.in' })
            .to(pill, { x: 300, y: 225, rotation: -4, duration: 0.23, ease: 'power2.out' })
            .to(pill, { x: 323, y: 216, rotation: -9, duration: 0.22, ease: 'sine.inOut' })
            .to(pill, { x: 356, y: 220, rotation: 4, duration: 0.22, ease: 'sine.inOut' })
            .to(pill, { x: 390, y: 237, rotation: 9, duration: 0.23, ease: 'sine.inOut' })
            .to(pill, { x: 431, y: 249, rotation: 2, duration: 0.23, ease: 'power2.out' })
            .to(pill, { x: 472, y: 254, rotation: 5, duration: 0.21, ease: 'sine.inOut' })
            .to(pill, {
              ...destination,
              rotation: 0,
              scale: 1,
              duration: 0.32,
              ease: 'back.out(1.25)'
            })
          master.add(pillTimeline, index * 0.12)
        })
        master.fromTo(
          root.querySelector('.disc-rotor'),
          { rotation: 0, svgOrigin: '330 241' },
          {
            rotation: 60 * activePills.length,
            duration: 1.22,
            ease: 'power2.inOut'
          },
          'disc-entry'
        )
        master.fromTo(
          root.querySelector('.disc-index-light'),
          { autoAlpha: 0.45, scale: 0.75, svgOrigin: '399 241' },
          {
            autoAlpha: 1,
            scale: 1.45,
            duration: 0.22,
            repeat: activePills.length * 2 - 1,
            yoyo: true,
            ease: 'sine.inOut'
          },
          'disc-index'
        )
        master.fromTo(
          root.querySelector('.inspection-tray'),
          { y: 0 },
          { y: 3, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 },
          'tray-exit'
        )
        return
      }

      if (phase === 'inspect' || phase === 'retry-inspect') {
        activePills.forEach((pill) => {
          gsap.set(pill, { ...pointFor(pill, 'tray'), autoAlpha: 1, scale: 1, rotation: 0 })
        })
        const scanTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
        scanTimeline
          .fromTo('.vision-boundary', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28 })
          .fromTo(
            '.camera-indicator',
            { autoAlpha: 0.4, scale: 0.8, svgOrigin: '590 122' },
            { autoAlpha: 1, scale: 1.45, duration: 0.24, repeat: 3, yoyo: true, ease: 'sine.inOut' },
            '<'
          )
          .fromTo(
            '.scan-sweep',
            { y: -18, autoAlpha: 0.18 },
            { y: 78, autoAlpha: 0.78, duration: 0.82, ease: 'sine.inOut' },
            '<0.08'
          )
          .fromTo(
            '.recognition-boxes rect',
            { autoAlpha: 0, scale: 0.74, transformOrigin: '50% 50%' },
            { autoAlpha: 1, scale: 1, duration: 0.28, stagger: 0.11, ease: 'back.out(1.6)' },
            '-=0.22'
          )
          .to(
            activePills,
            { scale: 1.06, duration: 0.24, stagger: 0.08, yoyo: true, repeat: 1, ease: 'sine.inOut' },
            '-=0.18'
          )
        return
      }

      if (phase === 'route' || phase === 'retry-route') {
        const toQuarantine = scenario === 'anomaly' && phase === 'route'
        const destination = toQuarantine ? 'quarantine' : 'pickup'
        const drawerSelector = toQuarantine ? '.quarantine-drawer' : '.pickup-drawer'
        const gateRotation = toQuarantine ? 27 : -26
        const master = gsap.timeline({ defaults: { overwrite: 'auto' } })

        master.to('.gate-flap', {
          rotation: gateRotation,
          duration: 0.34,
          ease: 'power3.out',
          transformOrigin: '50% 50%'
        })
        activePills.forEach((pill, index) => {
          const finalPoint = pointFor(pill, destination)
          const pillTimeline = gsap.timeline()
            .set(pill, { ...pointFor(pill, 'tray'), autoAlpha: 1, scale: 1, rotation: 0 })
            .to(pill, { x: 554, y: 341, rotation: toQuarantine ? 8 : -8, duration: 0.34, ease: 'power2.in' })
            .to(pill, {
              x: toQuarantine ? 592 : 510,
              y: 377,
              rotation: toQuarantine ? 14 : -14,
              duration: 0.36,
              ease: 'sine.inOut'
            })
            .to(pill, {
              ...finalPoint,
              rotation: 0,
              scale: 0.92,
              duration: 0.46,
              ease: 'power3.out'
            })
          master.add(pillTimeline, 0.18 + index * 0.12)
        })
        master.fromTo(
          drawerSelector,
          { y: 0 },
          { y: -4, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 },
          0.82
        )
        return
      }

      const settledDrawer =
        phase === 'awaiting-caregiver'
          ? '.quarantine-drawer'
          : phase === 'complete'
            ? scenario === 'normal' || caregiverConfirmed
              ? '.pickup-drawer'
              : '.quarantine-drawer'
            : null
      if (settledDrawer) {
        gsap.fromTo(
          settledDrawer,
          { scale: 0.99, transformOrigin: '50% 50%' },
          { scale: 1, duration: 0.3, ease: 'power2.out' }
        )
      }
    }, root)

    return () => context.revert()
  }, [caregiverConfirmed, phase, scenario])

  return (
    <svg
      ref={svgRef}
      className="dispenser-svg motion-enhanced"
      viewBox="0 0 760 520"
      role="img"
      aria-label="藥匣、旋轉分藥盤、固定支架攝影機、核對盤、分流閘門、取藥抽屜與鎖定異常暫存抽屜"
    >
      <defs>
        <linearGradient id="machineFace" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f9fbf9" />
          <stop offset="1" stopColor="#dce7e5" />
        </linearGradient>
        <linearGradient id="machineSide" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b9ceca" />
          <stop offset="1" stopColor="#8ba9a5" />
        </linearGradient>
        <linearGradient id="safeDrawer" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d8eeea" />
          <stop offset="1" stopColor="#8dbeb5" />
        </linearGradient>
        <linearGradient id="dangerDrawer" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ead7d1" />
          <stop offset="1" stopColor="#b87569" />
        </linearGradient>
        <linearGradient id="stageWash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fbfdfb" />
          <stop offset=".58" stopColor="#f3f8f6" />
          <stop offset="1" stopColor="#edf4f1" />
        </linearGradient>
        <linearGradient id="visionCone" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#efc466" stopOpacity=".22" />
          <stop offset="1" stopColor="#efc466" stopOpacity=".04" />
        </linearGradient>
        <linearGradient id="pillShell" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fffdf4" />
          <stop offset=".52" stopColor="#f3ead0" />
          <stop offset="1" stopColor="#ded0a4" />
        </linearGradient>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0b2532" floodOpacity=".14" />
        </filter>
        <filter id="pillShadow" x="-50%" y="-80%" width="200%" height="260%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0b2532" floodOpacity=".18" />
        </filter>
        <clipPath id="inspectionTrayClip">
          <path d="M440 260 570 230 650 270 520 305Z" />
        </clipPath>
        <marker id="arrowTeal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 8 4 0 8Z" fill="#2f8177" />
        </marker>
        <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 8 4 0 8Z" fill="#a84f43" />
        </marker>
      </defs>

      <rect className="diagram-surface" x="34" y="26" width="692" height="452" rx="30" fill="url(#stageWash)" />
      <g className="diagram-grid" aria-hidden="true">
        {[116, 206, 296, 386].map((lineY) => (
          <path key={`h-${lineY}`} d={`M62 ${lineY}H700`} />
        ))}
        {[166, 314, 462, 610].map((lineX) => (
          <path key={`v-${lineX}`} d={`M${lineX} 50V452`} />
        ))}
      </g>
      <path d="M80 477H720" stroke="#cbd9d7" strokeWidth="2" />
      <ellipse cx="415" cy="483" rx="310" ry="24" fill="#0b2532" opacity=".08" />

      <g className="module hopper" filter="url(#softShadow)">
        <path d="M94 76 202 48l82 36-108 30Z" fill="#e5eeec" />
        <path d="m94 76 82 38v124l-82-38Z" fill="url(#machineSide)" />
        <path d="m176 114 108-30v124l-108 30Z" fill="url(#machineFace)" />
        <path d="M200 128 258 112v62l-58 16Z" fill="#0d3442" />
        <circle cx="216" cy="149" r="7" fill="#65b5a8" />
        <circle cx="239" cy="143" r="7" fill="#65b5a8" />
        <text x="102" y="60">藥匣</text>
      </g>

      <g className="module disc" filter="url(#softShadow)">
        <ellipse cx="330" cy="244" rx="88" ry="32" fill="#8ea8a4" />
        <path d="M242 244v27c0 18 39 32 88 32s88-14 88-32v-27Z" fill="#b5c9c5" />
        <g className="disc-rotor">
          <ellipse cx="330" cy="241" rx="88" ry="32" fill="#ecf2f0" />
          <ellipse cx="330" cy="241" rx="52" ry="19" fill="#b9cbc7" />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const x = 330 + Math.cos((angle * Math.PI) / 180) * 69
            const y = 241 + Math.sin((angle * Math.PI) / 180) * 24
            return <circle key={angle} cx={x} cy={y} r="8" fill="#d5e2df" stroke="#99b3ae" />
          })}
          <circle className="disc-index-light" cx="399" cy="241" r="4.5" fill="#d3a64b" />
          <path d="M324 241h12M330 235v12" stroke="#6e8f89" strokeWidth="2" strokeLinecap="round" />
        </g>
        <text x="275" y="327">旋轉分藥盤</text>
      </g>

      <g className="camera-stand" filter="url(#softShadow)">
        <path d="M657 94h14v164h-14Z" fill="#8da8a2" />
        <path d="M559 94h112v13H559Z" fill="#a9bfbb" />
        <path d="M641 248h45l-8 16h-45Z" fill="#829f9a" />
        <g className="camera-head">
          <rect x="523" y="108" width="82" height="49" rx="13" fill="#edf3f1" stroke="#c4d4d1" strokeWidth="2" />
          <rect x="532" y="116" width="64" height="33" rx="10" fill="#c4d6d2" />
          <circle cx="563" cy="133" r="11" fill="#123949" />
          <circle cx="563" cy="133" r="5" fill="#66afa4" />
          <circle className="camera-indicator" cx="590" cy="122" r="3.5" fill="#65b5a8" />
          <path d="M548 157h31l-4 8h-23Z" fill="#90aaa5" />
        </g>
        <text x="560" y="79">俯視攝影機</text>
      </g>

      <g className={`vision-boundary ${inspecting ? 'active' : ''}`}>
        <path d="M563 157 440 260 520 305 650 270 570 230Z" fill="url(#visionCone)" />
        <path d="M563 157 440 260M563 157 570 230M563 157 650 270M563 157 520 305" />
      </g>

      <g className="inspection-tray" filter="url(#softShadow)">
        <path d="M440 260 570 230 650 270 520 305Z" fill="#edf3f1" stroke="#d0a348" strokeWidth="2" />
        <path d="m440 260 80 45v30l-80-44Z" fill="#91aca7" />
        <path d="m520 305 130-35v30l-130 35Z" fill="#c7d7d4" />
        <path d="M463 262 568 238 626 268 522 296Z" fill="#d4a64d" opacity=".15" />
        <path d="M474 264h22M595 250h20M505 292h22M615 276h18" stroke="#c18a43" strokeWidth="2" strokeLinecap="round" />
        <circle cx="625" cy="294" r="4" fill="#66afa4" />
      </g>

      <g className="tray-label">
        <rect x="456" y="202" width="165" height="25" rx="12.5" />
        <circle cx="471" cy="214.5" r="4" />
        <text x="483" y="219">重量感測＋影像核對</text>
      </g>

      <g clipPath="url(#inspectionTrayClip)" className={`tray-scan ${scanning ? 'scanning' : ''}`}>
        <rect className="scan-sweep" x="418" y="232" width="250" height="18" fill="#f0c96f" opacity=".7" />
      </g>

      {inspecting ? (
        <g className="recognition-boxes">
          {inspectionPills.map((pill) => (
            <rect
              key={`box-${pill.id}`}
              x={526 + pill.offsetX}
              y={256 + pill.offsetY}
              width="38"
              height="28"
              rx="9"
              style={{ '--box-delay': `${pill.delay}ms` } as React.CSSProperties}
            />
          ))}
        </g>
      ) : null}

      <g className="split-gate" filter="url(#softShadow)">
        <path d="M510 344 575 327 615 346 550 365Z" fill="#dfe9e6" />
        <path d="m510 344 40 21v26l-40-21Z" fill="#8fa9a4" />
        <path d="m550 365 65-19v26l-65 19Z" fill="#b8ccc8" />
        <path
          className={showAnomalyRoute ? 'gate-flap anomaly' : showNormalRoute ? 'gate-flap normal' : 'gate-flap'}
          d="m544 350 34-9"
          stroke="#1c5262"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text x="527" y="411">分流閘門</text>
      </g>

      <g className="module pickup-drawer" filter="url(#softShadow)">
        <path d="M276 406 414 373 493 407 353 443Z" fill="#dcebe8" />
        <path d="m276 406 77 37v42l-77-37Z" fill="#78a9a1" />
        <path d="m353 443 140-36v42l-140 36Z" fill="url(#safeDrawer)" />
        <path d="m308 410 105-25 49 21-108 28Z" fill="#336f69" />
        <rect x="382" y="448" width="48" height="8" rx="4" fill="#4a877e" />
        <text x="294" y="511">核對通過取藥抽屜</text>
      </g>

      <g className="module quarantine-drawer" filter="url(#softShadow)">
        <path d="M520 406 636 378 708 410 590 441Z" fill="#ead7d1" />
        <path d="m520 406 70 35v42l-70-35Z" fill="#9e5b52" />
        <path d="m590 441 118-31v42l-118 31Z" fill="url(#dangerDrawer)" />
        <path d="m548 409 87-21 43 20-89 24Z" fill="#743f3b" />
        <rect x="626" y="447" width="42" height="8" rx="4" fill="#87483f" />
        <g className="drawer-lock">
          <rect x="602" y="448" width="17" height="14" rx="3" />
          <path d="M606 448v-4a4.5 4.5 0 0 1 9 0v4" />
        </g>
        <text x="529" y="502">異常藥物暫存抽屜</text>
        <text className="caregiver-only-label" x="558" y="517">僅照顧者可開啟</text>
      </g>

      <path
        className={`route-line source ${phase !== 'idle' ? 'visible' : ''}`}
        d="M233 184C250 208 274 217 298 227"
        markerEnd="url(#arrowTeal)"
      />
      <path
        className={`route-line disc-transfer ${phase === 'release' || phase === 'retry-release' ? 'visible' : ''}`}
        d="M296 226C319 207 357 211 389 232C403 241 414 247 429 249"
        markerEnd="url(#arrowTeal)"
      />
      <path
        className={`route-line inspection ${phase !== 'idle' ? 'visible' : ''}`}
        d="M408 249C453 246 489 252 523 266"
      />
      <path
        className={`route-line normal ${showNormalRoute ? 'visible' : ''}`}
        d="M545 304C550 334 535 362 484 391 450 410 415 420 388 425"
        markerEnd="url(#arrowTeal)"
      />
      <path
        className={`route-line danger ${showAnomalyRoute ? 'visible' : ''}`}
        d="M568 304C582 336 595 365 625 397 643 416 651 425 652 432"
        markerEnd="url(#arrowRed)"
      />

      {initialPills.map((pill) => (
        <PillToken
          key={pill.id}
          pill={pill}
          phase={phase}
          destination={scenario === 'normal' ? 'pickup' : 'quarantine'}
        />
      ))}
      {caregiverConfirmed
        ? RETRY_PILLS.map((pill) => (
            <PillToken
              key={pill.id}
              pill={pill}
              phase={phase}
              destination="pickup"
            />
          ))
        : null}
    </svg>
  )
}

function getPillLocation(
  pill: PillDefinition,
  phase: DispensePhase,
  destination: 'pickup' | 'quarantine'
) {
  if (pill.batch === 'retry') {
    if (phase === 'retry-release') return 'moving-to-tray'
    if (phase === 'retry-inspect') return 'inspection-tray'
    if (phase === 'retry-route') return 'moving-to-pickup'
    if (phase === 'complete') return 'pickup-drawer'
    return 'source'
  }

  if (phase === 'idle') return 'source'
  if (phase === 'release') return 'moving-to-tray'
  if (phase === 'inspect') return 'inspection-tray'
  if (phase === 'route') return `moving-to-${destination}`
  if (destination === 'quarantine') return 'quarantine-drawer'
  return 'pickup-drawer'
}

function PillToken({
  pill,
  phase,
  destination
}: {
  pill: PillDefinition
  phase: DispensePhase
  destination: 'pickup' | 'quarantine'
}) {
  const location = getPillLocation(pill, phase, destination)
  return (
    <g
      className={`pill-token batch-${pill.batch} destination-${destination} phase-${phase}`}
      data-testid="dispense-pill"
      data-pill-id={pill.id}
      data-batch={pill.batch}
      data-location={location}
      data-delay-ms={pill.delay}
      style={{
        '--pill-x': `${pill.offsetX}px`,
        '--pill-y': `${pill.offsetY}px`,
        '--pill-delay': `${pill.delay}ms`
      } as React.CSSProperties}
      data-offset-x={pill.offsetX}
      data-offset-y={pill.offsetY}
    >
      <g filter="url(#pillShadow)">
        <ellipse cx="0" cy="6" rx="14" ry="5" fill="#0b2532" opacity=".13" />
        <rect x="-14" y="-7" width="28" height="14" rx="7" fill="url(#pillShell)" stroke="#af9a5e" strokeWidth="1.6" />
        <path d="M0-6.5v13" stroke="#b7a36a" strokeWidth="1.5" />
        <path d="M-9-4.5h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".88" />
      </g>
    </g>
  )
}
