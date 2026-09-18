import { useEffect, useRef } from 'react'
import { ExternalLink, FlaskConical, ShieldCheck, X } from 'lucide-react'
import { researchSources } from '../data/research'

interface ResearchPanelProps {
  open: boolean
  onClose: () => void
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

interface BackgroundState {
  element: HTMLElement
  ariaHidden: string | null
  inert: boolean
}

export function ResearchPanel({ open, onClose }: ResearchPanelProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    layer.inert = !open
    if (!open) return

    const activeElement = document.activeElement
    openerRef.current = activeElement instanceof HTMLElement && !layer.contains(activeElement)
      ? activeElement
      : null

    const backgroundState: BackgroundState[] = Array.from(layer.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== layer)
      .map((element) => ({
        element,
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.inert
      }))

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    // Move focus into the dialog before hiding the background. Browsers reject
    // aria-hidden when it would contain the currently focused opener.
    backgroundState.forEach(({ element }) => {
      element.inert = true
      element.setAttribute('aria-hidden', 'true')
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const drawer = drawerRef.current
      if (!drawer) return
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getAttribute('aria-hidden') !== 'true' && !element.closest('[inert]'))
      const first = focusable[0] ?? drawer
      const last = focusable[focusable.length - 1] ?? drawer
      const focused = document.activeElement

      if (!drawer.contains(focused)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && focused === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousBodyOverflow
      backgroundState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert
        if (ariaHidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', ariaHidden)
      })
      if (openerRef.current?.isConnected) openerRef.current.focus()
      openerRef.current = null
    }
  }, [open])

  return (
    <div
      ref={layerRef}
      className={`drawer-layer ${open ? 'open' : ''}`}
      aria-hidden={!open}
    >
      <button
        className="drawer-scrim"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        className="research-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <p className="eyebrow">臨床證據與限制</p>
            <h2 id="research-title">研究依據與誠實邊界</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label="關閉">
            <X />
          </button>
        </header>

        <div className="evidence-summary">
          <FlaskConical aria-hidden="true" />
          <p>
            文獻支持數位動作量測與居家長期追蹤的可行性；目前尚未證明
            KineBalance 能改善臨床結果。
          </p>
        </div>

        <div className="boundary-list">
          <p><ShieldCheck />穿戴資料本身不一定改善日常動作波動。</p>
          <p><ShieldCheck />發藥紀錄不等於患者已吞下藥物。</p>
          <p><ShieldCheck />本系統是追蹤與共同複核工具，不做診斷或自動調藥。</p>
        </div>

        <div className="source-list">
          {researchSources.map((source) => (
            <a href={source.href} target="_blank" rel="noreferrer" key={source.href}>
              <span className="source-year">{source.year}</span>
              <span>
                <strong>{source.title}</strong>
                <small>{source.takeaway}</small>
                <em>限制：{source.limitation}</em>
              </span>
              <ExternalLink aria-label="開啟來源" />
            </a>
          ))}
        </div>
      </aside>
    </div>
  )
}
