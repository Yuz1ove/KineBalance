import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BellRing,
  BookOpenText,
  BrainCircuit,
  Camera,
  Check,
  Clock3,
  Fingerprint,
  HeartHandshake,
  LockKeyhole,
  PackageCheck,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { animate, createScope, createTimeline, stagger, svg } from 'animejs'
import { animationTokens } from '../animation/tokens'
import { chapters, type ChapterDefinition } from './manifest'

const chapterTransition = {
  duration: animationTokens.duration.chapter / 1000,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
}

function ChapterFrame({
  chapter,
  kicker,
  title,
  lead,
  safety,
  className = '',
  children
}: {
  chapter: ChapterDefinition
  kicker: string
  title: string
  lead: string
  safety: ReactNode
  className?: string
  children: ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.section
      data-chapter-id={chapter.id}
      className={`exhibition-chapter ${className}`}
      aria-labelledby={`${chapter.id}-title`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={shouldReduceMotion ? { duration: 0 } : chapterTransition}
    >
      <div className="chapter-copy">
        <div className="chapter-index" aria-hidden="true">{chapter.index}</div>
        <p className="chapter-kicker">{kicker}</p>
        <h2 id={`${chapter.id}-title`}>{title}</h2>
        <p className="chapter-lead">{lead}</p>
        <div className="chapter-safety" role="note">
          <ShieldCheck aria-hidden="true" />
          <p>{safety}</p>
        </div>
      </div>
      <div className="chapter-exhibit">{children}</div>
    </motion.section>
  )
}

export function MedicationChapter({ onOpen }: { onOpen: () => void }) {
  const chapter = chapters[1]
  return (
    <ChapterFrame
      chapter={chapter}
      kicker="MEDICATION AS A TIME ANCHOR"
      title={'不是單一時刻，\n而是一整天的節律。'}
      lead="處方時間讓每次服藥前後的動作記錄能被放回同一條時間軸。14:00 的第 3 時段，是此刻正在發生的照護任務。"
      safety={<><strong>已發藥不等於已服藥。</strong> 指尖測試不阻擋或延誤依醫囑用藥；處方仍由醫師核准。</>}
      className="medication-chapter"
    >
      <MedicationTimelineExhibit />
      <ExhibitAction
        eyebrow="CURRENT TASK · 14:00"
        title="第 3 時段取藥任務"
        body="先留下服藥前動作快照；若此刻不方便，設備仍依原定安全時程處理發藥。"
        label="開啟今日用藥時程"
        onClick={onOpen}
      />
    </ChapterFrame>
  )
}

function MedicationTimelineExhibit() {
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { once: true, amount: 0.36 })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!root.current || !inView) return
    const scope = createScope({ root }).add(() => {
      const path = root.current?.querySelector<SVGPathElement>('.medication-path')
      if (!path) return
      const [drawable] = svg.createDrawable(path)
      if (shouldReduceMotion) {
        drawable.draw = '0 1'
        return
      }
      drawable.draw = '0 0'
      createTimeline({ defaults: { ease: animationTokens.ease.functional } })
        .add(drawable, { draw: '0 1', duration: 1100, ease: 'inOut(2)' })
        .add('.medication-node', {
          opacity: [0, 1],
          scale: [0.84, 1],
          duration: 380,
          delay: stagger(130)
        }, 220)
        .add('.medication-current-ring', { opacity: [0, 1], scale: [0.7, 1], duration: 480 }, 780)
    })
    return () => scope.revert()
  }, [inView, shouldReduceMotion])

  const times = [
    { time: '08:00', label: '已發藥', detail: '完成交付', state: 'done' },
    { time: '11:00', label: '待複核', detail: '照護者確認', state: 'review' },
    { time: '14:00', label: '現在', detail: '服藥前測試', state: 'current' },
    { time: '18:00', label: '下一時段', detail: '尚未開始', state: 'future' }
  ]

  return (
    <div ref={root} className="medication-timeline-exhibit" data-motion-owner="anime">
      <header>
        <span>2026.08.13 · DAILY RHYTHM</span>
        <strong>家屬連線正常 · 設備已連線</strong>
      </header>
      <div className="medication-axis" aria-hidden="true">
        <svg viewBox="0 0 840 80">
          <path className="medication-path" d="M30 40H810" />
        </svg>
      </div>
      <ol>
        {times.map((item) => (
          <li key={item.time} className={`medication-node state-${item.state}`}>
            <div className="medication-current-ring" />
            <i><span /></i>
            <time>{item.time}</time>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </li>
        ))}
      </ol>
      <footer>
        <span>醫師核准處方</span>
        <span>發藥設備 KB-01 正常</span>
        <span>不阻擋或延誤用藥</span>
      </footer>
    </div>
  )
}

