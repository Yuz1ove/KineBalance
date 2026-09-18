import { expect, test } from '@playwright/test'

test('reduced motion keeps every chapter visible and presents a static opening', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expect(page.getByTestId('exhibition-mode')).toBeVisible()

  for (const id of ['rhythm', 'medication', 'motion', 'dispense', 'response', 'pattern', 'review']) {
    await expect(page.locator(`#${id}`)).toBeVisible()
  }

  const openingElements = page.locator('[data-opening-animated]')
  await expect(openingElements).toHaveCount(10)
  const readOpeningStyles = () => openingElements.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element)
    return { opacity: style.opacity, transform: style.transform, animationName: style.animationName }
  }))
  const openingStyles = await readOpeningStyles()
  await page.waitForTimeout(100)
  expect(await readOpeningStyles()).toEqual(openingStyles)
  for (const style of openingStyles) {
    expect(style.opacity).toBe('1')
    expect(style.animationName).toBe('none')
    expect(style.transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  }

  const orbit = page.locator('.opening-orbit').first()
  await expect(orbit).toHaveCSS('animation-name', 'none')
  await expect(orbit).toHaveCSS('transform', 'none')
  await expect(page.getByText('每一次用藥，都是理解動作變化的時間錨點。')).toBeVisible()
  await expect(page.getByText(/不診斷.*不調藥.*不停止用藥/).first()).toBeVisible()
})
