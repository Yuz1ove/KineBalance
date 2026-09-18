import { useEffect, useRef, useState } from 'react'
import WorkspaceApp from '../workspace/WorkspaceApp'
import { LandingPage } from './LandingPage'
import { MotionProvider } from './MotionPreference'

export const isWorkspaceHash = () => /^#[0-5]$/.test(location.hash) || ['#workspace', '#workspace-main'].includes(location.hash)
function Experience() {
  const lastRoute = useRef(isWorkspaceHash() ? location.hash : '#0')
  const [workspace, setWorkspace] = useState(isWorkspaceHash)
  const [visited, setVisited] = useState(isWorkspaceHash)
  const [transition, setTransition] = useState(false)
  useEffect(() => {
    const update = () => {
      const next = isWorkspaceHash()
      setWorkspace(next)
      if (next) { setVisited(true); if (location.hash !== '#workspace-main') lastRoute.current = location.hash }
      setTransition(false)
    }
    addEventListener('hashchange', update); addEventListener('popstate', update)
    return () => { removeEventListener('hashchange', update); removeEventListener('popstate', update) }
  }, [])
  useEffect(() => {
    if (!workspace) document.title = 'KineBalance｜讓每一次量測，都有清楚的脈絡'
    const frame = requestAnimationFrame(() => {
      if (workspace) document.getElementById('workspace-main')?.focus({ preventScroll: true })
      else if (!['#intro', '#workflow'].includes(location.hash)) document.getElementById('cover-title')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [workspace])
  // Navigation completes synchronously. CSS adds motion; no timer or overlay gates entry.
  const enter = () => {
    history.pushState(null, '', lastRoute.current); setVisited(true); setWorkspace(true); setTransition(true)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const returnToCover = () => {
    if (isWorkspaceHash() && location.hash !== '#workspace-main') lastRoute.current = location.hash
    history.pushState(null, '', '#cover'); setWorkspace(false); setTransition(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return <div className="kb-experience">
    {!workspace && <LandingPage onEnter={enter} />}
    {visited && <div hidden={!workspace} className={transition ? 'kb-workspace-frame kb-enter' : 'kb-workspace-frame'} onAnimationEnd={e => { if (e.target === e.currentTarget) setTransition(false) }}>
      <WorkspaceApp visible={workspace} onReturnToCover={returnToCover} onRouteChange={hash => { lastRoute.current = hash }} />
    </div>}
  </div>
}
export default function ExperienceRoot() { return <MotionProvider><Experience /></MotionProvider> }
