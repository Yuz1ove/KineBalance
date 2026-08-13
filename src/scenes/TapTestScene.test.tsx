import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TapTestScene } from './TapTestScene'

const setOrientationGate = (active: boolean) => {
  window.dispatchEvent(new CustomEvent('kinebalance:orientation-gate-change', {
    detail: { active }
  }))
}

afterEach(() => {
  vi.useRealTimers()
  delete document.documentElement.dataset.orientationGateActive
})

describe('tap test scene', () => {
  it('shows a valid low-speed result after a complete 20-second 8-tap test', () => {
    vi.useFakeTimers()
    render(<TapTestScene onNext={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(1950))

    const sides = [
      { name: '左側點擊區，可按 F 鍵', wait: 0 },
      { name: '右側點擊區，可按 J 鍵', wait: 2800 },
      { name: '左側點擊區，可按 F 鍵', wait: 2600 },
      { name: '右側點擊區，可按 J 鍵', wait: 2500 },
      { name: '左側點擊區，可按 F 鍵', wait: 2700 },
      { name: '右側點擊區，可按 J 鍵', wait: 2400 },
      { name: '左側點擊區，可按 F 鍵', wait: 2600 },
      { name: '右側點擊區，可按 J 鍵', wait: 2500 }
    ]

    sides.forEach(({ name, wait }) => {
      if (wait) act(() => vi.advanceTimersByTime(wait))
      fireEvent.pointerDown(screen.getByRole('button', { name }))
    })
    act(() => vi.advanceTimersByTime(1900))

    expect(screen.getByText('測試有效，但本次速度低於個人近期範圍。')).toBeInTheDocument()
    expect(screen.getByText('本次結果不影響依醫囑用藥。')).toBeInTheDocument()
    expect(screen.queryByText('資料品質不足')).not.toBeInTheDocument()
    expect(screen.getByText('動作速度偏低')).toBeInTheDocument()
  })

  it('notifies a caregiver for assistance after two consecutive alternation failures', () => {
    vi.useFakeTimers()
    render(<TapTestScene onNext={vi.fn()} />)

    const completeInvalidAttempt = (startButtonName: string) => {
      fireEvent.click(screen.getByRole('button', { name: startButtonName }))
      act(() => vi.advanceTimersByTime(1950))
      fireEvent.pointerDown(screen.getByRole('button', { name: '右側點擊區，可按 J 鍵' }))
      fireEvent.pointerDown(screen.getByRole('button', { name: '右側點擊區，可按 J 鍵' }))
      act(() => vi.advanceTimersByTime(20050))
    }

    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    completeInvalidAttempt('開始 20 秒測試')
    expect(screen.getByText('先在現場引導重測')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /請家屬協助/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /重新測試/ }))
    completeInvalidAttempt('開始 20 秒測試')
    expect(screen.getByText('已通知主要照顧者協助')).toBeInTheDocument()
    expect(screen.getAllByText(/連續兩次交替錯誤過多/).length).toBeGreaterThan(0)
  })

  it('pauses a running test and excludes portrait time from elapsed and tap intervals', () => {
    vi.useFakeTimers()
    render(<TapTestScene onNext={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(1950))

    fireEvent.pointerDown(screen.getByRole('button', { name: '左側點擊區，可按 F 鍵' }))
    act(() => vi.advanceTimersByTime(1000))
    fireEvent.pointerDown(screen.getByRole('button', { name: '右側點擊區，可按 J 鍵' }))

    act(() => setOrientationGate(true))
    expect(screen.getByText('19.0 秒')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '左側點擊區，可按 F 鍵' })).toBeDisabled()

    act(() => vi.advanceTimersByTime(30000))
    fireEvent.keyDown(window, { key: 'f' })
    expect(screen.getByText('19.0 秒')).toBeInTheDocument()

    act(() => setOrientationGate(false))
    act(() => vi.advanceTimersByTime(1000))
    fireEvent.pointerDown(screen.getByRole('button', { name: '左側點擊區，可按 F 鍵' }))

    act(() => vi.advanceTimersByTime(17900))
    expect(screen.getByRole('button', { name: '中止測試' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(100))

    expect(screen.getByText('測試有效，但本次速度低於個人近期範圍。')).toBeInTheDocument()
    expect(screen.queryByText('資料品質不足')).not.toBeInTheDocument()
    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByText('間隔變異').closest('.metric')!).getByText('0.0')).toBeInTheDocument()
  })

  it('freezes and resumes the pre-test countdown while the orientation gate is active', () => {
    vi.useFakeTimers()
    render(<TapTestScene onNext={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(650))
    expect(screen.getByText('2')).toBeInTheDocument()

    act(() => setOrientationGate(true))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('2')).toBeInTheDocument()

    act(() => setOrientationGate(false))
    act(() => vi.advanceTimersByTime(1300))
    expect(screen.getByRole('button', { name: '中止測試' })).toBeInTheDocument()
    expect(screen.getByText('20.0 秒')).toBeInTheDocument()
  })

  it('reads the current gate state when mounted after the orientation event', () => {
    vi.useFakeTimers()
    document.documentElement.dataset.orientationGateActive = 'true'
    render(<TapTestScene onNext={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: '開始 20 秒測試' })).toBeInTheDocument()

    act(() => setOrientationGate(false))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
