import { expect, test, type Page } from '@playwright/test'

const chapters = [
  ['Rhythm', 'rhythm'],
  ['Medication', 'medication'],
  ['Motion Test', 'motion'],
  ['Verified Dispense', 'dispense'],
  ['Response Window', 'response'],
  ['Personal Pattern', 'pattern'],
  ['Human Review', 'review']
] as const

const clinicalModules = [
  ['用藥時程', 'schedule', '今日照護總覽'],
  ['指尖測試', 'tap', '服藥前，留下 20 秒動作快照'],
  ['發藥核對', 'dispense', '每次交付，都經過實體核對'],
  ['反應追蹤', 'followup', '約 60 分鐘後，再看一次變化'],
  ['個人趨勢', 'trend', '看自己的長期變化，不和別人比較'],
  ['團隊複核', 'review', '先看趨勢，再由人共同複核']
] as const

async function openClinical(page: Page, scene = 'schedule') {
  await page.goto(`/#clinical/${scene}`)
  await expect(page.locator('.experience-root')).toHaveAttribute('data-experience-mode', 'clinical')
  await expect(page.getByTestId('clinical-demo-mode')).toBeVisible()
}

test('navigates the Exhibition, research drawer, and all six Clinical modules', async ({ page }) => {
  test.setTimeout(90_000)

  await page.goto('/')
  const exhibition = page.getByTestId('exhibition-mode')
  await expect(exhibition).toBeVisible()
  await expect(exhibition.getByRole('heading', { level: 1, name: 'KineBalance' })).toBeVisible()

  const chapterNav = exhibition.getByRole('navigation', { name: '展覽章節導覽' })
  await expect(chapterNav.getByRole('button')).toHaveCount(chapters.length)
  await expect(chapterNav.getByRole('button')).toHaveText(chapters.map(([label]) => label))
  const medicationChapter = chapterNav.getByRole('button', { name: 'Medication' })
  await medicationChapter.click({ force: true })
  await expect(page).toHaveURL(/#medication$/)
  await expect(medicationChapter).toHaveAttribute('aria-current', 'location')
  await expect(page.locator('#medication')).toBeVisible()

  await exhibition.locator('.exhibition-icon-action').click({ force: true })
  const research = page.getByRole('dialog', { name: '研究依據與誠實邊界' })
  await expect(research).toBeVisible()
  await expect(research.getByText(/尚未證明.*改善臨床結果/)).toBeVisible()
  await research.getByRole('button', { name: '關閉' }).click()
  await expect(research).toBeHidden()

  await exhibition.getByRole('button', { name: '完整操作模式', exact: true }).click({ force: true })
  await expect(page.locator('.experience-root')).toHaveAttribute('data-experience-mode', 'clinical')
  await expect(page).toHaveURL(/#clinical\/schedule$/)
  const clinical = page.getByTestId('clinical-demo-mode')
  const sceneNav = clinical.getByRole('navigation', { name: '六個體驗場景' })
  await expect(sceneNav.getByRole('button')).toHaveCount(clinicalModules.length)
  await expect(sceneNav.getByRole('button')).toContainText(clinicalModules.map(([label]) => label))
  const scheduleButton = sceneNav.getByRole('button', { name: '前往場景：用藥時程' })
  await scheduleButton.click({ force: true })
  await expect(page).toHaveURL(/#clinical\/schedule$/)
  await expect(scheduleButton).toHaveAttribute('aria-current', 'step')
  await expect(clinical.getByRole('heading', { name: '今日照護總覽' })).toBeVisible()
})

test('completes the six-second tap exhibit and accepts F/J keyboard input', async ({ page }) => {
  test.setTimeout(90_000)

  await openClinical(page, 'tap')
  const clinical = page.getByTestId('clinical-demo-mode')
  await expect(clinical.getByRole('button', { name: '快速展示 · 6 秒' })).toHaveClass(/active/)
  await clinical.getByRole('button', { name: '播放可重現模擬' }).click()
  await expect(clinical.getByText('正在播放固定節奏的概念展示…')).toBeVisible()

  await expect(clinical.locator('.quality-card strong')).toHaveText('測試有效', { timeout: 12_000 })
  const validTapCount = Number(await clinical.locator('.metric').filter({ hasText: '有效點擊' }).locator('strong').textContent())
  expect(validTapCount).toBe(18)

  await clinical.getByRole('button', { name: '重新測試' }).click()
  await clinical.getByRole('button', { name: '標準測試 · 20 秒' }).click()
  await clinical.getByRole('button', { name: '開始 20 秒測試' }).click()
  await expect(clinical.getByRole('button', { name: '中止測試' })).toBeVisible()
  await expect(clinical.locator('.countdown-overlay')).toBeHidden()
  await expect(clinical.locator('.test-header').getByText('蒐集中', { exact: true })).toBeVisible()
  await expect(clinical.locator('.metric').filter({ hasText: '有效點擊' }).locator('strong')).toHaveText('0')
  await page.keyboard.press('f')
  await expect(clinical.locator('.metric').filter({ hasText: '有效點擊' }).locator('strong')).toHaveText('1')
  await expect(clinical.getByText('下一次：右側', { exact: true })).toBeVisible()
  await page.keyboard.press('j')
  await expect(clinical.locator('.metric').filter({ hasText: '有效點擊' }).locator('strong')).toHaveText('2')
  await expect(clinical.locator('.metric').filter({ hasText: '交替錯誤' }).locator('strong')).toHaveText('0.0')
  await clinical.getByRole('button', { name: '中止測試' }).click()
  await expect(clinical.getByText('本次結果不影響依醫囑用藥。')).toBeVisible()
})

test('completes normal dispensing and isolates an anomalous batch before retry', async ({ page }) => {
  test.setTimeout(90_000)

  await openClinical(page, 'dispense')
  const clinical = page.getByTestId('clinical-demo-mode')

  await clinical.getByRole('button', { name: '展示正常流程' }).click()
  await expect(clinical.getByText('2 顆已送達核對通過取藥抽屜')).toBeVisible({ timeout: 12_000 })
  await expect(clinical.getByText('發藥紀錄不等於患者已吞下藥物。')).toBeVisible()

  await clinical.getByRole('button', { name: '重播' }).click()
  await clinical.getByRole('button', { name: '數量異常' }).click()
  await clinical.getByRole('button', { name: '展示異常流程' }).click()
  await expect(clinical.getByText('異常批次已鎖定，等待照顧者確認')).toBeVisible({ timeout: 12_000 })
  await expect(clinical.getByText(/本次自動交付已暫停.*不等於停止患者用藥/)).toBeVisible()

  await clinical.getByRole('button', { name: /照顧者已確認，重新執行/ }).click()
  await expect(clinical.getByText('全新 2 顆已通過核對並送達取藥抽屜')).toBeVisible({ timeout: 12_000 })
  await expect(clinical.getByText('原異常 3 顆仍鎖定在暫存抽屜。')).toBeVisible()
})

test('fast-forwards the response window without blocking medication', async ({ page }) => {
  await openClinical(page, 'followup')
  const clinical = page.getByTestId('clinical-demo-mode')
  await clinical.getByRole('button', { name: '快速預覽 60 分鐘' }).click()

  await expect(clinical.getByText('視窗已開啟')).toBeVisible()
  await expect(clinical.getByText('可開始測試', { exact: true })).toBeVisible()
  await expect(clinical.getByText('未完成測試也不中斷用藥')).toBeVisible()
})

test('shows all five personal trend states without comparing other people', async ({ page }) => {
  await openClinical(page, 'trend')
  const clinical = page.getByTestId('clinical-demo-mode')
  const tablist = clinical.getByRole('tablist', { name: '趨勢狀態展示' })
  const states = [
    ['累積基線中', '累積基線中'],
    ['測試無效', '測試無效，先確認是否需要協助'],
    ['單次偏離', '單次有效偏離'],
    ['3 次中 2 次', '建議照顧者關注'],
    ['連續 3 次', '已通知主要照顧者']
  ] as const

  await expect(tablist.getByRole('tab')).toHaveCount(states.length)
  for (const [tabName, outcome] of states) {
    const tab = tablist.getByRole('tab', { name: new RegExp(tabName) })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await expect(clinical.getByRole('heading', { level: 2, name: outcome })).toBeVisible()
  }
  await expect(clinical.getByRole('heading', { name: '看自己的長期變化，不和別人比較' })).toBeVisible()
})

test('keeps one deviation private and escalates only repeated valid deviations', async ({ page }) => {
  await openClinical(page, 'review')
  const clinical = page.getByTestId('clinical-demo-mode')
  const addReading = clinical.getByRole('button', { name: '新增下一次模擬資料' })

  await expect(clinical.getByText('單次有效偏離，先記錄')).toBeVisible()
  await expect(clinical.getByRole('button', { name: /單次偏離不通知/ })).toBeDisabled()
  await addReading.click()
  await expect(clinical.getByText('主要照顧者已收到非緊急提醒', { exact: true })).toBeVisible()
  await expect(clinical.getByText('回診摘要已建立')).toBeHidden()

  await addReading.click()
  await expect(clinical.getByText('回診摘要已建立')).toBeVisible()
  await expect(clinical.getByText('已通知主要照顧者，建議與醫療團隊共同複核')).toBeVisible()
  await expect(clinical.getByText('未變更')).toBeVisible()
})
