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
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.orientationGateActive
})

describe('tap test scene', () => {
  it('preserves a complete 20-second 8-tap result without inventing a personal reference range', () => {
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

    expect(screen.getByText('本次操作通過既有時間與交替檢核；個人參考資料不足，尚未比較。')).toBeInTheDocument()
    expect(screen.getByText('本次結果不影響依醫囑用藥。')).toBeInTheDocument()
    expect(screen.queryByText('資料品質不足')).not.toBeInTheDocument()
    expect(screen.queryByText('動作速度偏低')).not.toBeInTheDocument()
    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('8')).toBeInTheDocument()
    expect(within(screen.getByText('每秒速度').closest('.metric')!).getByText('0.4')).toBeInTheDocument()
  })

  it('records rapid F then J keydowns as two valid alternating taps', () => {
    vi.useFakeTimers()
    render(<TapTestScene onNext={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(1950))
    act(() => vi.advanceTimersByTime(100))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }))
    })

    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByText('交替錯誤').closest('.metric')!).getByText('0.0')).toBeInTheDocument()
  })

  it('pauses inactive demo runtime and resumes without resetting its result', () => {
    vi.useFakeTimers()
    const onNext = vi.fn()
    const { rerender } = render(<TapTestScene active onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: '播放可重現模擬' }))
    act(() => vi.advanceTimersByTime(1950))
    act(() => vi.advanceTimersByTime(200))

    expect(screen.getByText('5.8 秒')).toBeInTheDocument()
    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('1')).toBeInTheDocument()

    rerender(<TapTestScene active={false} onNext={onNext} />)
    act(() => vi.advanceTimersByTime(5000))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })))

    expect(screen.getByText('5.8 秒')).toBeInTheDocument()
    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('1')).toBeInTheDocument()

    rerender(<TapTestScene active onNext={onNext} />)
    act(() => vi.advanceTimersByTime(5800))

    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('18')).toBeInTheDocument()
    expect(within(screen.getByText('交替錯誤').closest('.metric')!).getByText('0.0')).toBeInTheDocument()
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

    expect(screen.getByText('本次操作通過既有時間與交替檢核；個人參考資料不足，尚未比較。')).toBeInTheDocument()
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

  it('submits original attempts, modality and active elapsed time only after explicit analysis', () => {
    vi.useFakeTimers()
    const fetchSpy = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchSpy)
    render(<TapTestScene onNext={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(1950))
    act(() => vi.advanceTimersByTime(100))
    fireEvent.keyDown(window, { key: 'j' }) // Wrong first side must remain raw.
    act(() => vi.advanceTimersByTime(100))
    fireEvent.keyDown(window, { key: 'f' })
    act(() => setOrientationGate(true))
    act(() => vi.advanceTimersByTime(5000))
    fireEvent.keyDown(window, { key: 'j' }) // Paused event is outside capture.
    act(() => setOrientationGate(false))
    act(() => vi.advanceTimersByTime(300))
    fireEvent.pointerDown(screen.getByRole('button', { name: '右側點擊區，可按 J 鍵' }))
    fireEvent.click(screen.getByRole('button', { name: '中止測試' }))
    expect(fetchSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '分析並保存本次結果' }))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [path, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(path).toBe('/api/kbpd/analyses')
    expect(init.method).toBe('POST')
    const payload = JSON.parse(init.body as string)
    expect(payload.medicationEvents).toEqual([])
    expect(payload.session).toMatchObject({
      schemaVersion: 'KBPD-MOTION-1', origin: 'DEVELOPER_CAPTURE', clinicalUse: false,
      status: 'INTERRUPTED', elapsedMs: 500, expectedDurationMs: 20000,
      hand: 'BOTH', device: 'browser-input-v1', modality: 'MIXED',
      protocolVersion: 'alternating-two-hand/standard20/v1'
    })
    expect(payload.session.subjectId).toMatch(/^dev-[\da-f-]{36}$/)
    expect(payload.session.startedAt).toMatch(/Z$/)
    expect(payload.session.rawEvents.map(({ side, relativeTimeMs, modality }: { side: string; relativeTimeMs: number; modality: string }) => ({ side, relativeTimeMs, modality }))).toEqual([
      { side: 'right', relativeTimeMs: 100, modality: 'KEYBOARD' },
      { side: 'left', relativeTimeMs: 200, modality: 'KEYBOARD' },
      { side: 'right', relativeTimeMs: 500, modality: 'POINTER' }
    ])
    expect(new Set(payload.session.rawEvents.map((event: { eventId: string }) => event.eventId)).size).toBe(3)
  })

  it('keeps the demonstration cadence synthetic even when a keyboard event arrives', () => {
    vi.useFakeTimers()
    const fetchSpy = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchSpy)
    render(<TapTestScene onNext={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '播放可重現模擬' }))
    act(() => vi.advanceTimersByTime(1950))
    fireEvent.keyDown(window, { key: 'f' })
    act(() => vi.advanceTimersByTime(6000))
    expect(fetchSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '分析並保存本次結果' }))
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    const { session } = JSON.parse(init.body as string)
    expect(session).toMatchObject({ origin: 'SYNTHETIC', subjectId: 'synthetic-demo', modality: 'SYNTHETIC', elapsedMs: 6000, protocolVersion: 'alternating-two-hand/demo6/v1' })
    expect(session.rawEvents).toHaveLength(18)
    expect(session.rawEvents[0]).toMatchObject({ relativeTimeMs: 180, side: 'left', modality: 'SYNTHETIC' })
    expect(session.rawEvents[17].relativeTimeMs).toBe(4921)
  })

  it('shows insufficient input rather than a successful test after completing with zero events', () => {
    vi.useFakeTimers()
    render(<TapTestScene onNext={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '標準測試 · 20 秒' }))
    fireEvent.click(screen.getByRole('button', { name: '開始 20 秒測試' }))
    act(() => vi.advanceTimersByTime(1950))
    act(() => vi.advanceTimersByTime(20000))

    expect(screen.getAllByText('輸入資料不足')).toHaveLength(2)
    expect(screen.queryByText('測試有效')).not.toBeInTheDocument()
    expect(screen.queryByText('動作速度偏低')).not.toBeInTheDocument()
    expect(within(screen.getByText('有效點擊').closest('.metric')!).getByText('0')).toBeInTheDocument()
    expect(within(screen.getByText('間隔變異').closest('.metric')!).getByText('樣本不足')).toBeInTheDocument()
    expect(within(screen.getByText('速度遞減').closest('.metric')!).getByText('樣本不足')).toBeInTheDocument()
    expect(screen.getByText(/本次有效輸入少於 3 次/).closest('.quality-card')).toHaveClass('warning')
    expect(screen.getByRole('button', { name: '分析並保存本次結果' })).toBeInTheDocument()
  })
})
