import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const MotionContext = createContext({ reduced: false, requested: false, paused: false, system: false, toggleReduced: () => {}, togglePaused: () => {} })
const read = (key: string) => { try { return localStorage.getItem(key) === 'true' } catch { return false } }
export function MotionProvider({ children }: { children: ReactNode }) {
  const [requested, setRequested] = useState(() => read('kb-motion-reduced'))
  const [paused, setPaused] = useState(() => read('kb-motion-paused'))
  const [system, setSystem] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystem(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.kbReduced = String(requested || system)
    try { localStorage.setItem('kb-motion-reduced', String(requested)); localStorage.setItem('kb-motion-paused', String(paused)) } catch { /* settings remain usable in memory */ }
    return () => { delete document.documentElement.dataset.kbReduced }
  }, [requested, system, paused])
  return <MotionContext.Provider value={{ reduced: requested || system, requested, paused, system, toggleReduced: () => setRequested(v => !v), togglePaused: () => setPaused(v => !v) }}>{children}</MotionContext.Provider>
}
export const useMotionPreference = () => useContext(MotionContext)
export function MotionPreference() {
  const { requested, system, toggleReduced } = useMotionPreference()
  return <label className="kb-motion-setting"><input type="checkbox" checked={requested || system} disabled={system} onChange={toggleReduced} /><span>減少動態效果{system && '（依系統）'}</span></label>
}
