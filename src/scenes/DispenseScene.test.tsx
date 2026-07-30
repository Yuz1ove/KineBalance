import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DispenseScene } from './DispenseScene'

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
})
