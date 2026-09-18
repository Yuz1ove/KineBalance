import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => { if (typeof document !== 'undefined') cleanup() })

if (typeof window !== 'undefined') Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn()
})

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]

  constructor(private readonly callback: IntersectionObserverCallback) {}

  disconnect() {}
  unobserve(_target: Element) {}
  takeRecords(): IntersectionObserverEntry[] { return [] }

  observe(target: Element) {
    this.callback([{
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRatio: 0,
      intersectionRect: new DOMRect(),
      isIntersecting: false,
      rootBounds: null,
      target,
      time: performance.now()
    }], this)
  }
}

if (typeof window !== 'undefined') Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver
})
if (typeof window !== 'undefined') Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver
})
