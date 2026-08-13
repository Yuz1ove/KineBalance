import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DispenseScene } from './DispenseScene'

const setOrientationGate = (active: boolean) => {
  window.dispatchEvent(new CustomEvent('kinebalance:orientation-gate-change', {
    detail: { active }
  }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('verified dispense flow', () => {
  it('renders the full 2-pill normal batch with staggered identities', () => {
    render(<DispenseScene onNext={vi.fn()} />)

    const pills = screen.getAllByTestId('dispense-pill')
    expect(pills).toHaveLength(2)
    expect(pills.map((pill) => pill.getAttribute('data-pill-id'))).toEqual([
      'initial-pill-1',
      'initial-pill-2'
    ])
    expect(pills.map((pill) => pill.getAttribute('data-delay-ms'))).toEqual(['0', '120'])
  })

  it('renders the full 3-pill anomaly batch', () => {
    render(<DispenseScene onNext={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '數量異常' }))

    const pills = screen.getAllByTestId('dispense-pill')
    expect(pills).toHaveLength(3)
    expect(pills.map((pill) => pill.getAttribute('data-delay-ms'))).toEqual([
      '0',
      '120',
      '240'
    ])
  })

  it('locks the whole anomaly batch and requires caregiver confirmation before a fresh batch', () => {
    vi.useFakeTimers()
    render(<DispenseScene onNext={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '數量異常' }))
    fireEvent.click(screen.getByRole('button', { name: '展示異常流程' }))

    act(() => vi.advanceTimersByTime(2600))
    act(() => vi.advanceTimersByTime(2450))
    act(() => vi.advanceTimersByTime(1750))

    expect(screen.getByText('異常批次已鎖定，等待照顧者確認')).toBeInTheDocument()
    expect(screen.getByText(/本次自動交付已暫停/)).toBeInTheDocument()

    const isolated = screen
      .getAllByTestId('dispense-pill')
      .filter((pill) => pill.getAttribute('data-batch') === 'initial')
    expect(isolated).toHaveLength(3)
    isolated.forEach((pill) => {
      expect(pill).toHaveAttribute('data-location', 'quarantine-drawer')
    })
    expect(
      screen.getAllByTestId('dispense-pill').filter((pill) => pill.getAttribute('data-batch') === 'retry')
    ).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: /照顧者已確認，重新執行/ }))

    const allPills = screen.getAllByTestId('dispense-pill')
    const retry = allPills.filter((pill) => pill.getAttribute('data-batch') === 'retry')
    const stillIsolated = allPills.filter((pill) => pill.getAttribute('data-batch') === 'initial')
    expect(retry).toHaveLength(2)
    expect(retry.map((pill) => pill.getAttribute('data-pill-id'))).toEqual([
      'retry-pill-1',
      'retry-pill-2'
    ])
    stillIsolated.forEach((pill) => {
      expect(pill).toHaveAttribute('data-location', 'quarantine-drawer')
    })

    act(() => vi.advanceTimersByTime(2450))
    act(() => vi.advanceTimersByTime(2450))
    act(() => vi.advanceTimersByTime(1750))

    retry.forEach((pill) => {
      expect(pill).toHaveAttribute('data-location', 'pickup-drawer')
    })
    stillIsolated.forEach((pill) => {
      expect(pill).toHaveAttribute('data-location', 'quarantine-drawer')
    })
    expect(screen.getByText('原異常 3 顆仍鎖定在暫存抽屜。')).toBeInTheDocument()
  })

  it('freezes an in-progress inspection while the orientation gate is active and resumes it afterward', () => {
    vi.useFakeTimers()
    render(<DispenseScene onNext={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '數量異常' }))
    fireEvent.click(screen.getByRole('button', { name: '展示異常流程' }))
    act(() => vi.advanceTimersByTime(2600))
    act(() => vi.advanceTimersByTime(900))

    expect(screen.getByText('影像與重量核對')).toBeInTheDocument()
    expect(screen.getByText('輪廓確認')).toHaveClass('confirmed')
    expect(screen.getByText('數量確認')).not.toHaveClass('confirmed')

    act(() => setOrientationGate(true))
    act(() => vi.advanceTimersByTime(10000))

    expect(screen.getByText('影像與重量核對')).toBeInTheDocument()
    expect(screen.getAllByTestId('dispense-pill')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '數量異常' })).toHaveClass('active', 'anomaly')
    expect(screen.getByText('輪廓確認')).toHaveClass('confirmed')
    expect(screen.getByText('數量確認')).not.toHaveClass('confirmed')
    expect(screen.getByText('重量確認')).not.toHaveClass('confirmed')
    expect(screen.queryByText('異常批次已鎖定，等待照顧者確認')).not.toBeInTheDocument()
    expect(screen.queryByText('核對通過')).not.toBeInTheDocument()

    act(() => setOrientationGate(false))
    act(() => vi.advanceTimersByTime(839))

    expect(screen.getByText('重量確認')).not.toHaveClass('confirmed')
    expect(screen.getByText('影像與重量核對')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('重量確認')).toHaveClass('confirmed')

    act(() => vi.advanceTimersByTime(710))
    expect(screen.getByText('分流閘門導向抽屜')).toBeInTheDocument()
  })
})