export function MotionSnapshotChapter({ onOpen }: { onOpen: () => void }) {
  const chapter = chapters[2]
  return (
    <ChapterFrame
      chapter={chapter}
      kicker="A 20-SECOND MOTION SNAPSHOT"
      title={'在用藥前，\n留下此刻的動作快照。'}
      lead="左右交替的短測試，不是遊戲分數，也不是診斷。它只為同一個人留下可被前後配對的動作特徵。"
      safety={<><strong>資料品質與動作特徵分開。</strong> 測試結果不影響用藥，也不能推論急性危險事件。</>}
      className="motion-snapshot-chapter dark-chapter"
    >
      <AlternatingMotionExhibit />
      <div className="motion-metric-preview" aria-label="指尖測試會記錄的項目">
        {[
          ['01', '有效點擊'],
          ['02', '每秒速度'],
          ['03', '間隔變異'],
          ['04', '速度遞減'],
          ['05', '交替錯誤']
        ].map(([index, label]) => (
          <div key={index}><span>{index}</span><strong>{label}</strong></div>
        ))}
      </div>
      <ExhibitAction
        eyebrow="INTERACTIVE EXHIBIT"
        title="選擇 6 秒展示或 20 秒標準測試"
        body="支援左右大型點擊區與 F／J 鍵。測試開始後，其他敘事動畫會降低干擾。"
        label="開始可操作指尖測試"
        onClick={onOpen}
        dark
      />
    </ChapterFrame>
  )
}

function AlternatingMotionExhibit() {
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { amount: 0.2 })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!root.current || !inView || shouldReduceMotion) return
    const scope = createScope({ root }).add(() => {
      createTimeline({
        loop: true,
        loopDelay: 420,
        defaults: { ease: 'inOut(2)' }
      })
        .add('.motion-target-left .motion-target-core', { scale: [1, 1.18, 1], duration: 520 })
        .add('.motion-bridge', { opacity: [0.2, 0.85, 0.2], duration: 420 }, 120)
        .add('.motion-target-right .motion-target-core', { scale: [1, 1.18, 1], duration: 520 }, 420)
        .add('.motion-bridge', { opacity: [0.2, 0.85, 0.2], duration: 420 }, 540)
    })
    return () => scope.revert()
  }, [inView, shouldReduceMotion])

  return (
    <div ref={root} className="alternating-motion-exhibit" data-motion-owner="anime">
      <div className="motion-target motion-target-left">
        <span className="motion-target-core"><b>L</b></span>
        <small>左側 · F</small>
      </div>
      <div className="motion-bridge">
        <i /><span>左右交替</span><i />
      </div>
      <div className="motion-target motion-target-right">
        <span className="motion-target-core"><b>R</b></span>
        <small>右側 · J</small>
      </div>
    </div>
  )
}

export function DispenseChapter({ onOpen }: { onOpen: () => void }) {
  const chapter = chapters[3]
  return (
    <ChapterFrame
      chapter={chapter}
      kicker="VERIFIED PHYSICAL DISPENSING"
      title={'每一次交付，\n都先通過實體核對。'}
      lead="藥物從藥匣進入分藥盤，由攝影機與重量感測共同核對，再被導向取藥抽屜；異常批次整批隔離。"
      safety={<><strong>硬體暫停不等於停止患者用藥。</strong> 發藥紀錄也不代表患者已實際吞下藥物。</>}
      className="dispense-chapter"
    >
      <EquipmentCutaway />
      <ExhibitAction
        eyebrow="PHYSICAL AI · KB-01"
        title="正常通過，或異常整批隔離"
        body="切換正常／異常情境，觀看原批次隔離、照顧者確認與全新批次重試。"
        label="開啟完整設備流程"
        onClick={onOpen}
      />
    </ChapterFrame>
  )
}

