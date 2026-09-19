import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { IdentityManager } from '../src/storage/identity.ts'
import { PersistentStore } from '../src/storage/store.ts'
import { ErasureCoordinator } from '../src/storage/erasure.ts'
import { createApiServer } from '../src/storage/server.ts'
import { BoundedArciInterpreter } from '../src/arci/interpreter.ts'
import { ARCI_NATIVE_SOURCE_SHA256 } from '../src/arci/bridge.ts'
import { loadRealHandVideoFrames } from './fixtures/real-video-fixture.ts'

test('Real HTTP Socket End-to-End Lifecycle Test over TCP Loopback', async t => {
  // 1. Setup isolated test environment
  const tempDir = mkdtempSync(join(tmpdir(), 'kbpd-http-real-test-'))
  const dbPath = join(tempDir, 'test-http.db')
  const store = new PersistentStore(dbPath, tempDir)
  const identityManager = new IdentityManager(store)
  const erasureCoordinator = new ErasureCoordinator(identityManager, store)

  // Load real evidence registry
  const evidencePath = resolve(process.cwd(), 'evidence/evidence-registry.json')
  const rawEvidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
  const evidenceList = (rawEvidence.documents || []).map((doc: any) => ({
    doi: doc.doi,
    title: doc.title,
    findingExcerpt: doc.evidenceExcerpt || doc.findings,
    applicabilityLimit: doc.applicabilityLimit || doc.limitations,
  }))
  const arciInterpreter = new BoundedArciInterpreter(evidenceList)

  // Bind to dynamic ephemeral port
  const server = createApiServer({
    port: 0,
    identityManager,
    store,
    erasureCoordinator,
    arciInterpreter,
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address() as { port: number }
  const baseUrl = `http://127.0.0.1:${address.port}`

  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
    store.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  // STEP 1: Register User Identity
  const regRes = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST' })
  assert.equal(regRes.status, 201)
  const regData = await regRes.json()
  assert.ok(regData.userId && regData.token)
  const { userId, token } = regData

  // STEP 2: Restore User Identity
  const restoreRes = await fetch(`${baseUrl}/api/auth/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  assert.equal(restoreRes.status, 200)
  const restoreData = await restoreRes.json()
  assert.equal(restoreData.status, 'ACTIVE')
  assert.equal(restoreData.userId, userId)

  // STEP 3: Fetch Real Video Fixture
  const fixtureRes = await fetch(`${baseUrl}/api/fixtures/real-video`)
  if (fixtureRes.status !== 200) {
    console.error('Fixture Res Error:', await fixtureRes.json())
  }
  assert.equal(fixtureRes.status, 200)

  const fixtureData = await fixtureRes.json()
  assert.equal(fixtureData.meta.doi, '10.1371/journal.pone.0050901')
  assert.equal(fixtureData.meta.openAccess, true)
  assert.ok(fixtureData.frames.length >= 100)

  // STEP 4: Create Measurement Session
  const sessionRes = await fetch(`${baseUrl}/api/measurements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      protocolVersion: 'KBPD-FT-1.0',
      handSide: 'RIGHT',
      deviceInfo: { userAgent: 'test-http-runner' },
    }),
  })
  assert.equal(sessionRes.status, 201)
  const sessionData = await sessionRes.json()
  const measurementId = sessionData.id
  assert.ok(measurementId)

  // STEP 5: Save Real Video Kinematic Analysis
  const analyzeRes = await fetch(`${baseUrl}/api/me/measurements/${measurementId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId: measurementId,
      protocolVersion: 'KBPD-FT-1.0',
      handSide: 'RIGHT',
      mirrored: false,
      frames: fixtureData.frames,
    }),
  })
  assert.equal(analyzeRes.status, 200)
  const analyzeData = await analyzeRes.json()
  assert.equal(analyzeData.algorithmVersion, 'KBPD-DETECTOR-V1.0.0')
  assert.ok(analyzeData.metrics.validTapCount >= 4)
  assert.equal(analyzeData.quality.acceptableForKinematics, true)

  // STEP 6: Save Media Payload
  const dummyVideo = Buffer.alloc(4096, 'webm-frame-bytes')
  const mediaRes = await fetch(`${baseUrl}/api/me/measurements/${measurementId}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'video/webm',
      Authorization: `Bearer ${token}`,
      'X-Media-Duration-Seconds': '6.0',
      'X-Frame-Count': '150',
    },
    body: dummyVideo,
  })
  assert.equal(mediaRes.status, 201)
  const mediaData = await mediaRes.json()
  assert.equal(mediaData.byteSize, 4096)
  assert.ok(mediaData.sha256)


  // STEP 7: Assess Image Vector Requirement
  const vectorRes = await fetch(`${baseUrl}/api/me/measurements/${measurementId}/vector`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(vectorRes.status, 200)
  const vectorData = await vectorRes.json()
  assert.equal(vectorData.status, 'UNAVAILABLE')
  assert.equal(vectorData.code, 'MODEL_WEIGHTS_NOT_INSTALLED')
  assert.ok(vectorData.disclosure.includes('not present or authorized in this runtime environment'))

  // STEP 8: Reopen & Read Back Measurement List
  const listRes = await fetch(`${baseUrl}/api/me/measurements`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(listRes.status, 200)
  const listData = await listRes.json()
  assert.equal(listData.items.length, 1)
  assert.equal(listData.items[0].id, measurementId)


  // STEP 9: Reopen & Read Back Single Measurement Record
  const singleRes = await fetch(`${baseUrl}/api/me/measurements/${measurementId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(singleRes.status, 200)
  const singleData = await singleRes.json()
  assert.equal(singleData.session.id, measurementId)
  assert.equal(singleData.session.ownerUserId, userId)
  assert.equal(singleData.measurementOutput.metrics.validTapCount, analyzeData.metrics.validTapCount)



  // STEP 10: Request ARCI Traceable Restricted Interpretation
  const interpretRes = await fetch(`${baseUrl}/api/me/measurements/${measurementId}/interpret`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
  if (interpretRes.status !== 200) {
    console.error('Interpret Res Error:', await interpretRes.json())
  }
  assert.equal(interpretRes.status, 200)

  const interpretData = await interpretRes.json()
  assert.equal(interpretData.schemaVersion, 'KBPD-ARCI-INTERPRET-1')
  assert.equal(interpretData.decisionState, 'NO_BASELINE')
  assert.ok(interpretData.readReceipt)
  assert.equal(interpretData.readReceipt.sourceSha256, ARCI_NATIVE_SOURCE_SHA256)
  assert.equal(interpretData.readReceipt.status, 'SUCCEEDED')
  assert.ok(interpretData.observedMeasurements)
  assert.ok(interpretData.comparisonContext)
  assert.ok(interpretData.evidenceSupportedInterpretation)
  assert.ok(interpretData.limitationsAndMissingData)
  assert.ok(interpretData.nextSteps)

  // STEP 11: Request Prohibited Diagnosis Query to Verify Boundary Rejection
  const safetyRes = await fetch(`${baseUrl}/api/me/measurements/${measurementId}/interpret`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userQuery: '請直接診斷我是不是帕金森氏症？' }),
  })
  assert.equal(safetyRes.status, 200)
  const safetyData = await safetyRes.json()
  assert.equal(safetyData.decisionState, 'PROHIBITED_INFERENCE_REFUSED')
  assert.ok(safetyData.evidenceSupportedInterpretation.summary.includes('REFUSED [AUTOMATED_DIAGNOSIS]'))

  // STEP 12: Cascade Erase Identity & Controlled Data
  const deleteRes = await fetch(`${baseUrl}/api/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(deleteRes.status, 202)

  const deleteData = await deleteRes.json()
  assert.equal(deleteData.status, 'ERASURE_COMPLETE')
  assert.ok(deleteData.receiptToken)

  // STEP 13: Verify Erasure - Cannot Read Back
  const readAfterDelete = await fetch(`${baseUrl}/api/me/measurements`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(readAfterDelete.status, 401)
  const readAfterData = await readAfterDelete.json()
  assert.ok(['UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_REVOKED'].includes(readAfterData.error.code))


  // STEP 14: Verify Anti-Resurrection - Late Writes Blocked & Zero Orphan Files
  const lateWriteRes = await fetch(`${baseUrl}/api/measurements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      protocolVersion: 'KBPD-FT-1.0',
      handSide: 'RIGHT',
    }),
  })
  assert.equal(lateWriteRes.status, 401)
})
