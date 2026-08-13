import { expect, test } from '@playwright/test'

test('reduced motion uses a static landscape device cue', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: '建議橫向使用' })).toBeFocused()

  const stage = page.locator('.mobile-orientation-gate__device-stage')
  const device = page.locator('.mobile-orientation-gate__device')
  await expect(stage).toHaveAttribute('data-motion', 'static')
  await expect(device).toHaveCSS('animation-name', 'none')
  await expect(device).not.toHaveCSS('transform', 'none')
})
