import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Circle,
  Menu,
  ShieldCheck,
  Users,
  X
} from 'lucide-react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { ResearchPanel } from './components/ResearchPanel'
import { SceneNav, type SceneDefinition } from './components/SceneNav'
import { ExhibitionMode } from './exhibition/ExhibitionMode'
import {
  chapterForScene,
  isChapterId,
  sceneForChapter,
  type ChapterId
} from './exhibition/manifest'
import { ScheduleScene } from './scenes/ScheduleScene'
import type { SceneId } from './types'

const TapTestScene = lazy(() => import('./scenes/TapTestScene').then((module) => ({ default: module.TapTestScene })))
const DispenseScene = lazy(() => import('./scenes/DispenseScene').then((module) => ({ default: module.DispenseScene })))
const FollowUpScene = lazy(() => import('./scenes/FollowUpScene').then((module) => ({ default: module.FollowUpScene })))
const TrendScene = lazy(() => import('./scenes/TrendScene').then((module) => ({ default: module.TrendScene })))
const ReviewScene = lazy(() => import('./scenes/ReviewScene').then((module) => ({ default: module.ReviewScene })))

type ExperienceMode = 'exhibition' | 'clinical'

const scenes: SceneDefinition[] = [
  { id: 'schedule', short: '今日', title: '用藥時程' },
  { id: 'tap', short: '服藥前', title: '指尖測試' },
  { id: 'dispense', short: '實體', title: '發藥核對' },
  { id: 'followup', short: '服藥後', title: '反應追蹤' },
  { id: 'trend', short: '長期', title: '個人趨勢' },
  { id: 'review', short: '共同', title: '團隊複核' }
]

const indexForScene = (scene: SceneId) => Math.max(0, scenes.findIndex((item) => item.id === scene))

const routeFromHash = (): { mode: ExperienceMode; chapter: ChapterId; scene: SceneId } => {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash.startsWith('clinical/')) {
    const requested = hash.slice('clinical/'.length) as SceneId
    const scene = scenes.some((item) => item.id === requested) ? requested : 'schedule'
    return { mode: 'clinical', scene, chapter: chapterForScene(scene) }
  }
  const chapter = isChapterId(hash) ? hash : 'rhythm'
  return { mode: 'exhibition', chapter, scene: sceneForChapter(chapter) }
}

