import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { ArrowDown, BookOpenText, Menu, ShieldCheck, X } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform
} from 'motion/react'
import type { SceneId } from '../types'
import { animationTokens } from '../animation/tokens'
import { chapters, type ChapterDefinition, type ChapterId } from './manifest'
import './ExhibitionMode.css'

const MedicationChapter = lazy(() => import('./DeferredChapters').then((module) => ({
  default: module.MedicationChapter
})))
const MotionSnapshotChapter = lazy(() => import('./DeferredChapters').then((module) => ({
  default: module.MotionSnapshotChapter
})))
const DispenseChapter = lazy(() => import('./DeferredChapters').then((module) => ({
  default: module.DispenseChapter
})))
const ResponseWindowChapter = lazy(() => import('./DeferredChapters').then((module) => ({
  default: module.ResponseWindowChapter
})))
const PersonalPatternChapter = lazy(() => import('./DeferredChapters').then((module) => ({
  default: module.PersonalPatternChapter
})))
const HumanReviewChapter = lazy(() => import('./DeferredChapters').then((module) => ({
  default: module.HumanReviewChapter
})))

interface ExhibitionModeProps {
  activeChapter: ChapterId
  onActiveChapter: (chapter: ChapterId) => void
  onOpenScene: (scene: SceneId) => void
  onOpenResearch: () => void
  onEnterClinical: () => void
  suspended: boolean
}

export function ExhibitionMode({
  activeChapter,
  onActiveChapter,
  onOpenScene,
  onOpenResearch,
  onEnterClinical,
  suspended
}: ExhibitionModeProps) {
  const modeRoot = useRef<HTMLDivElement>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const openingDepth = useTransform(scrollYProgress, [0, 0.14], [0, shouldReduceMotion ? 0 : -54])

  const jumpTo = (chapter: ChapterId, explicit = true) => {
    const target = document.getElementById(chapter)
    if (!target) return
    setMobileNavOpen(false)
    onActiveChapter(chapter)
    if (explicit) window.history.pushState(null, '', `#${chapter}`)
    target.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  useEffect(() => {
    const sections = chapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((section): section is HTMLElement => Boolean(section))
    if (!sections.length || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      const id = visible?.target.id as ChapterId | undefined
      if (!id) return
      onActiveChapter(id)
      window.history.replaceState(null, '', `#${id}`)
    }, {
      rootMargin: '-34% 0px -48% 0px',
      threshold: [0, 0.2, 0.5, 0.8]
    })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [onActiveChapter])

  useEffect(() => {
    if (!modeRoot.current) return
    modeRoot.current.inert = suspended
  }, [suspended])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  return (
    <motion.div
      ref={modeRoot}
      className={`exhibition-mode ${suspended ? 'is-suspended' : ''}`}
      data-testid="exhibition-mode"
      data-experience-mode="exhibition"
      aria-hidden={suspended || undefined}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.45 }}
    >
      <motion.div className="exhibition-scroll-progress" style={{ scaleX: scrollYProgress }} />

      <header className="exhibition-header">
        <button className="exhibition-brand" onClick={() => jumpTo('rhythm')} aria-label="回到 KineBalance 開場">
          <strong>KineBalance</strong>
          <span>用藥節律 × 動作反應追蹤</span>
        </button>
        <nav className="exhibition-top-nav" aria-label="展覽章節導覽">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              className={activeChapter === chapter.id ? 'active' : ''}
              aria-current={activeChapter === chapter.id ? 'location' : undefined}
              onClick={() => jumpTo(chapter.id)}
            >
              {chapter.nav}
            </button>
          ))}
        </nav>
        <div className="exhibition-header-actions">
          <button className="exhibition-icon-action" onClick={onOpenResearch} aria-label="查看研究依據">
            <BookOpenText aria-hidden="true" />
          </button>
          <motion.button
            className="exhibition-mode-action"
            onClick={onEnterClinical}
            whileTap={{ scale: 0.98 }}
          >
            完整操作模式
          </motion.button>
          <button
            className="exhibition-mobile-menu"
            aria-label={mobileNavOpen ? '關閉章節選單' : '開啟章節選單'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            {mobileNavOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.nav
            className="exhibition-mobile-sheet"
            aria-label="手機章節導覽"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
          >
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                className={activeChapter === chapter.id ? 'active' : ''}
                onClick={() => jumpTo(chapter.id)}
              >
                <span>{chapter.index}</span>
                <strong>{chapter.nav}</strong>
                <small>{chapter.title}</small>
              </button>
            ))}
          </motion.nav>
        ) : null}
      </AnimatePresence>

      <ChapterRail activeChapter={activeChapter} onJump={jumpTo} />

      <main id="exhibition-main">
        <motion.div style={{ y: openingDepth }}>
          <OpeningChapter onExplore={() => jumpTo('medication')} suspended={suspended} />
        </motion.div>
        <DeferredChapterSlot chapter={chapters[1]}>
          <MedicationChapter onOpen={() => onOpenScene('schedule')} />
        </DeferredChapterSlot>
        <DeferredChapterSlot chapter={chapters[2]} dark>
          <MotionSnapshotChapter onOpen={() => onOpenScene('tap')} />
        </DeferredChapterSlot>
        <DeferredChapterSlot chapter={chapters[3]}>
          <DispenseChapter onOpen={() => onOpenScene('dispense')} />
        </DeferredChapterSlot>
        <DeferredChapterSlot chapter={chapters[4]} dark>
          <ResponseWindowChapter onOpen={() => onOpenScene('followup')} />
        </DeferredChapterSlot>
        <DeferredChapterSlot chapter={chapters[5]}>
          <PersonalPatternChapter onOpen={() => onOpenScene('trend')} />
        </DeferredChapterSlot>
        <DeferredChapterSlot chapter={chapters[6]} dark>
          <HumanReviewChapter
            onOpen={() => onOpenScene('review')}
            onResearch={onOpenResearch}
            onClinical={onEnterClinical}
            onRestart={() => jumpTo('rhythm')}
          />
        </DeferredChapterSlot>
      </main>

      <nav className="exhibition-mobile-bottom" aria-label="目前展覽章節">
        <button onClick={() => setMobileNavOpen(true)}>
          <span>{chapters.find((chapter) => chapter.id === activeChapter)?.index}</span>
          <strong>{chapters.find((chapter) => chapter.id === activeChapter)?.nav}</strong>
        </button>
        <button onClick={onEnterClinical}>完整操作</button>
      </nav>
    </motion.div>
  )
}

