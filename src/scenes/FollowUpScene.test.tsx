import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FollowUpScene } from './FollowUpScene'

const setOrientationGate = (active: boolean) => {
  window.dispatchEvent(new CustomEvent('kinebalance:orientation-gate-change', {
    detail: { active }
  }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('follow-up scene', () => {
  it('freezes the response-window preview while the orientation gate is active and resumes without losing state', () => {
    vi.useFakeTimers()
    render(<FollowUpScene onNext={vi.fn()} />)

    const caregiverReminder = screen.getByRole('button', { name: /同步給家屬/ })
    fireEvent.click(screen.getByRole('button', { name: '快速預覽 60 分鐘' }))
    act(() => vi.advanceTimersByTime(120))
    fireEvent.click(caregiverReminder)

    expect(screen.getByText('55')).toBeInTheDocument()
    expect(caregiverReminder).toHaveClass('selected')

    act(() => setOrientationGate(true))
    act(() => vi.advanceTimersByTime(1440))

    expect(screen.getByText('55')).toBeInTheDocument()
    expect(caregiverReminder).toHaveClass('selected')
    expect(screen.getByRole('button', { name: '時間快轉中…' })).toBeDisabled()
    expect(screen.getByText('已排程')).toBeInTheDocument()
    expect(screen.queryByText('視窗已開啟')).not.toBeInTheDocument()
    expect(screen.queryByText('可開始測試')).not.toBeInTheDocument()

    act(() => setOrientationGate(false))
    act(() => vi.advanceTimersByTime(120))

    expect(screen.getByText('50')).toBeInTheDocument()
    expect(caregiverReminder).toHaveClass('selected')
    expect(screen.getByRole('button', { name: '時間快轉中…' })).toBeDisabled()
  })
})