function EquipmentCutaway() {
  const [scenario, setScenario] = useState<'normal' | 'anomaly'>('normal')
  const [replayKey, setReplayKey] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { amount: 0.28 })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!root.current || !inView) return
    const scope = createScope({ root }).add(() => {
      const path = root.current?.querySelector<SVGPathElement>(`.equipment-route.${scenario}`)
      if (!path) return
      const [drawable] = svg.createDrawable(path)
      if (shouldReduceMotion) {
        drawable.draw = '0 1'
        return
      }
      drawable.draw = '0 0'
      createTimeline({ defaults: { ease: animationTokens.ease.functional } })
        .add('.equipment-part', {
          opacity: [0, 1],
          scale: [0.94, 1],
          duration: 420,
          delay: stagger(105)
        })
        .add(drawable, { draw: '0 1', duration: 1450, ease: 'inOut(2)' }, 220)
        .add('.equipment-pulse', { opacity: [0.25, 1, 0.25], duration: 520, delay: stagger(120) }, 540)
    })
    return () => scope.revert()
  }, [inView, replayKey, scenario, shouldReduceMotion])

  const parts = [
    ['01', '藥匣', PackageCheck],
    ['02', '旋轉分藥盤', Activity],
    ['03', '俯視攝影機', Camera],
    ['04', '重量＋影像核對', Scale],
    ['05', '分流閘門', Fingerprint],
    ['06', scenario === 'normal' ? '取藥抽屜' : '異常暫存抽屜', scenario === 'normal' ? Check : LockKeyhole]
  ] as const

  return (
    <div ref={root} className={`equipment-cutaway scenario-${scenario}`} data-motion-owner="anime">
      <header>
        <div>
          <span className="equipment-live-dot" />
          <strong>KineBalance Home · KB-01</strong>
        </div>
        <div className="equipment-controls" aria-label="設備展示情境">
          <button
            className={scenario === 'normal' ? 'active' : ''}
            aria-pressed={scenario === 'normal'}
            onClick={() => setScenario('normal')}
          >正常流程</button>
          <button
            className={scenario === 'anomaly' ? 'active anomaly' : ''}
            aria-pressed={scenario === 'anomaly'}
            onClick={() => setScenario('anomaly')}
          >異常隔離</button>
          <button onClick={() => setReplayKey((value) => value + 1)} aria-label="重播設備動畫"><RotateCcw /></button>
        </div>
      </header>
      <div className="equipment-stage">
        <svg viewBox="0 0 1000 350" aria-hidden="true">
          <path className="equipment-route normal" d="M80 170 C160 90 245 90 320 170 S475 250 560 170 S715 90 790 170 L925 170" />
          <path className="equipment-route anomaly" d="M80 170 C160 90 245 90 320 170 S475 250 560 170 S700 110 760 180 C800 230 845 270 925 285" />
        </svg>
        <ol>
          {parts.map(([index, label, Icon], partIndex) => (
            <li key={index} className={`equipment-part equipment-part-${partIndex + 1}`}>
              <span className="equipment-pulse"><Icon /></span>
              <small>{index}</small>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
      </div>
      <footer className={scenario === 'normal' ? 'normal' : 'anomaly'}>
        {scenario === 'normal' ? (
          <><Check /><strong>核對通過</strong><span>整批送往取藥抽屜</span></>
        ) : (
          <><LockKeyhole /><strong>核對失敗</strong><span>整批隔離 · 等待照顧者確認</span></>
        )}
      </footer>
    </div>
  )
}

export function ResponseWindowChapter({ onOpen }: { onOpen: () => void }) {
  const chapter = chapters[4]
  return (
    <ChapterFrame
      chapter={chapter}
      kicker="THE RESPONSE WINDOW"
      title={'約 60 分鐘後，\n再次看見同一個人的變化。'}
      lead="用藥時間錨點將服藥前與服藥後的動作快照配對。這不是倒數壓力，而是一段等待、提醒與再次記錄的觀察窗。"
      safety={<><strong>這次沒有完成測試，仍不影響用藥。</strong> 系統只記錄資料不足，提醒方式也不改變發藥時程。</>}
      className="response-chapter dark-chapter"
    >
      <ResponseWindowExhibit />
      <ExhibitAction
        eyebrow="14:02 → 15:02"
        title="用快速模擬預覽完整時間窗"
        body="可選螢幕提示、家屬同步或大型語音提示；提醒是操作協助，不是異常警報。"
        label="開啟 60 分鐘快速模擬"
        onClick={onOpen}
        dark
      />
    </ChapterFrame>
  )
}

function ResponseWindowExhibit() {
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { amount: 0.3 })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!root.current || !inView) return
    const scope = createScope({ root }).add(() => {
      const line = root.current?.querySelector<SVGPathElement>('.response-window-path')
      if (!line) return
      const [drawable] = svg.createDrawable(line)
      if (shouldReduceMotion) {
        drawable.draw = '0 1'
        return
      }
      drawable.draw = '0 0'
      createTimeline()
        .add(drawable, { draw: '0 1', duration: 1500, ease: 'inOut(2)' })
        .add('.response-marker', { opacity: [0, 1], duration: 380, delay: stagger(230) }, 160)
    })
    return () => scope.revert()
  }, [inView, shouldReduceMotion])

  return (
    <div ref={root} className="response-window-exhibit" data-motion-owner="anime">
      <svg viewBox="0 0 920 280" aria-hidden="true">
        <path className="response-window-path" d="M80 180 C230 62 350 62 460 180 S700 298 840 180" />
      </svg>
      <div className="response-marker response-before">
        <span>14:00</span><strong>服藥前測試</strong><small>動作快照 A</small>
      </div>
      <div className="response-marker response-anchor">
        <Clock3 /><span>14:02</span><strong>發藥時間錨點</strong><small>已發藥 ≠ 已服藥</small>
      </div>
      <div className="response-marker response-after">
        <span>約 15:02</span><strong>服藥後測試</strong><small>動作快照 B</small>
      </div>
      <div className="response-window-label"><i /><span>約 60 分鐘觀察窗</span><i /></div>
    </div>
  )
}

