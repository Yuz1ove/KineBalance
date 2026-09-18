import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ResearchPanel } from './ResearchPanel'

function ResearchPanelHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <main data-testid="app-background" aria-hidden="false">
        <button onClick={() => setOpen(true)}>查看研究依據</button>
      </main>
      <ResearchPanel open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

describe('ResearchPanel accessibility', () => {
  it('contains focus, closes with Escape, and restores the configured background and opener', async () => {
    const user = userEvent.setup()
    render(<ResearchPanelHarness />)

    const trigger = screen.getByRole('button', { name: '查看研究依據' })
    const background = screen.getByTestId('app-background')
    const initialInert = background.inert

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector<HTMLElement>('.drawer-layer')).toHaveAttribute('aria-hidden', 'true')

    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: '研究依據與誠實邊界' })
    const closeButton = within(dialog).getByRole('button', { name: '關閉' })
    const links = within(dialog).getAllByRole('link')

    await waitFor(() => expect(closeButton).toHaveFocus())
    expect(background).toHaveAttribute('aria-hidden', 'true')
    expect(background).toHaveProperty('inert', true)
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    await user.tab({ shift: true })
    expect(links.at(-1)).toHaveFocus()
    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(background).toHaveAttribute('aria-hidden', 'false')
    expect(background.inert).toBe(initialInert)
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' })
    expect(trigger).toHaveFocus()
  })
})
