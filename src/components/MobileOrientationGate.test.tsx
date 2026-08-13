import { act, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileOrientationGate } from './MobileOrientationGate'

function GateEventProbe() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const handleChange = (event: Event) => {
      setActive((event as CustomEvent<{ active: boolean }>).detail.active)
    }
    window.addEventListener('kinebalance:orientation-gate-change', handleChange)
    return () => window.removeEventListener('kinebalance:orientation-gate-change', handleChange)
  }, [])
  return <output>{active ? '場景已暫停' : '場景運作中'}</output>
}

class MockMediaQueryList {
  readonly media: string
  matches: boolean
  onchange: ((event: MediaQueryListEvent) => void) | null = null
  private listeners = new Set<(event: MediaQueryListEvent) => void>()

  constructor(media: string, matches: boolean) {
    this.media = media
    this.matches = matches
  }

  addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener)
  }

  removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener)
  }

  addListener(listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener)
  }

  removeListener(listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener)
  }

  dispatchEvent() {
    return true
  }

  emit(matches: boolean) {
    this.matches = matches
    const event = { matches, media: this.media } as MediaQueryListEvent
    this.onchange?.(event)
    this.listeners.forEach((listener) => listener(event))
  }
}

const originals = new Map<string, PropertyDescriptor | undefined>()

const replace = (target: object, key: string, value: unknown) => {
  const id = `${target === window ? 'window' : target === navigator ? 'navigator' : 'screen'}:${key}`
  if (!originals.has(id)) originals.set(id, Object.getOwnPropertyDescriptor(target, key))
  Object.defineProperty(target, key, { configurable: true, writable: true, value })
}

function installDevice({
  portrait,
  coarse,
  reduced = false,
  width,
  height,
  screenWidth = width,
  screenHeight = height,
  userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile',
  maxTouchPoints = 5
}: {
  portrait: boolean
  coarse: boolean
  reduced?: boolean
  width: number
  height: number
  screenWidth?: number
  screenHeight?: number
  userAgent?: string
  maxTouchPoints?: number
}) {
  const queries = new Map<string, MockMediaQueryList>([
    ['(orientation: portrait)', new MockMediaQueryList('(orientation: portrait)', portrait)],
    ['(pointer: coarse)', new MockMediaQueryList('(pointer: coarse)', coarse)],
    ['(prefers-reduced-motion: reduce)', new MockMediaQueryList('(prefers-reduced-motion: reduce)', reduced)]
  ])
  replace(window, 'innerWidth', width)
  replace(window, 'innerHeight', height)
  replace(window, 'matchMedia', (query: string) => {
    if (!queries.has(query)) queries.set(query, new MockMediaQueryList(query, false))
    return queries.get(query) as unknown as MediaQueryList
  })
  replace(window.screen, 'width', screenWidth)
  replace(window.screen, 'height', screenHeight)
  replace(navigator, 'userAgent', userAgent)
  replace(navigator, 'maxTouchPoints', maxTouchPoints)

  return {
    setOrientation(nextPortrait: boolean, nextWidth: number, nextHeight: number) {
      replace(window, 'innerWidth', nextWidth)
      replace(window, 'innerHeight', nextHeight)
      queries.get('(orientation: portrait)')?.emit(nextPortrait)
    }
  }
}

afterEach(() => {
  vi.useRealTimers()
  delete document.documentElement.dataset.orientationGateActive
  delete document.documentElement.dataset.mobileLandscape
  document.documentElement.style.removeProperty('--kb-visual-viewport-height')
  for (const [id, descriptor] of originals) {
    const [owner, key] = id.split(':')
    const target = owner === 'window' ? window : owner === 'navigator' ? navigator : window.screen
    if (descriptor) Object.defineProperty(target, key, descriptor)
    else delete (target as unknown as Record<string, unknown>)[key]
  }
  originals.clear()
})

