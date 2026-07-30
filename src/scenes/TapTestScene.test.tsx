import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TapTestScene } from './TapTestScene'

afterEach(() => {
  vi.useRealTimers()
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
})
