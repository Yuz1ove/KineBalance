import { expect, test } from '@playwright/test'

test('a narrow desktop window never activates the phone orientation gate', async ({ page }) => {
  await page.goto('/')
  const gate = page.locator('[data-testid="mobile-orientation-gate"]')

  await expect(gate).toBeHidden()
  await expect(page.locator('html')).toHaveAttribute('data-orientation-gate-active', 'false')
  await expect(page.locator('html')).toHaveAttribute('data-mobile-landscape', 'false')
  await expect(page.getByRole('heading', { name: '今日照護總覽' })).toBeVisible()
})