type PatternState = 'baseline' | 'invalid' | 'single' | 'attention' | 'escalation'

const patternStates: Record<PatternState, {
  tab: string
  title: string
  note: string
  values: number[]
  tone: 'calm' | 'amber'
}> = {
  baseline: {
    tab: '個人基線',
    title: '建立自己的近期範圍',
    note: '先累積 7–14 組有效配對，不與他人比較。',
    values: [51, 55, 49, 57, 53, 56, 52, 54],
    tone: 'calm'
  },
  invalid: {
    tab: '測試無效',
    title: '資料品質不足，先引導重測',
    note: '單次無效不納入趨勢，也不自動升級。',
    values: [51, 55, 49, 57, 53, 56, 52, 53],
    tone: 'amber'
  },
  single: {
    tab: '單次偏離',
    title: '只記錄，不通知',
    note: '單一有效偏離不足以形成臨床結論。',
    values: [51, 55, 49, 57, 53, 56, 52, 68],
    tone: 'amber'
  },
  attention: {
    tab: '3 次中 2 次',
    title: '發送非緊急照護提醒',
    note: '最近三次中兩次有效偏離，請照顧者關注。',
    values: [51, 55, 49, 57, 53, 65, 54, 68],
    tone: 'amber'
  },
  escalation: {
    tab: '連續 3 次',
    title: '建立回診摘要',
    note: '連續三次有效偏離，進入共同複核流程。',
    values: [51, 55, 49, 57, 53, 63, 66, 68],
    tone: 'amber'
  }
}

