import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RotateCw, Smartphone } from 'lucide-react'
import { useMobileLandscape } from '../hooks/useMobileLandscape'
import './MobileOrientationGate.css'

const ORIENTATION_EVENT = 'kinebalance:orientation-gate-change'
const EXIT_DURATION_MS = 220

interface MobileOrientationGateProps {
  backgroundSelector?: string
}

interface BackgroundState {
  element: HTMLElement
  ariaHidden: string | null
  hadInert: boolean
}

const announceGateState = (active: boolean) => {
  window.dispatchEvent(new CustomEvent(ORIENTATION_EVENT, {
    detail: { active }
  }))
}

export function MobileOrientationGate({
  backgroundSelector = '[data-orientation-gate-background]'
}: MobileOrientationGateProps) {
  const device = useMobileLandscape()
  const [displayed, setDisplayed] = useState(device.shouldGate)
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const backgroundStateRef = useRef<BackgroundState | null>(null)
  const latestGateStateRef = useRef(device.shouldGate)
  latestGateStateRef.current = device.shouldGate
  const rendered = device.shouldGate || displayed

  const releaseBackground = () => {
    const backgroundState = backgroundStateRef.current
    if (!backgroundState) return
    if (!backgroundState.hadInert) backgroundState.element.removeAttribute('inert')
    if (backgroundState.ariaHidden === null) {
      backgroundState.element.removeAttribute('aria-hidden')
    } else {
      backgroundState.element.setAttribute('aria-hidden', backgroundState.ariaHidden)
    }
    backgroundStateRef.current = null
  }

  useEffect(() => {
    if (device.shouldGate) {
      setDisplayed(true)
      return
    }
    if (!displayed) return
    const timer = window.setTimeout(() => setDisplayed(false), EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [device.shouldGate, displayed])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.orientationGateActive = String(device.shouldGate)
    root.dataset.mobileLandscape = String(device.isMobileLandscape)
    root.style.setProperty('--kb-visual-viewport-height', `${device.visualHeight}px`)
    announceGateState(device.shouldGate)

    return () => {
      if (root.dataset.orientationGateActive === String(device.shouldGate)) {
        delete root.dataset.orientationGateActive
      }
      if (root.dataset.mobileLandscape === String(device.isMobileLandscape)) {
        delete root.dataset.mobileLandscape
      }
      root.style.removeProperty('--kb-visual-viewport-height')
    }
  }, [device.isMobileLandscape, device.shouldGate, device.visualHeight])

  // Layout effects pause already-running work before paint. This passive
  // announcement also reaches scene listeners that mount in the same commit.
  useEffect(() => {
    announceGateState(latestGateStateRef.current)
  }, [])

  useLayoutEffect(() => {
    if (!device.shouldGate) {
      releaseBackground()
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (previousFocus?.isConnected && previousFocus !== document.body) {
        previousFocus.focus()
      } else {
        dialogRef.current?.blur()
      }
      return
    }

    const activeElement = document.activeElement
    if (!previousFocusRef.current) {
      previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null
    }
    const background = document.querySelector<HTMLElement>(backgroundSelector)
    if (background) {
      backgroundStateRef.current = {
        element: background,
        ariaHidden: background.getAttribute('aria-hidden'),
        hadInert: background.hasAttribute('inert')
      }
      background.setAttribute('inert', '')
      background.setAttribute('aria-hidden', 'true')
    }

    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(focusFrame)
      releaseBackground()
    }
  }, [backgroundSelector, device.shouldGate])

  useEffect(() => () => {
    releaseBackground()
    const previousFocus = previousFocusRef.current
    previousFocusRef.current = null
    if (previousFocus?.isConnected && previousFocus !== document.body) {
      previousFocus.focus()
    } else {
      dialogRef.current?.blur()
    }
  }, [])

  const keepFocusInDialog = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    dialogRef.current?.focus()
  }

  return (
    <div
      className={`mobile-orientation-gate ${device.shouldGate ? 'is-visible' : 'is-leaving'}`}
      data-testid="mobile-orientation-gate"
      data-phone-like={device.isPhoneLike}
      hidden={!rendered}
      aria-hidden={!device.shouldGate}
    >
      <section
        ref={dialogRef}
        className="mobile-orientation-gate__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-orientation-title"
        aria-describedby="mobile-orientation-description mobile-orientation-progress"
        tabIndex={-1}
        onKeyDown={keepFocusInDialog}
      >
        <p className="mobile-orientation-gate__brand">KineBalance</p>
        <div
          className="mobile-orientation-gate__device-stage"
          data-motion={device.prefersReducedMotion ? 'static' : 'rotate-once'}
          aria-hidden="true"
        >
          <span className="mobile-orientation-gate__device">
            <Smartphone />
          </span>
          <RotateCw className="mobile-orientation-gate__rotate-mark" />
        </div>
        <div className="mobile-orientation-gate__copy">
          <span className="mobile-orientation-gate__eyebrow">觀看方向</span>
          <h1 id="mobile-orientation-title">建議橫向使用</h1>
          <p id="mobile-orientation-description">
            為提供更清楚的醫療資訊、完整的動畫畫面與更舒適的操作空間，請將手機轉為橫向。
          </p>
          <p id="mobile-orientation-progress" className="mobile-orientation-gate__progress">
            旋轉手機後將自動繼續，不會遺失目前進度。
          </p>
        </div>
      </section>
    </div>
  )
}
