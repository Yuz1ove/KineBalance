import { expect, test, type Page } from '@playwright/test'

const portrait = { width: 393, height: 659 }
const landscape = { width: 667, height: 375 }

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  )).toBe(0)
}

async function openScene(page: Page, name: string) {
  await page.getByRole('button', { name: '開啟場景選單' }).click()
  await page.getByRole('button', { name: `前往場景：${name}` }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('portrait gate is modal, preserves focus and exits without a reload', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '建議橫向使用' })
  const background = page.locator('[data-orientation-gate-background]')
  const root = page.locator('html')

  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toBeFocused()
  await expect(background).toHaveAttribute('inert', '')
  await expect(background).toHaveAttribute('aria-hidden', 'true')
  await expect(root).toHaveAttribute('data-orientation-gate-active', 'true')
  await page.locator('.brand').evaluate((brand) => (brand as HTMLElement).focus())
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog).toBeFocused()

  await page.evaluate(() => {
    document.documentElement.dataset.e2eSameDocument = 'preserved'
  })
  await page.setViewportSize(landscape)

  await expect(dialog).toBeHidden()
  await expect(root).toHaveAttribute('data-orientation-gate-active', 'false')
  await expect(root).toHaveAttribute('data-mobile-landscape', 'true')
  await expect(background).not.toHaveAttribute('inert', '')
  await expect(background).not.toHaveAttribute('aria-hidden', 'true')
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.dataset.e2eSameDocument
  )).toBe('preserved')

  await openScene(page, '團隊複核')
  const addSample = page.getByRole('button', { name: '新增下一次模擬資料' })
  await addSample.click()
  await addSample.click()
  await expect(page.getByText('回診摘要已建立')).toBeVisible()
  const resetReview = page.getByRole('button', { name: '重設示範' })
  await resetReview.focus()

  await page.setViewportSize(portrait)
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeFocused()

  await page.setViewportSize(landscape)
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: '先看趨勢，再由人共同複核' })).toBeVisible()
  await expect(page.getByText('回診摘要已建立')).toBeVisible()
  await expect(resetReview).toBeFocused()
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.dataset.e2eSameDocument
  )).toBe('preserved')
  await expectNoDocumentOverflow(page)
})

test('an in-progress tap test freezes in portrait and keeps its chapter and mode', async ({ page }) => {
  await page.setViewportSize(landscape)
  await expect(page.getByRole('dialog', { name: '建議橫向使用' })).toBeHidden()
  await page.getByRole('button', { name: /開始服藥前指尖測試/ }).first().click()
  await expect(page.getByRole('heading', { name: '服藥前，留下 20 秒動作快照' })).toBeVisible()

  const standardMode = page.getByRole('button', { name: '標準測試 · 20 秒' })
  await standardMode.click()
  await page.getByRole('button', { name: '開始 20 秒測試' }).click()
  await expect(page.getByRole('button', { name: '中止測試' })).toBeVisible()

  const remaining = page.locator('.timer-block strong')
  const readRemaining = async () => Number.parseFloat((await remaining.textContent()) ?? 'NaN')
  const beforePortrait = await readRemaining()

  await page.setViewportSize(portrait)
  await expect(page.getByRole('dialog', { name: '建議橫向使用' })).toBeVisible()
  const pausedAt = await readRemaining()
  await page.waitForTimeout(1_100)
  const stillPausedAt = await readRemaining()

  expect(Math.abs(pausedAt - stillPausedAt)).toBeLessThanOrEqual(0.1)
  expect(beforePortrait - pausedAt).toBeLessThanOrEqual(0.2)

  await page.setViewportSize(landscape)
  await expect(page.getByRole('dialog', { name: '建議橫向使用' })).toBeHidden()
  await expect(page.getByRole('heading', { name: '服藥前，留下 20 秒動作快照' })).toBeVisible()
  await expect(standardMode).toHaveClass(/active/)
  await expect(page.getByRole('button', { name: '中止測試' })).toBeVisible()
})