export function PersonalPatternChapter({ onOpen }: { onOpen: () => void }) {
  const chapter = chapters[5]
  const [state, setState] = useState<PatternState>('baseline')
  const copy = patternStates[state]
  const stateOrder = Object.keys(patternStates) as PatternState[]
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, item: PatternState) => {
    const index = stateOrder.indexOf(item)
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % stateOrder.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + stateOrder.length) % stateOrder.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = stateOrder.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    const nextState = stateOrder[nextIndex]
    setState(nextState)
    window.requestAnimationFrame(() => document.getElementById(`pattern-tab-${nextState}`)?.focus())
  }
  return (
    <ChapterFrame
      chapter={chapter}
      kicker="YOUR PATTERN, NOT OTHER PEOPLE'S"
      title={'觀察同一個人的軌跡，\n不和任何人比較。'}
      lead="個人基線先形成，資料點才按時間被放進長期脈絡。偏離代表值得複核，不代表一定改善或惡化。"
      safety={<><strong>單次結果不做臨床結論。</strong> 點擊速度不能推論急性危險；門檻是待臨床校準的原型規則。</>}
      className="pattern-chapter"
    >
      <div className="pattern-state-tabs" role="tablist" aria-label="個人趨勢狀態">
        {stateOrder.map((item) => (
          <button
            key={item}
            id={`pattern-tab-${item}`}
            role="tab"
            aria-selected={state === item}
            aria-controls="pattern-state-panel"
            tabIndex={state === item ? 0 : -1}
            onClick={() => setState(item)}
            onKeyDown={(event) => handleTabKeyDown(event, item)}
          >
            {state === item ? <motion.i layoutId="pattern-tab" /> : null}
            <span>{patternStates[item].tab}</span>
          </button>
        ))}
      </div>
      <PatternTrajectory state={state} />
      <motion.div className={`pattern-insight tone-${copy.tone}`} layout aria-live="polite">
        <span>{state === 'baseline' ? <Activity /> : state === 'escalation' ? <BellRing /> : <ShieldCheck />}</span>
        <div>
          <small>CURRENT INTERPRETATION</small>
          <strong>{copy.title}</strong>
          <p>{copy.note}</p>
        </div>
      </motion.div>
      <ExhibitAction
        eyebrow="FIVE TRACE STATES"
        title="從基線建立到回診摘要"
        body="完整操作模式保留五種趨勢狀態、通知層級與個人近期範圍。"
        label="開啟個人反應軌跡"
        onClick={onOpen}
      />
    </ChapterFrame>
  )
}

function PatternTrajectory({ state }: { state: PatternState }) {
  const root = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const initialValues = patternStates.baseline.values
  const pointsFor = (values: number[]) => values.map((value, index) => [66 + index * 104, 250 - (value - 40) * 6] as const)
  const pathFor = (values: number[]) => pointsFor(values).map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')

  useEffect(() => {
    if (!root.current) return
    scopeRef.current = createScope({ root }).add((self) => {
      if (!self) return
      self.add('renderPattern', (nextState: PatternState) => {
        const values = patternStates[nextState].values
        const path = root.current?.querySelector<SVGPathElement>('.pattern-trajectory-line')
        const points = Array.from(root.current?.querySelectorAll<SVGCircleElement>('.pattern-trajectory-point') ?? [])
        if (!path) return
        const duration = shouldReduceMotion ? 0 : 520
        animate(path, { d: pathFor(values), duration, ease: 'inOut(2)' })
        points.forEach((point, index) => {
          const [, cy] = pointsFor(values)[index]
          animate(point, { cy, duration, delay: shouldReduceMotion ? 0 : index * 28, ease: 'out(3)' })
        })
      })
    })
    return () => {
      scopeRef.current?.revert()
      scopeRef.current = null
    }
  }, [shouldReduceMotion])

  useEffect(() => {
    scopeRef.current?.methods.renderPattern?.(state)
  }, [state, shouldReduceMotion])

  return (
    <div
      ref={root}
      id="pattern-state-panel"
      className="pattern-trajectory"
      data-motion-owner="anime"
      role="tabpanel"
      aria-labelledby={`pattern-tab-${state}`}
      tabIndex={0}
    >
      <header><span>同一個人的服藥前後差值</span><strong>概念展示／模擬資料</strong></header>
      <svg viewBox="0 0 820 310" role="img" aria-label={`${patternStates[state].title}趨勢圖`}>
        <rect x="42" y="142" width="750" height="76" rx="18" className="pattern-baseline-band" />
        {[90, 150, 210, 270].map((y) => <line key={y} x1="42" x2="792" y1={y} y2={y} className="pattern-grid-line" />)}
        <path className="pattern-trajectory-line" d={pathFor(initialValues)} />
        {pointsFor(initialValues).map(([cx, cy], index) => (
          <circle key={index} className="pattern-trajectory-point" cx={cx} cy={cy} r={index === 7 ? 7 : 5} />
        ))}
        {state === 'invalid' ? <circle className="pattern-invalid-ring" cx="794" cy="172" r="12" /> : null}
        <text x="58" y="164">個人基線帶</text>
      </svg>
      <footer><span>7 / 19</span><span>7 / 22</span><span>7 / 25</span><span>今天</span></footer>
    </div>
  )
}