function DeferredChapterSlot({
  chapter,
  dark = false,
  children
}: {
  chapter: ChapterDefinition
  dark?: boolean
  children: ReactNode
}) {
  return (
    <div id={chapter.id} className="deferred-chapter-slot">
      <Suspense fallback={<ChapterPlaceholder chapter={chapter} dark={dark} />}>
        {children}
      </Suspense>
    </div>
  )
}

function ChapterPlaceholder({ chapter, dark }: { chapter: ChapterDefinition; dark: boolean }) {
  return (
    <section
      className={`exhibition-chapter exhibition-chapter-placeholder ${dark ? 'dark-chapter' : ''}`}
      aria-busy="true"
      aria-label={`正在載入${chapter.nav}`}
    >
      <div className="chapter-copy" aria-hidden="true">
        <div className="chapter-index">{chapter.index}</div>
        <div className="chapter-placeholder-line chapter-placeholder-kicker" />
        <div className="chapter-placeholder-line chapter-placeholder-title" />
        <div className="chapter-placeholder-line chapter-placeholder-copy" />
      </div>
      <div className="chapter-exhibit" aria-hidden="true">
        <div className="chapter-placeholder-card" />
      </div>
    </section>
  )
}

function ChapterRail({
  activeChapter,
  onJump
}: {
  activeChapter: ChapterId
  onJump: (chapter: ChapterId) => void
}) {
  return (
    <nav className="chapter-rail" aria-label="目前章節">
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <button
              className={activeChapter === chapter.id ? 'active' : ''}
              onClick={() => onJump(chapter.id)}
              aria-label={`前往 ${chapter.nav}`}
            >
              <span>{chapter.index}</span>
              <i />
              <strong>{chapter.nav}</strong>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function OpeningChapter({ onExplore, suspended }: { onExplore: () => void; suspended: boolean }) {
  const root = useRef<HTMLElement>(null)
  const timelineRef = useRef<{ pause: () => unknown; resume: () => unknown } | null>(null)
  const suspendedRef = useRef(suspended)
  const shouldReduceMotion = useReducedMotion()
  suspendedRef.current = suspended

  useEffect(() => {
    if (suspended) timelineRef.current?.pause()
    else timelineRef.current?.resume()
  }, [suspended])

  useLayoutEffect(() => {
    if (!root.current || shouldReduceMotion) return
    let disposed = false
    let revertScope: (() => void) | undefined

    void import('animejs').then(({ createScope, createTimeline, stagger, svg }) => {
      if (disposed || !root.current) return
      const scope = createScope({ root }).add(() => {
        const line = root.current?.querySelector<SVGPathElement>('.opening-time-line')
        if (!line) return
        const [drawable] = svg.createDrawable(line)
        line.style.visibility = 'visible'
        drawable.draw = '0 0'
        const timeline = createTimeline({ defaults: { ease: animationTokens.ease.narrative } })
        timelineRef.current = timeline
        timeline
          .add('.opening-eyebrow', { opacity: [0, 1], y: [14, 0], duration: 420 }, 0)
          .add('.opening-wordmark', { opacity: [0, 1], y: [18, 0], duration: 720 }, 230)
          .add('.opening-subtitle', { opacity: [0, 1], y: [10, 0], duration: 520 }, 620)
          .add(drawable, { draw: '0 1', duration: 1180, ease: 'inOut(2)' }, 740)
          .add('.opening-node', {
            opacity: [0, 1],
            scale: [0.78, 1],
            duration: 360,
            delay: stagger(145)
          }, 1020)
          .add('.opening-statement', { opacity: [0, 1], y: [12, 0], duration: 620 }, 1650)
          .add('.opening-explore', { opacity: [0, 1], y: [8, 0], duration: 480 }, 2170)
        if (suspendedRef.current) timeline.pause()
      })
      revertScope = () => scope.revert()
    })

    return () => {
      disposed = true
      timelineRef.current = null
      revertScope?.()
    }
  }, [shouldReduceMotion])

  const hiddenUntilTimeline = shouldReduceMotion ? undefined : { opacity: 0 }

  return (
    <section ref={root} id="rhythm" className="opening-chapter" aria-labelledby="rhythm-title" data-motion-owner="anime">
      <div className="opening-grid" aria-hidden="true" />
      <div className="opening-orbit opening-orbit-one" aria-hidden="true" />
      <div className="opening-orbit opening-orbit-two" aria-hidden="true" />
      <div className="opening-inner">
        <p className="opening-eyebrow" data-opening-animated style={hiddenUntilTimeline}>
          CHAPTER 00 · RHYTHM OF CARE
        </p>
        <h1 id="rhythm-title" className="opening-wordmark" data-opening-animated style={hiddenUntilTimeline}>
          KineBalance
        </h1>
        <p className="opening-subtitle" data-opening-animated style={hiddenUntilTimeline}>
          用藥節律 × 動作反應追蹤
        </p>

        <div className="opening-timeline" aria-label="從用藥前測試到共同複核的照護時間線">
          <svg viewBox="0 0 1000 120" aria-hidden="true">
            <path
              className="opening-time-line"
              d="M38 64 C188 28 292 88 434 59 S700 32 962 64"
              style={shouldReduceMotion ? undefined : { visibility: 'hidden' }}
            />
          </svg>
          <ol>
            {[
              ['服藥前', '留下動作快照'],
              ['用藥', '可信時間錨點'],
              ['發藥', '實體核對交付'],
              ['約 60 分鐘', '再次記錄反應'],
              ['共同複核', '由人完成決策']
            ].map(([time, label], index) => (
              <li
                key={time}
                className="opening-node"
                data-opening-animated
                style={hiddenUntilTimeline}
              >
                <i><span>{String(index + 1).padStart(2, '0')}</span></i>
                <strong>{time}</strong>
                <small>{label}</small>
              </li>
            ))}
          </ol>
        </div>

        <p className="opening-statement" data-opening-animated style={hiddenUntilTimeline}>
          每一次用藥，<br />都是理解動作變化的時間錨點。
        </p>
        <button
          className="opening-explore"
          data-opening-animated
          onClick={onExplore}
          style={hiddenUntilTimeline}
        >
          <span>開始探索</span>
          <ArrowDown aria-hidden="true" />
        </button>
      </div>
      <aside className="opening-boundary">
        <ShieldCheck aria-hidden="true" />
        <span>AI 只協助記錄、提醒與複核</span>
        <strong>不診斷 · 不調藥 · 不停止用藥</strong>
      </aside>
    </section>
  )
}
