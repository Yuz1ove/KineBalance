import { useEffect, useState } from 'react'

const PHONE_PORTRAIT_MAX_WIDTH = 767
const PHONE_LANDSCAPE_MAX_WIDTH = 1024
const PHONE_HARDWARE_SHORT_SIDE = 600

export interface MobileLandscapeSnapshot {
  isPortrait: boolean
  isCoarsePointer: boolean
  isPhoneLike: boolean
  shouldGate: boolean
  isMobileLandscape: boolean
  prefersReducedMotion: boolean
  visualHeight: number
}

type NavigatorWithUAData = Navigator & {
  userAgentData?: { mobile?: boolean }
}

const matches = (query: string) =>
  typeof window.matchMedia === 'function' && window.matchMedia(query).matches

const mobileUserAgent = () => {
  const navigatorWithUAData = navigator as NavigatorWithUAData
  if (typeof navigatorWithUAData.userAgentData?.mobile === 'boolean') {
    return navigatorWithUAData.userAgentData.mobile
  }
  return /Android.+Mobile|iPhone|iPod|Mobile/i.test(navigator.userAgent)
}

const tabletUserAgent = () =>
  /iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent) ||
  (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function getMobileLandscapeSnapshot(): MobileLandscapeSnapshot {
  const viewportWidth = Math.max(0, window.innerWidth || document.documentElement.clientWidth)
  const viewportHeight = Math.max(0, window.innerHeight || document.documentElement.clientHeight)
  const visualHeight = Math.max(1, window.visualViewport?.height || viewportHeight || 1)
  const screenWidth = window.screen?.width || viewportWidth
  const screenHeight = window.screen?.height || viewportHeight
  const hardwareShortSide = Math.min(screenWidth, screenHeight)
  const isPortrait = typeof window.matchMedia === 'function'
    ? matches('(orientation: portrait)')
    : viewportHeight >= viewportWidth
  const isCoarsePointer = matches('(pointer: coarse)')
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  const explicitMobile = mobileUserAgent()
  const phoneSizedHardware = hardwareShortSide > 0 && hardwareShortSide <= PHONE_HARDWARE_SHORT_SIDE
  const constrainedTabletViewport =
    tabletUserAgent() &&
    viewportWidth <= 540 &&
    viewportWidth < hardwareShortSide * 0.82
  const isPhoneLike =
    isCoarsePointer &&
    hasTouch &&
    (explicitMobile || phoneSizedHardware || constrainedTabletViewport)

  return {
    isPortrait,
    isCoarsePointer,
    isPhoneLike,
    shouldGate: isPhoneLike && isPortrait && viewportWidth <= PHONE_PORTRAIT_MAX_WIDTH,
    isMobileLandscape:
      isPhoneLike && !isPortrait && viewportWidth <= PHONE_LANDSCAPE_MAX_WIDTH && viewportHeight < 768,
    prefersReducedMotion: matches('(prefers-reduced-motion: reduce)'),
    visualHeight
  }
}

export function useMobileLandscape() {
  const [snapshot, setSnapshot] = useState<MobileLandscapeSnapshot>(getMobileLandscapeSnapshot)

  useEffect(() => {
    const mediaQueries = [
      window.matchMedia?.('(orientation: portrait)'),
      window.matchMedia?.('(pointer: coarse)'),
      window.matchMedia?.('(prefers-reduced-motion: reduce)')
    ].filter((query): query is MediaQueryList => Boolean(query))

    const update = () => setSnapshot(getMobileLandscapeSnapshot())

    mediaQueries.forEach((query) => query.addEventListener?.('change', update))
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.screen.orientation?.addEventListener?.('change', update)

    update()

    return () => {
      mediaQueries.forEach((query) => query.removeEventListener?.('change', update))
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.screen.orientation?.removeEventListener?.('change', update)
    }
  }, [])

  return snapshot
}