function App() {
  const initialRoute = useMemo(routeFromHash, [])
  const [mode, setMode] = useState<ExperienceMode>(initialRoute.mode)
  const [current, setCurrent] = useState(indexForScene(initialRoute.scene))
  const [activeChapter, setActiveChapter] = useState<ChapterId>(initialRoute.chapter)
  const [visited, setVisited] = useState<Set<SceneId>>(new Set([initialRoute.scene]))
  const [researchOpen, setResearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [clinicalOpen, setClinicalOpen] = useState(initialRoute.mode === 'clinical')
  const clinicalTriggerRef = useRef<HTMLElement | null>(null)
  const shouldReduceMotion = useReducedMotion()

  const selectScene = useCallback((index: number, options: { open?: boolean; updateHash?: boolean } = {}) => {
    const nextIndex = Math.min(Math.max(index, 0), scenes.length - 1)
    const scene = scenes[nextIndex]
    setCurrent(nextIndex)
    setVisited((previous) => new Set([...previous, scene.id]))
    setActiveChapter(chapterForScene(scene.id))
    setMobileNavOpen(false)
    if (options.open !== false) setClinicalOpen(true)
    if (options.updateHash !== false && mode === 'clinical') {
      window.history.pushState(null, '', `#clinical/${scene.id}`)
    }
    if (mode === 'clinical') {
      window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    }
  }, [mode, shouldReduceMotion])

  const openScene = useCallback((scene: SceneId) => {
    clinicalTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    selectScene(indexForScene(scene), { open: true, updateHash: false })
  }, [selectScene])

  const next = useCallback(() => selectScene(Math.min(current + 1, scenes.length - 1)), [current, selectScene])
  const previous = useCallback(() => selectScene(Math.max(current - 1, 0)), [current, selectScene])

  const enterClinical = useCallback(() => {
    const scene = sceneForChapter(activeChapter)
    const sceneIndex = indexForScene(scene)
    setCurrent(sceneIndex)
    setVisited((previous) => new Set([...previous, scene]))
    setMode('clinical')
    setClinicalOpen(true)
    window.history.pushState(null, '', `#clinical/${scene}`)
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' })
  }, [activeChapter, shouldReduceMotion])

  const enterExhibition = useCallback(() => {
    const chapter = chapterForScene(scenes[current].id)
    setMode('exhibition')
    setClinicalOpen(false)
    setActiveChapter(chapter)
    window.history.pushState(null, '', `#${chapter}`)
    window.requestAnimationFrame(() => {
      const section = document.getElementById(chapter)
      section?.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
        block: 'start'
      })
      const heading = section?.querySelector<HTMLElement>('h1, h2')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus({ preventScroll: true })
    })
  }, [current, shouldReduceMotion])

  const closeClinicalOverlay = useCallback(() => {
    setClinicalOpen(false)
    window.history.replaceState(null, '', `#${activeChapter}`)
    window.requestAnimationFrame(() => clinicalTriggerRef.current?.focus())
  }, [activeChapter])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (researchOpen) setResearchOpen(false)
        else if (mode === 'exhibition' && clinicalOpen) closeClinicalOverlay()
        else setMobileNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clinicalOpen, closeClinicalOverlay, mode, researchOpen])

  useEffect(() => {
    const onPopState = () => {
      const route = routeFromHash()
      setMode(route.mode)
      setActiveChapter(route.chapter)
      setCurrent(indexForScene(route.scene))
      setVisited((previous) => new Set([...previous, route.scene]))
      setClinicalOpen(route.mode === 'clinical')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (mode !== 'exhibition' || !clinicalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [clinicalOpen, mode])

  const clinicalVisible = mode === 'clinical' || clinicalOpen
  const sceneContent = useMemo(() => scenes.map((scene, index) => {
    if (!visited.has(scene.id)) return null

    const active = clinicalVisible && current === index
    let content: React.ReactNode
    switch (scene.id) {
      case 'schedule':
        content = <ScheduleScene onNext={next} />
        break
      case 'tap':
        content = <Suspense fallback={<ClinicalLoading />}><TapTestScene onNext={next} active={active} /></Suspense>
        break
      case 'dispense':
        content = <Suspense fallback={<ClinicalLoading />}><DispenseScene onNext={next} active={active} /></Suspense>
        break
      case 'followup':
        content = <Suspense fallback={<ClinicalLoading />}><FollowUpScene onNext={next} active={active} /></Suspense>
        break
      case 'trend':
        content = <Suspense fallback={<ClinicalLoading />}><TrendScene onNext={next} /></Suspense>
        break
      case 'review':
        content = <Suspense fallback={<ClinicalLoading />}><ReviewScene onRestart={() => selectScene(0)} /></Suspense>
        break
    }

    return (
      <div
        key={scene.id}
        className="clinical-scene-slot"
        hidden={!active}
        aria-hidden={!active || undefined}
        data-clinical-scene={scene.id}
      >
        {content}
      </div>
    )
  }), [clinicalVisible, current, next, selectScene, visited])

  return (
    <MotionConfig reducedMotion="user">
      <div className="experience-root" data-experience-mode={mode}>
        <AnimatePresence initial={false} mode="wait">
          {mode === 'exhibition' ? (
            <ExhibitionMode
              key="exhibition"
              activeChapter={activeChapter}
              onActiveChapter={setActiveChapter}
              onOpenScene={openScene}
              onOpenResearch={() => setResearchOpen(true)}
              onEnterClinical={enterClinical}
              suspended={clinicalOpen}
            />
          ) : null}
        </AnimatePresence>

        <ClinicalExperience
          mode={mode}
          open={mode === 'clinical' || clinicalOpen}
          current={current}
          visited={visited}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((value) => !value)}
          onSelectScene={selectScene}
          onOpenResearch={() => setResearchOpen(true)}
          onEnterClinical={enterClinical}
          onEnterExhibition={enterExhibition}
          onCloseOverlay={closeClinicalOverlay}
          onPrevious={previous}
          onNext={next}
        >
          {sceneContent}
        </ClinicalExperience>

        <ResearchPanel open={researchOpen} onClose={() => setResearchOpen(false)} />
      </div>
    </MotionConfig>
  )
}

function ClinicalLoading() {
  return (
    <div className="clinical-loading" role="status">
      <span aria-hidden="true" />
      載入互動功能…
    </div>
  )
}

function ClinicalExperience({
  mode,
  open,
  current,
  visited,
  mobileNavOpen,
  onToggleMobileNav,
  onSelectScene,
  onOpenResearch,
  onEnterClinical,
  onEnterExhibition,
  onCloseOverlay,
  onPrevious,
  onNext,
  children
}: {
  mode: ExperienceMode
  open: boolean
  current: number
  visited: Set<SceneId>
  mobileNavOpen: boolean
  onToggleMobileNav: () => void
  onSelectScene: (index: number) => void
  onOpenResearch: () => void
  onEnterClinical: () => void
  onEnterExhibition: () => void
  onCloseOverlay: () => void
  onPrevious: () => void
  onNext: () => void
  children: React.ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()
  const overlay = mode === 'exhibition'
  const overlayCloseRef = useRef<HTMLButtonElement>(null)
  const clinicalMainRef = useRef<HTMLElement>(null)
  const clinicalRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const syncRuntimePolicy = () => {
      const paused = !open || document.visibilityState !== 'visible'
      document.documentElement.dataset.orientationGateActive = String(paused)
      window.dispatchEvent(new CustomEvent('kinebalance:orientation-gate-change', {
        detail: { active: paused }
      }))
    }
    syncRuntimePolicy()
    document.addEventListener('visibilitychange', syncRuntimePolicy)
    return () => {
      document.removeEventListener('visibilitychange', syncRuntimePolicy)
      document.documentElement.dataset.orientationGateActive = 'false'
      window.dispatchEvent(new CustomEvent('kinebalance:orientation-gate-change', {
        detail: { active: false }
      }))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (overlay) overlayCloseRef.current?.focus()
    else clinicalMainRef.current?.focus({ preventScroll: true })
  }, [open, overlay])

  const trapOverlayFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!overlay || !open || event.key !== 'Tab' || !clinicalRootRef.current) return
    const focusable = Array.from(clinicalRootRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.closest('[hidden]') && element.getAttribute('aria-hidden') !== 'true')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <motion.div
      ref={clinicalRootRef}
      className={`clinical-experience ${overlay ? 'clinical-overlay' : 'clinical-page'}`}
      data-testid="clinical-demo-mode"
      data-experience-mode="clinical"
      role={overlay ? 'dialog' : undefined}
      aria-modal={overlay ? true : undefined}
      aria-label={overlay ? `${scenes[current].title}互動展件` : undefined}
      aria-hidden={!open}
      hidden={!open}
      onKeyDown={trapOverlayFocus}
      layout={!shouldReduceMotion}
      initial={false}
      animate={{ opacity: open ? 1 : 0, y: open || shouldReduceMotion ? 0 : 18 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
          {overlay ? (
            <button
              className="clinical-overlay-scrim"
              onClick={onCloseOverlay}
              aria-label="關閉功能展件"
              aria-hidden="true"
              tabIndex={-1}
            />
          ) : null}
          <div className="clinical-experience-frame">
            {overlay ? (
              <div className="clinical-overlay-bar">
                <div>
                  <span>INTERACTIVE EXHIBIT · {scenes[current].short}</span>
                  <strong>{scenes[current].title}</strong>
                </div>
                <div className="clinical-overlay-actions">
                  <button className="clinical-overlay-mode" onClick={onEnterClinical}>
                    完整操作
                  </button>
                  <button ref={overlayCloseRef} onClick={onCloseOverlay} aria-label="關閉功能展件"><X /></button>
                </div>
              </div>
            ) : null}
            <div className="app-shell">
              <div className="app-content" data-orientation-gate-background>
                <header className="app-header">
                  <button className="brand" onClick={onEnterExhibition} aria-label="KineBalance 首頁">
                    <span>
                      <strong>KineBalance</strong>
                      <small>用藥節律 × 動作反應追蹤</small>
                    </span>
                  </button>
                  <div className="header-date" aria-label="目前展示日期">
                    2026.08.13 <span>·</span> 星期四
                  </div>
                  <div className="header-actions">
                    <div className="caregiver-status" aria-label="家屬連線正常">
                      <Circle aria-hidden="true" />
                      <Users aria-hidden="true" />
                      家屬連線正常
                    </div>
                    <button className="research-button" onClick={onOpenResearch}>
                      <BookOpenText />
                      研究依據
                    </button>
                    <button
                      className="mobile-menu-button"
                      aria-expanded={mobileNavOpen}
                      aria-label={mobileNavOpen ? '關閉場景選單' : '開啟場景選單'}
                      onClick={onToggleMobileNav}
                    >
                      {mobileNavOpen ? <X /> : <Menu />}
                    </button>
                  </div>
                </header>

                <div className="safety-banner">
                  <ShieldCheck />
                  <p>
                    <strong>安全邊界：</strong>
                    AI 不能停止帕金森氏症用藥，也不能更改藥物、劑量或服藥時間；點擊結果不阻擋或延誤依醫囑用藥。
                  </p>
                  <span>非診斷／非醫療器材驗證</span>
                </div>

                <div className={`workspace ${mobileNavOpen ? 'nav-open' : ''}`}>
                  <aside className="sidebar">
                    <SceneNav scenes={scenes} current={current} visited={visited} onSelect={onSelectScene} />
                    <div className="sidebar-footnote">
                      <button className="return-exhibition-button" onClick={onEnterExhibition}>
                        <ArrowLeft /> 返回展覽首頁
                      </button>
                      <span>概念原型資料</span>
                      <p>所有藥物、分數與趨勢數據均為概念展示或模擬資料。</p>
                    </div>
                  </aside>

                  <main ref={clinicalMainRef} id="main" className="main-content" tabIndex={-1}>
                    <div className="scene-progress" aria-hidden="true">
                      <span style={{ transform: `scaleX(${(current + 1) / scenes.length})` }} />
                    </div>
                    <div className="scene-transition">
                      {children}
                    </div>
                    <nav className="bottom-navigation" aria-label="場景前後導覽">
                      <button className="secondary-button" onClick={onPrevious} disabled={current === 0}>
                        <ArrowLeft /> 上一個場景
                      </button>
                      <span>{current + 1} / {scenes.length}</span>
                      <button className="secondary-button" onClick={onNext} disabled={current === scenes.length - 1}>
                        下一個場景 <ArrowRight />
                      </button>
                    </nav>
                  </main>
                </div>

                <footer className="app-footer">
                  <span>KineBalance · 概念原型</span>
                  <p>本系統用於長期追蹤與共同複核，不進行診斷、不自動調藥，也不確認患者已實際吞服藥物。</p>
                </footer>
              </div>
            </div>
          </div>
    </motion.div>
  )
}

export default App
