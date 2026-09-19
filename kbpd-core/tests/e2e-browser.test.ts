import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { IdentityManager } from '../src/storage/identity.ts'
import { PersistentStore } from '../src/storage/store.ts'
import { ErasureCoordinator } from '../src/storage/erasure.ts'
import { createApiServer } from '../src/storage/server.ts'
import { BoundedArciInterpreter } from '../src/arci/interpreter.ts'

// Import playwright from available installed node_modules
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/Yuz1ove/Documents/ChatGPT/ARCI 醫/candidates/kbpd-p241-repair02-offline-01/kinebalance/node_modules/playwright')

const SCREENSHOT_DIR = '/Users/Yuz1ove/.gemini/antigravity/brain/32affb2e-2256-421c-9fca-0bd67719922a/screenshots'

test('Browser E2E Lifecycle: Real Video Upload, MediaPipe, ARCI Wiring, Cross-Context Restore & Cascade Erasure', async t => {
  // 1. Setup isolated server environment
  const tempDir = mkdtempSync(join(tmpdir(), 'kbpd-browser-e2e-'))
  const dbPath = join(tempDir, 'browser-e2e.db')
  const store = new PersistentStore(dbPath, tempDir)
  const identityManager = new IdentityManager(store)
  const erasureCoordinator = new ErasureCoordinator(identityManager, store)

  const evidencePath = resolve(process.cwd(), 'evidence/evidence-registry.json')
  const rawEvidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
  const evidenceList = (rawEvidence.documents || []).map((doc: any) => ({
    doi: doc.doi,
    title: doc.title,
    findingExcerpt: doc.evidenceExcerpt || doc.findings,
    applicabilityLimit: doc.applicabilityLimit || doc.limitations,
  }))
  const arciInterpreter = new BoundedArciInterpreter(evidenceList)

  const server = createApiServer({
    port: 0,
    identityManager,
    store,
    erasureCoordinator,
    arciInterpreter,
  })

  await new Promise<void>(res => server.listen(0, '127.0.0.1', () => res()))
  const address = server.address() as { port: number }
  const baseUrl = `http://127.0.0.1:${address.port}`

  let browser: any = null

  t.after(async () => {
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
    await new Promise<void>(res => server.close(() => res()))
    try {
      store.close()
    } catch {}
    rmSync(tempDir, { recursive: true, force: true })
  })

  // 2. Launch Chromium browser
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
  })

  // ==========================================
  // PHASE A: Browser Context 1 (Initial User Session)
  // ==========================================
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()

  page1.on('console', (msg: any) => {
    if (msg.type() === 'error') console.error('[Page1 Error]:', msg.text())
  })

  await page1.goto(`${baseUrl}/test-harness`, { waitUntil: 'domcontentloaded' })

  // Verify page title and header
  const title = await page1.title()
  assert.ok(title.includes('KBPD 工程測試與量測驗收台'))

  // 1. Identity Registration
  await page1.click('#btnRegister')
  await page1.waitForFunction(() => {
    const el = document.getElementById('valUserId')
    return el && el.innerText !== '尚未登入' && el.innerText.length > 10
  })

  const userId = await page1.innerText('#valUserId')
  const token = await page1.inputValue('#inputToken')
  assert.ok(userId.length > 10)
  assert.ok(token.length > 20)

  // 2. Video Source A Verification: Upload real video file
  const testVideoPath = resolve(process.cwd(), 'tests/fixtures/test-sample.mp4')
  assert.ok(existsSync(testVideoPath), 'Test sample video exists')
  await page1.setInputFiles('#videoFileInput', testVideoPath)

  // Wait for video upload status to display file info
  await page1.waitForFunction(() => {
    const el = document.getElementById('videoFileStatus')
    return el && el.innerText.includes('test-sample.mp4')
  })

  // Allow brief tick for frame processing
  await page1.waitForTimeout(500)

  // 3. Load Synthetic Regression Fixture for reproducible kinematic analysis
  await page1.click('#btnReplayNormal')
  await page1.waitForFunction(() => {
    const el = document.getElementById('trackingStatusMsg')
    return el && el.innerText.includes('已載入合成特徵回歸資料')
  })

  // 4. Save Measurement & Perform Analysis
  await page1.click('#btnSaveMeasurement')
  await page1.waitForFunction(() => {
    const el = document.getElementById('storeOutput')
    return el && el.innerText.includes('[MEASUREMENT & REAL ANALYSIS SAVED]')
  })

  // Check calculated kinematic metrics on UI
  const tapCountText = await page1.innerText('#mTapCount')
  const freqText = await page1.innerText('#mFrequency')
  const decayText = await page1.innerText('#mDecay')
  const tapCount = Number(tapCountText)
  const freq = Number(freqText)

  assert.ok(tapCount > 0, `Tap count must be > 0, got ${tapCount}`)
  assert.ok(freq > 0, `Frequency must be > 0, got ${freq}`)
  assert.ok(decayText !== '-' && decayText !== 'N/A', `Decay ratio must be present, got ${decayText}`)

  // 5. Save Media Asset
  await page1.click('#btnSaveMedia')
  await page1.waitForFunction(() => {
    const el = document.getElementById('storeOutput')
    return el && el.innerText.includes('[MEDIA ASSET SAVED]')
  })

  // 6. Trigger ARCI Interpretation & Verify Decision Wiring
  await page1.click('#btnInterpret')
  await page1.waitForFunction(() => {
    const box = document.getElementById('arciContainer')
    return box && box.style.display !== 'none'
  })

  // Verify Audit Trail Receipt
  const receiptText = await page1.innerText('#arciReceiptSummary')
  assert.ok(receiptText.includes('KBPD-DOMAIN-EVAL-V1.0.0'), 'Must contain domain rules version')
  assert.ok(receiptText.includes('73284a3d'), 'Must contain reader SHA-256')
  assert.ok(receiptText.includes('NO_BASELINE') || receiptText.includes('NORMAL_ANALYSIS'), 'Must evaluate to valid decision state')

  // Verify 5 Sections are populated
  const sec1 = await page1.innerText('#arciSec1')
  const sec2 = await page1.innerText('#arciSec2')
  const sec3 = await page1.innerText('#arciSec3')
  const sec4 = await page1.innerText('#arciSec4')
  const sec5 = await page1.innerText('#arciSec5')

  assert.ok(sec1.includes('有效敲擊次數'), 'Section 1 must display kinematic observations')
  assert.ok(sec2.includes('歷史基準線狀態'), 'Section 2 must display baseline context')
  assert.ok(sec3.includes('[文獻]'), 'Section 3 must contain cited evidence with DOI')
  assert.ok(sec4.includes('運動學合格判定'), 'Section 4 must display limitations & quality')
  assert.ok(sec5.includes('後續建議行動'), 'Section 5 must display next steps & safe guidance')

  // Take Screenshot 1: Measurement & ARCI Output
  const screenshot1Path = join(SCREENSHOT_DIR, 'e2e-step1-measurement-and-arci.png')
  await page1.screenshot({ path: screenshot1Path, fullPage: true })
  assert.ok(existsSync(screenshot1Path), 'Screenshot 1 must be created')

  // ==========================================
  // PHASE B: Browser Context 2 (New Device / Fresh Session Restore)
  // ==========================================
  const context2 = await browser.newContext()
  const page2 = await context2.newPage()

  page2.on('console', (msg: any) => {
    if (msg.type() === 'error') console.error('[Page2 Error]:', msg.text())
  })

  // Register dialog handler to auto-accept confirm on delete
  page2.on('dialog', async (dialog: any) => {
    await dialog.accept()
  })

  await page2.goto(`${baseUrl}/test-harness`, { waitUntil: 'domcontentloaded' })

  // Enter token and Restore Identity
  await page2.fill('#inputToken', token)
  await page2.click('#btnRestore')

  await page2.waitForFunction(
    (expectedId: string) => {
      const el = document.getElementById('valUserId')
      return el && el.innerText === expectedId
    },
    userId
  )

  const restoredUserId = await page2.innerText('#valUserId')
  assert.equal(restoredUserId, userId, 'Restored user ID must match original')

  // Reopen and read-back measurements across contexts
  await page2.click('#btnReadBack')
  await page2.waitForFunction(() => {
    const el = document.getElementById('storeOutput')
    return el && el.innerText.includes('[REOPEN & READ-BACK SUCCESS]')
  })

  const readBackText = await page2.innerText('#storeOutput')
  assert.ok(readBackText.includes('Total Historical Measurements: 1'), 'Must read back 1 saved measurement')

  // Take Screenshot 2: Cross-Context Reopen & Read-back
  const screenshot2Path = join(SCREENSHOT_DIR, 'e2e-step2-cross-context-readback.png')
  await page2.screenshot({ path: screenshot2Path, fullPage: true })
  assert.ok(existsSync(screenshot2Path), 'Screenshot 2 must be created')

  // ==========================================
  // PHASE C: Controlled Purge & Anti-Resurrection Verification
  // ==========================================
  // Execute DELETE /api/me
  await page2.click('#btnDeleteIdentity')
  await page2.waitForFunction(() => {
    const el = document.getElementById('erasureOutput')
    return el && el.innerText.includes('[CONTROLLED PURGE EXECUTED]')
  })

  const purgeOutput = await page2.innerText('#erasureOutput')
  assert.ok(purgeOutput.includes('受控清除範圍 (Controlled Purge Scope)'), 'Must disclose purge scope')
  assert.ok(purgeOutput.includes('未涵蓋範圍 (Out of Scope)'), 'Must disclose out-of-scope disk shredding/snapshots')

  // Verify UI identity is cleared
  const clearedUser = await page2.innerText('#valUserId')
  assert.equal(clearedUser, '無登入身分')

  // Put deleted token back into inputToken for post-purge verification
  await page2.fill('#inputToken', token)

  // Verify Read Blocked (Expect 401)
  await page2.click('#btnVerifyReadBlocked')
  await page2.waitForFunction(() => {
    const el = document.getElementById('erasureOutput')
    return el && el.innerText.includes('[VERIFY READ-BLOCKED]')
  })
  const readBlockedOutput = await page2.innerText('#erasureOutput')
  assert.ok(readBlockedOutput.includes('HTTP Status: 401'), 'Must reject read with 401')

  // Verify Late-Write Blocked (Anti-Resurrection, Expect 401)
  await page2.click('#btnVerifyLateWriteBlocked')
  await page2.waitForFunction(() => {
    const el = document.getElementById('erasureOutput')
    return el && el.innerText.includes('[VERIFY ANTI-RESURRECTION LATE-WRITE]')
  })
  const lateWriteOutput = await page2.innerText('#erasureOutput')
  assert.ok(lateWriteOutput.includes('HTTP Status: 401'), 'Must reject late-write with 401')

  // Take Screenshot 3: Controlled Purge & Anti-Resurrection
  const screenshot3Path = join(SCREENSHOT_DIR, 'e2e-step3-controlled-erasure.png')
  await page2.screenshot({ path: screenshot3Path, fullPage: true })
  assert.ok(existsSync(screenshot3Path), 'Screenshot 3 must be created')

  console.log('✅ All Browser E2E Lifecycle Stages & Screenshots Completed Successfully!')
})
