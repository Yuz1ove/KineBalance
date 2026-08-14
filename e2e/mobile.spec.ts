import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  )).toBeLessThanOrEqual(0)
}

test('portrait menus navigate both experiences without horizontal overflow', async ({ page }) => {
  test.setTimeout(90_000)

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const exhibition = page.getByTestId('exhibition-mode')
  await expect(exhibition).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await exhibition.getByRole('button', { name: '開啟章節選單' }).click()
  const chapterMenu = exhibition.getByRole('navigation', { name: '手機章節導覽' })
  await expect(chapterMenu).toBeVisible()
  await expect(chapterMenu.getByRole('button')).toHaveCount(7)
  await chapterMenu.getByRole('button', { name: /Personal Pattern/ }).click()
  await expect(page).toHaveURL(/#pattern$/)
  await expect(page.locator('#pattern')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  const bottomNav = exhibition.getByRole('navigation', { name: '目前展覽章節' })
  await bottomNav.getByRole('button', { name: '完整操作' }).click()
  const clinical = page.getByTestId('clinical-demo-mode')
  await expect(clinical).toBeVisible()
  await expect(page).toHaveURL(/#clinical\/trend$/)

  await clinical.getByRole('button', { name: '開啟場景選單' }).click()
  const sceneMenu = clinical.getByRole('navigation', { name: '六個體驗場景' })
  await expect(sceneMenu).toBeVisible()
  await expect(sceneMenu.getByRole('button')).toHaveCount(6)
  await sceneMenu.getByRole('button', { name: '前往場景：用藥時程' }).click()
  await expect(clinical.getByRole('heading', { name: '今日照護總覽' })).toBeVisible()
  await expect(page).toHaveURL(/#clinical\/schedule$/)
  await expectNoHorizontalOverflow(page)
})