export function HumanReviewChapter({
  onOpen,
  onResearch,
  onClinical,
  onRestart
}: {
  onOpen: () => void
  onResearch: () => void
  onClinical: () => void
  onRestart: () => void
}) {
  const chapter = chapters[6]
  return (
    <ChapterFrame
      chapter={chapter}
      kicker="HUMAN REVIEW"
      title={'科技看見節律，\n人共同完成決策。'}
      lead="AI 記錄，系統整理，照顧者確認，醫療團隊複核。科技逐步退到背景，把判斷權交還給患者與照護關係。"
      safety={<><strong>AI 不診斷、不調藥、不停止用藥。</strong> 處方與醫療決策始終在系統之外受到保護。</>}
      className="review-chapter dark-chapter"
    >
      <HumanHandoff />
      <ExhibitAction
        eyebrow="SHARED REVIEW"
        title="1 次記錄 · 2 次提醒 · 3 次摘要"
        body="用原型規則模擬器查看單次偏離、非緊急提醒與回診摘要如何形成。"
        label="開啟共同複核流程"
        onClick={onOpen}
        dark
      />
      <div className="exhibition-finale">
        <p>Technology observes the rhythm.</p>
        <p>People make the decision.</p>
        <span>科技協助看見變化，醫療決策仍由人共同完成。</span>
        <div>
          <button onClick={onRestart}><RotateCcw />重新體驗</button>
          <button onClick={onResearch}><BookOpenText />查看研究依據</button>
          <button className="finale-primary" onClick={onClinical}>進入完整操作模式<ArrowRight /></button>
        </div>
      </div>
      <footer className="exhibition-disclaimer">
        <strong>KineBalance · 概念原型</strong>
        <p>本系統不是診斷工具，也不是已驗證醫療器材。研究支持可行性，不代表已證明改善臨床結果。</p>
      </footer>
    </ChapterFrame>
  )
}

function HumanHandoff() {
  const roles = [
    { index: '01', label: 'AI 記錄', note: '保留每次有效資料', icon: BrainCircuit },
    { index: '02', label: '系統整理', note: '辨識重複且有效的偏離', icon: Activity },
    { index: '03', label: '照顧者確認', note: '補充日常生活脈絡', icon: HeartHandshake },
    { index: '04', label: '醫療團隊複核', note: '結合臨床資訊決策', icon: Stethoscope }
  ]
  return (
    <div className="human-handoff">
      <ol>
        {roles.map(({ index, label, note, icon: Icon }) => (
          <li key={index}>
            <span><Icon /></span>
            <small>{index}</small>
            <strong>{label}</strong>
            <p>{note}</p>
          </li>
        ))}
      </ol>
      <div className="human-relationship">
        <div><UserRound /><strong>患者</strong></div>
        <i />
        <div><HeartHandshake /><strong>照顧者</strong></div>
        <i />
        <div><Stethoscope /><strong>醫療團隊</strong></div>
      </div>
    </div>
  )
}

function ExhibitAction({
  eyebrow,
  title,
  body,
  label,
  onClick,
  dark = false
}: {
  eyebrow: string
  title: string
  body: string
  label: string
  onClick: () => void
  dark?: boolean
}) {
  return (
    <motion.div className={`exhibit-action ${dark ? 'dark' : ''}`} layout>
      <div>
        <small>{eyebrow}</small>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <motion.button onClick={onClick} whileTap={{ scale: 0.985 }}>
        <Play aria-hidden="true" />
        <span>{label}</span>
        <ArrowRight aria-hidden="true" />
      </motion.button>
    </motion.div>
  )
}