test('compact landscape layouts fit, split and remain vertically reachable', async ({ page }) => {
  await page.setViewportSize(landscape)
  await expect(page.locator('html')).toHaveAttribute('data-mobile-landscape', 'true')
  await expectNoDocumentOverflow(page)

  const viewportContract = await page.evaluate(() => ({
    meta: document.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.content ?? '',
    cssVisualHeight: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--kb-visual-viewport-height')
    ),
    visualHeight: window.visualViewport?.height ?? window.innerHeight
  }))
  expect(viewportContract.meta).toContain('viewport-fit=cover')
  expect(Math.abs(viewportContract.cssVisualHeight - viewportContract.visualHeight)).toBeLessThanOrEqual(1)

  const quickAction = page.locator('.landscape-quick-action')
  const quickActionBox = await quickAction.boundingBox()
  expect(quickActionBox).not.toBeNull()
  expect((quickActionBox?.y ?? Infinity) + (quickActionBox?.height ?? 0)).toBeLessThanOrEqual(landscape.height)

  await page.getByRole('button', { name: /開始服藥前指尖測試/ }).first().click()
  await expect(page.getByRole('heading', { name: '服藥前，留下 20 秒動作快照' })).toBeVisible()
  const actionBox = await page.locator('.test-actions').boundingBox()
  const padBoxes = await page.locator('.tap-pad').evaluateAll((pads) => pads.map((pad) => {
    const rect = pad.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }))
  expect(padBoxes).toHaveLength(2)
  expect(Math.abs(padBoxes[0].width - padBoxes[1].width)).toBeLessThan(1)
  expect(padBoxes.every((pad) => pad.width >= 44 && pad.height >= 44)).toBe(true)
  expect((actionBox?.y ?? Infinity) + (actionBox?.height ?? 0)).toBeLessThanOrEqual(landscape.height)
  await expectNoDocumentOverflow(page)

  await openScene(page, '發藥核對')
  const dispense = await page.locator('.dispenser-layout').evaluate((layout) => {
    const machine = layout.querySelector('.machine-card')?.getBoundingClientRect()
    const panel = layout.querySelector('.verification-panel')?.getBoundingClientRect()
    return machine && panel ? {
      split: Math.abs(machine.y - panel.y) < 2 && panel.x >= machine.x + machine.width,
      machineWidth: machine.width,
      panelWidth: panel.width
    } : null
  })
  expect(dispense?.split).toBe(true)
  expect(dispense?.machineWidth).toBeGreaterThan(230)
  expect(dispense?.panelWidth).toBeGreaterThanOrEqual(230)
  await expectNoDocumentOverflow(page)

  await openScene(page, '個人趨勢')
  const trend = await page.locator('.trend-chart-card').evaluate((card) => {
    const svg = card.querySelector('.trend-svg')
    return {
      cardClientWidth: card.clientWidth,
      cardScrollWidth: card.scrollWidth,
      chartWidth: svg?.getBoundingClientRect().width ?? 0,
      overflowX: getComputedStyle(card).overflowX
    }
  })
  expect(trend.chartWidth).toBeGreaterThanOrEqual(620)
  expect(trend.cardScrollWidth).toBeGreaterThanOrEqual(trend.cardClientWidth)
  expect(trend.overflowX).toBe('auto')
  await expectNoDocumentOverflow(page)

  await page.setViewportSize({ width: 667, height: 320 })
  const reachability = await page.evaluate(() => {
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    })
    const deepestControl = Math.max(...controls.map((element) =>
      element.getBoundingClientRect().bottom + window.scrollY
    ))
    return {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      deepestControl
    }
  })
  expect(reachability.scrollHeight).toBeGreaterThan(reachability.clientHeight)
  expect(reachability.deepestControl).toBeLessThanOrEqual(reachability.scrollHeight + 1)
  await expectNoDocumentOverflow(page)
})

test('the gate remains readable at a 200% effective viewport', async ({ page }) => {
  await page.setViewportSize({ width: 196, height: 329 })
  const dialog = page.getByRole('dialog', { name: '建議橫向使用' })
  await expect(dialog).toBeVisible()
  await expect(page.getByText(/旋轉手機後將自動繼續/)).toBeVisible()

  const geometry = await page.locator('[data-testid="mobile-orientation-gate"]').evaluate((gate) => {
    const copy = gate.querySelector('.mobile-orientation-gate__copy')?.getBoundingClientRect()
    const gateRect = gate.getBoundingClientRect()
    return {
      horizontalOverflow: gate.scrollWidth - gate.clientWidth,
      scrollHeight: gate.scrollHeight,
      clientHeight: gate.clientHeight,
      copyBottomWithinScrollRange: copy ? copy.bottom - gateRect.top <= gate.scrollHeight + 1 : false,
      overflowY: getComputedStyle(gate).overflowY
    }
  })
  expect(geometry.horizontalOverflow).toBe(0)
  expect(geometry.scrollHeight).toBeGreaterThanOrEqual(geometry.clientHeight)
  expect(geometry.copyBottomWithinScrollRange).toBe(true)
  expect(geometry.overflowY).toBe('auto')
})
