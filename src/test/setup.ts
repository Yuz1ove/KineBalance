import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

Object.defineProperty(window, 'scrollTo', {
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

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver
})
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver
})
