import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import App from './App'
import './scenes/DispenseScene'
import './scenes/FollowUpScene'
import './scenes/ReviewScene'
import './scenes/TapTestScene'
import './scenes/TrendScene'

const lifecycleSpies = vi.hoisted(() => ({
  scopeRevert: vi.fn()
}))

vi.mock('motion/react', async () => {
  const React = await import('react')
  const components = new Map<string, unknown>()
  const motionOnlyProps = new Set([
    'animate',
    'exit',
    'initial',
    'inert',
    'layout',
    'layoutId',
    'transition',
    'viewport',
    'whileHover',
    'whileInView',
    'whileTap'
  ])

  const motion = new Proxy({}, {
    get(_target, tag: string) {
      if (components.has(tag)) return components.get(tag)
      const Component = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
        const domProps = Object.fromEntries(
          Object.entries(props).filter(([key]) => key !== 'children' && key !== 'style' && !motionOnlyProps.has(key))
        )
        return React.createElement(tag, { ...domProps, ref }, props.children as ReactNode)
      })
      components.set(tag, Component)
      return Component
    }
  })

  const PassThrough = ({ children }: { children?: ReactNode }) =>
    React.createElement(React.Fragment, null, children)

  return {
    AnimatePresence: PassThrough,
    MotionConfig: PassThrough,
    motion,
    useInView: () => true,
    useReducedMotion: () => true,
    useScroll: () => ({ scrollYProgress: 0 }),
    useTransform: () => 0
  }
})

vi.mock('animejs', () => {
  const animation = () => {
    const chain: Record<string, unknown> = {}
    chain.add = vi.fn(() => chain)
    chain.cancel = vi.fn()
    chain.label = vi.fn(() => chain)
    chain.pause = vi.fn()
    chain.resume = vi.fn()
    chain.set = vi.fn(() => chain)
    return chain
  }

  const createScope = () => {
    const scope: {
      add: ReturnType<typeof vi.fn>
      methods: Record<string, (...args: unknown[]) => unknown>
      revert: ReturnType<typeof vi.fn>
    } = {
      add: vi.fn(),
      methods: {},
      revert: lifecycleSpies.scopeRevert
    }
    scope.add.mockImplementation((entry: unknown, implementation?: (...args: unknown[]) => unknown) => {
      if (typeof entry === 'function') {
        ;(entry as (value: typeof scope) => void)(scope)
      } else if (typeof entry === 'string' && implementation) {
        scope.methods[entry] = implementation
      }
      return scope
    })
    return scope
  }

  return {
    animate: vi.fn(animation),
    createScope,
    createTimeline: vi.fn(animation),
    set: vi.fn(),
    stagger: vi.fn(() => 0),
    svg: {
      createDrawable: vi.fn(() => [{ draw: '0 1' }])
    }
  }
})

const chapterRoutes = [
  ['Rhythm', 'rhythm'],
  ['Medication', 'medication'],
  ['Motion Test', 'motion'],
  ['Verified Dispense', 'dispense'],
  ['Response Window', 'response'],
  ['Personal Pattern', 'pattern'],
  ['Human Review', 'review']
] as const

const clinicalModules = [
  ['用藥時程', 'schedule', '今日照護總覽'],
  ['指尖測試', 'tap', '服藥前，留下 20 秒動作快照'],
  ['發藥核對', 'dispense', '每次交付，都經過實體核對'],
  ['反應追蹤', 'followup', '約 60 分鐘後，再看一次變化'],
  ['個人趨勢', 'trend', '看自己的長期變化，不和別人比較'],
  ['團隊複核', 'review', '先看趨勢，再由人共同複核']
] as const

const TEST_TIMEOUT = 60_000

beforeEach(() => {
  lifecycleSpies.scopeRevert.mockClear()
  window.history.replaceState(null, '', '/')
  document.documentElement.dataset.orientationGateActive = 'false'
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      removeEventListener: vi.fn()
    }))
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn()
  })
})

