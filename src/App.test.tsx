import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('DoseLoop PD prototype', () => {
  it('renders the safe medication schedule language', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '今天，照著熟悉的節奏' })).toBeInTheDocument()
    expect(screen.getAllByText('已發藥').length).toBeGreaterThan(0)
    expect(screen.getByText(/不等於已吞下藥物/)).toBeInTheDocument()
  })

  it('navigates through the six scenes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '前往場景：指尖測試' }))
    expect(screen.getByRole('heading', { name: '服藥前，留下 20 秒動作快照' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前往場景：發藥核對' }))
    expect(screen.getByRole('heading', { name: '每次交付，都經過實體核對' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前往場景：團隊複核' }))
    expect(screen.getByRole('heading', { name: '先看趨勢，再由人共同複核' })).toBeInTheDocument()
  })

  it('does not enable review notification after one deviation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '前往場景：團隊複核' }))
    expect(screen.getByText('單次有效偏離，先記錄')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /單次偏離不通知/ })).toBeDisabled()
  })

  it('shows a caregiver notification only after repeated deviations', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '前往場景：團隊複核' }))

    await user.click(screen.getByRole('button', { name: '新增下一次模擬資料' }))
    expect(screen.getByText('主要照顧者已收到非緊急提醒')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新增下一次模擬資料' }))
    expect(screen.getByText('回診摘要已建立')).toBeInTheDocument()
    expect(screen.getByText('已通知主要照顧者，建議與醫療團隊共同複核')).toBeInTheDocument()
  })
})
