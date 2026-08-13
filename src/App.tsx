import { useEffect, useMemo, useState } from 'react'
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
import { ResearchPanel } from './components/ResearchPanel'
import { MobileOrientationGate } from './components/MobileOrientationGate'
import { SceneNav, type SceneDefinition } from './components/SceneNav'
import { DispenseScene } from './scenes/DispenseScene'
import { FollowUpScene } from './scenes/FollowUpScene'
import { ReviewScene } from './scenes/ReviewScene'
import { ScheduleScene } from './scenes/ScheduleScene'
import { TapTestScene } from './scenes/TapTestScene'
import { TrendScene } from './scenes/TrendScene'
import type { SceneId } from './types'

const scenes: SceneDefinition[] = [
  { id: 'schedule', short: '今日', title: '用藥時程' },
  { id: 'tap', short: '服藥前', title: '指尖測試' },
  { id: 'dispense', short: '實體', title: '發藥核對' },
  { id: 'followup', short: '服藥後', title: '反應追蹤' },
  { id: 'trend', short: '長期', title: '個人趨勢' },
  { id: 'review', short: '共同', title: '團隊複核' }
]

function App() {
  const [current, setCurrent] = useState(0)
  const [visited, setVisited] = useState<Set<SceneId>>(new Set(['schedule']))
  const [researchOpen, setResearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const selectScene = (index: number) => {
    setCurrent(index)
    setVisited((previous) => new Set([...previous, scenes[index].id]))
    setMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => selectScene(Math.min(current + 1, scenes.length - 1))
  const previous = () => selectScene(Math.max(current - 1, 0))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setResearchOpen(false)
        setMobileNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const sceneContent = useMemo(() => {
    switch (scenes[current].id) {
      case 'schedule':
        return <ScheduleScene onNext={next} />
      case 'tap':
        return <TapTestScene onNext={next} />
      case 'dispense':
        return <DispenseScene onNext={next} />
      case 'followup':
        return <FollowUpScene onNext={next} />
      case 'trend':
        return <TrendScene onNext={next} />
      case 'review':
        return <ReviewScene onRestart={() => selectScene(0)} />
    }
  }, [current])

  return (
    <div className="app-shell">
      <div className="app-content" data-orientation-gate-background>
        <header className="app-header">
          <a className="brand" href="#main" aria-label="KineBalance 首頁">
            <span>
              <strong>KineBalance</strong>
              <small>用藥節律 × 動作反應追蹤</small>
            </span>
          </a>
          <div className="header-date" aria-label="目前展示日期">
            2026.08.13 <span>·</span> 星期四
          </div>
          <div className="header-actions">
            <div className="caregiver-status" aria-label="家屬連線正常">
              <Circle aria-hidden="true" />
              <Users aria-hidden="true" />
              家屬連線正常
            </div>
            <button className="research-button" onClick={() => setResearchOpen(true)}>
              <BookOpenText />
              研究依據
            </button>
            <button
              className="mobile-menu-button"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? '關閉場景選單' : '開啟場景選單'}
              onClick={() => setMobileNavOpen((value) => !value)}
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
            <SceneNav scenes={scenes} current={current} visited={visited} onSelect={selectScene} />
            <div className="sidebar-footnote">
              <span>概念原型資料</span>
              <p>所有藥物、分數與趨勢數據均為概念展示或模擬資料。</p>
            </div>
          </aside>

          <main id="main" className="main-content">
            <div className="scene-progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${(current + 1) / scenes.length})` }} />
            </div>
            <div className="scene-transition" key={scenes[current].id}>
              {sceneContent}
            </div>
            <nav className="bottom-navigation" aria-label="場景前後導覽">
              <button className="secondary-button" onClick={previous} disabled={current === 0}>
                <ArrowLeft /> 上一個場景
              </button>
              <span>{current + 1} / {scenes.length}</span>
              <button className="secondary-button" onClick={next} disabled={current === scenes.length - 1}>
                下一個場景 <ArrowRight />
              </button>
            </nav>
          </main>
        </div>

        <footer className="app-footer">
          <span>KineBalance · 概念原型</span>
          <p>本系統用於長期追蹤與共同複核，不進行診斷、不自動調藥，也不確認患者已實際吞服藥物。</p>
        </footer>

        <ResearchPanel open={researchOpen} onClose={() => setResearchOpen(false)} />
      </div>
      <MobileOrientationGate backgroundSelector="[data-orientation-gate-background]" />
    </div>
  )
}

export default App