describe('MobileOrientationGate', () => {
  it('shows an accessible modal only for a phone-like portrait viewport', () => {
    installDevice({ portrait: true, coarse: true, width: 390, height: 844 })
    render(
      <>
        <main data-orientation-gate-background><button>背景操作</button></main>
        <MobileOrientationGate />
      </>
    )

    const dialog = screen.getByRole('dialog', { name: '建議橫向使用' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/旋轉手機後將自動繼續/)).toBeInTheDocument()
    expect(document.querySelector('[data-orientation-gate-background]')).toHaveAttribute('inert')
    expect(document.documentElement).toHaveAttribute('data-orientation-gate-active', 'true')
  })

  it('announces the initial gate state to scene listeners mounted in the same commit', () => {
    installDevice({ portrait: true, coarse: true, width: 390, height: 844 })
    render(
      <>
        <GateEventProbe />
        <MobileOrientationGate />
      </>
    )
    expect(screen.getByText('場景已暫停')).toBeInTheDocument()
  })

  it('does not mistake a narrow desktop or an iPad-sized touch screen for a phone', () => {
    installDevice({
      portrait: true,
      coarse: false,
      width: 500,
      height: 900,
      screenWidth: 1440,
      screenHeight: 900,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      maxTouchPoints: 0
    })
    const first = render(<MobileOrientationGate />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    first.unmount()

    installDevice({
      portrait: true,
      coarse: true,
      width: 744,
      height: 1133,
      screenWidth: 744,
      screenHeight: 1133,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
      maxTouchPoints: 5
    })
    render(<MobileOrientationGate />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('gates an iPad only when split view leaves phone-sized portrait space', () => {
    installDevice({
      portrait: true,
      coarse: true,
      width: 390,
      height: 1133,
      screenWidth: 744,
      screenHeight: 1133,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
      maxTouchPoints: 5
    })
    render(<MobileOrientationGate />)
    expect(screen.getByRole('dialog', { name: '建議橫向使用' })).toBeInTheDocument()
  })

  it('automatically closes and restores focus in landscape, then reopens in portrait', () => {
    vi.useFakeTimers()
    const device = installDevice({ portrait: false, coarse: true, width: 844, height: 390 })
    render(
      <>
        <main data-orientation-gate-background><button>原本操作</button></main>
        <MobileOrientationGate />
      </>
    )
    const backgroundButton = screen.getByRole('button', { name: '原本操作' })
    backgroundButton.focus()
    expect(document.documentElement).toHaveAttribute('data-mobile-landscape', 'true')

    const gateEvents: boolean[] = []
    const recordGateEvent = (event: Event) => {
      gateEvents.push((event as CustomEvent<{ active: boolean }>).detail.active)
    }
    window.addEventListener('kinebalance:orientation-gate-change', recordGateEvent)
    act(() => device.setOrientation(true, 390, 844))
    act(() => vi.advanceTimersByTime(20))
    expect(screen.getByRole('dialog', { name: '建議橫向使用' })).toHaveFocus()
    expect(gateEvents).toEqual([true])

    act(() => device.setOrientation(false, 844, 390))
    act(() => vi.advanceTimersByTime(220))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(backgroundButton).toHaveFocus()

    act(() => device.setOrientation(true, 390, 844))
    expect(screen.getByRole('dialog', { name: '建議橫向使用' })).toBeInTheDocument()
    window.removeEventListener('kinebalance:orientation-gate-change', recordGateEvent)
  })

  it('does not leave focus inside the hidden dialog when the page had no focused control', () => {
    vi.useFakeTimers()
    const device = installDevice({ portrait: true, coarse: true, width: 390, height: 844 })
    render(<MobileOrientationGate />)

    act(() => vi.advanceTimersByTime(20))
    expect(screen.getByRole('dialog', { name: '建議橫向使用' })).toHaveFocus()

    act(() => device.setOrientation(false, 844, 390))
    expect(document.activeElement).toBe(document.body)
  })

  it('uses a static device cue for reduced motion and traps Tab focus', () => {
    installDevice({ portrait: true, coarse: true, reduced: true, width: 390, height: 844 })
    render(<MobileOrientationGate />)
    const dialog = screen.getByRole('dialog', { name: '建議橫向使用' })
    expect(document.querySelector('[data-motion="static"]')).toBeInTheDocument()
    dialog.focus()
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
    expect(dialog).toHaveFocus()
  })
})