async function renderExhibition() {
  render(<App />)
  const exhibition = await screen.findByTestId('exhibition-mode')
  await waitFor(() => expect(exhibition).toHaveAttribute('data-experience-mode', 'exhibition'))
  return exhibition
}

async function enterFullClinical(exhibition: HTMLElement) {
  const experienceRoot = exhibition.parentElement
  expect(experienceRoot).not.toBeNull()
  fireEvent.click(within(exhibition).getByRole('button', { name: '完整操作模式' }))
  const clinical = screen.getByTestId('clinical-demo-mode')
  await waitFor(() => {
    expect(experienceRoot).toHaveAttribute('data-experience-mode', 'clinical')
    expect(clinical).toHaveAttribute('aria-hidden', 'false')
    expect(clinical).not.toHaveAttribute('hidden')
  })
  return clinical
}

describe('KineBalance two-mode experience', () => {
  it('enters through the Exhibition experience with the brand and safety boundary intact', async () => {
    const exhibition = await renderExhibition()
    const clinical = screen.getByTestId('clinical-demo-mode')

    expect(within(exhibition).getByRole('heading', { level: 1, name: 'KineBalance' })).toBeInTheDocument()
    expect(within(exhibition).getAllByText('用藥節律 × 動作反應追蹤').length).toBeGreaterThan(0)
    expect(within(exhibition).getAllByText(/不診斷.*不調藥.*不停止用藥/).length).toBeGreaterThan(0)
    expect(clinical).toHaveAttribute('aria-hidden', 'true')
    expect(clinical).toHaveAttribute('hidden')
  }, TEST_TIMEOUT)

  it('navigates all seven Exhibition chapters', async () => {
    const exhibition = await renderExhibition()
    const navigation = within(exhibition).getByRole('navigation', { name: '展覽章節導覽' })

    expect(within(navigation).getAllByRole('button')).toHaveLength(chapterRoutes.length)
    for (const [label, id] of chapterRoutes) {
      const button = within(navigation).getByRole('button', { name: label })
      fireEvent.click(button)
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-current', 'location')
        expect(window.location.hash).toBe(`#${id}`)
      })
      expect(document.getElementById(id)).toBeInTheDocument()
    }
  }, TEST_TIMEOUT)

  it('enters full Clinical mode and reaches all six shared functional modules', async () => {
    const exhibition = await renderExhibition()
    const clinical = await enterFullClinical(exhibition)
    const navigation = within(clinical).getByRole('navigation', { name: '六個體驗場景' })

    expect(clinical).not.toHaveAttribute('role', 'dialog')
    expect(within(navigation).getAllByRole('button')).toHaveLength(clinicalModules.length)

    for (const [label, id, heading] of clinicalModules) {
      const button = within(navigation).getByRole('button', { name: `前往場景：${label}` })
      fireEvent.click(button)
      expect(
        await within(clinical).findByRole('heading', { name: heading }, { timeout: 15_000 })
      ).toBeInTheDocument()
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-current', 'step')
        expect(window.location.hash).toBe(`#clinical/${id}`)
      })
    }
  }, TEST_TIMEOUT)

  it('records one deviation without notification and escalates only after repeated valid deviations', async () => {
    const exhibition = await renderExhibition()
    const clinical = await enterFullClinical(exhibition)
    fireEvent.click(within(clinical).getByRole('button', { name: '前往場景：團隊複核' }))

    expect(
      await within(clinical).findByText('單次有效偏離，先記錄', {}, { timeout: 15_000 })
    ).toBeInTheDocument()
    expect(within(clinical).getByRole('button', { name: /單次偏離不通知/ })).toBeDisabled()
    expect(within(clinical).queryByText('主要照顧者已收到非緊急提醒')).not.toBeInTheDocument()
    expect(within(clinical).getByText('未變更')).toBeInTheDocument()
    expect(within(clinical).getByText('無法由系統確認')).toBeInTheDocument()

    fireEvent.click(within(clinical).getByRole('button', { name: '新增下一次模擬資料' }))
    expect(await within(clinical).findByText('主要照顧者已收到非緊急提醒')).toBeInTheDocument()
    expect(within(clinical).queryByText('回診摘要已建立')).not.toBeInTheDocument()

    fireEvent.click(within(clinical).getByRole('button', { name: '新增下一次模擬資料' }))
    expect(await within(clinical).findByText('回診摘要已建立')).toBeInTheDocument()
    expect(
      within(clinical).getByText('已通知主要照顧者，建議與醫療團隊共同複核')
    ).toBeInTheDocument()
  }, TEST_TIMEOUT)

  it('preserves the active module and its review state from an Exhibition overlay into full Clinical mode', async () => {
    const exhibition = await renderExhibition()
    fireEvent.click(within(exhibition).getByRole('button', { name: '開啟共同複核流程' }))

    const overlay = await screen.findByRole('dialog', { name: '團隊複核互動展件' })
    expect(
      await within(overlay).findByRole(
        'heading',
        { name: '先看趨勢，再由人共同複核' },
        { timeout: 15_000 }
      )
    ).toBeInTheDocument()
    fireEvent.click(within(overlay).getByRole('button', { name: '新增下一次模擬資料' }))
    expect(await within(overlay).findByText('主要照顧者已收到非緊急提醒')).toBeInTheDocument()
    expect(within(overlay).getByText('最近 3 次中 2 次有效偏離')).toBeInTheDocument()

    fireEvent.click(within(overlay).getByRole('button', { name: '完整操作' }))
    const clinical = screen.getByTestId('clinical-demo-mode')
    await waitFor(() => {
      expect(clinical).not.toHaveAttribute('role', 'dialog')
      expect(window.location.hash).toBe('#clinical/review')
    })

    expect(within(clinical).getByText('主要照顧者已收到非緊急提醒')).toBeInTheDocument()
    expect(within(clinical).getByText('最近 3 次中 2 次有效偏離')).toBeInTheDocument()
    expect(
      within(clinical).getByRole('button', { name: '前往場景：團隊複核' })
    ).toHaveAttribute('aria-current', 'step')

    fireEvent.click(within(clinical).getByRole('button', { name: '前往場景：用藥時程' }))
    expect(await within(clinical).findByRole('heading', { name: '今日照護總覽' })).toBeInTheDocument()
    fireEvent.click(within(clinical).getByRole('button', { name: '前往場景：團隊複核' }))
    expect(await within(clinical).findByText('主要照顧者已收到非緊急提醒')).toBeInTheDocument()
    expect(within(clinical).getByText('最近 3 次中 2 次有效偏離')).toBeInTheDocument()

    fireEvent.click(within(clinical).getByRole('button', { name: '新增下一次模擬資料' }))
    expect(await within(clinical).findByText('回診摘要已建立')).toBeInTheDocument()
  }, TEST_TIMEOUT)

  it('keeps every chapter readable with Reduced Motion and cleans animation scopes and listeners on unmount', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<App />)
    const exhibition = await screen.findByTestId('exhibition-mode')

    expect(within(exhibition).getByRole('heading', { name: 'KineBalance' })).toBeVisible()
    chapterRoutes.slice(1).forEach(([, id]) => {
      const chapter = document.getElementById(id)
      expect(chapter).toBeInTheDocument()
      expect(chapter).not.toHaveAttribute('hidden')
      expect(chapter).not.toHaveAttribute('aria-hidden', 'true')
    })

    unmount()
    expect(lifecycleSpies.scopeRevert).toHaveBeenCalled()
    expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeListener).toHaveBeenCalledWith('popstate', expect.any(Function))
    removeListener.mockRestore()
  }, TEST_TIMEOUT)
})
