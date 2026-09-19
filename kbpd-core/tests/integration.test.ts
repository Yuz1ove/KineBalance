import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { IdentityManager } from '../src/storage/identity.ts'
import { PersistentStore } from '../src/storage/store.ts'
import { ErasureCoordinator, UserInErasureError } from '../src/storage/erasure.ts'
import { BoundedArciInterpreter } from '../src/arci/interpreter.ts'
import type { LandmarkFrame, MeasurementInput, NormalizedLandmark } from '../src/measurement/contracts.ts'

function createSyntheticTappingInput(sessionId: string): MeasurementInput {
  const frames: LandmarkFrame[] = []
  for (let i = 0; i < 90; i++) {
    const t = i * 33.3
    const phase = (2 * Math.PI * t) / 300
    const distanceFactor = 0.4 + 0.3 * Math.sin(phase)
    const wrist: NormalizedLandmark = { x: 0.5, y: 0.8, z: 0 }
    const middleMcp: NormalizedLandmark = { x: 0.5, y: 0.55, z: 0 }
    const thumbTip: NormalizedLandmark = { x: 0.45, y: 0.5, z: 0 }
    const indexTip: NormalizedLandmark = { x: 0.45 + distanceFactor * 0.25, y: 0.5, z: 0 }
    const landmarks = new Array(21).fill(null).map((_, idx) => {
      if (idx === 0) return wrist
      if (idx === 9) return middleMcp
      if (idx === 4) return thumbTip
      if (idx === 8) return indexTip
      return { x: 0.5, y: 0.5, z: 0 }
    })
    frames.push({ frameIndex: i, timestampMs: Math.round(t), tracked: true, landmarks })
  }

  return {
    sessionId,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames,
  }
}

test('End-to-End: Multi-User Identity, Persistence, Late-Write Blocker & Cascade Erasure', async t => {
  const tempDir = mkdtempSync(join(tmpdir(), 'kbpd-test-'))
  const dbPath = join(tempDir, 'test-storage.db')

  const identityManager = new IdentityManager()
  let store = new PersistentStore(dbPath, tempDir)
  const erasureCoordinator = new ErasureCoordinator(identityManager, store)

  t.after(() => {
    try {
      store.close()
    } catch {}
    rmSync(tempDir, { recursive: true, force: true })
  })

  // 1. Insert Public Medical Evidence (should never be affected by user erasure)
  store.insertMedicalEvidence({
    doi: '10.3389/fneur.2021.742654',
    title: 'Remote Evaluation of PD Using Conventional Webcam',
    authors: 'Zhang et al.',
    year: 2021,
    licenseType: 'CC-BY-4.0',
    corpusVersion: 'kbpd-camera-evidence-v1',
    summaryText: 'Webcam motor kinematic assessment of tapping rhythm and decay.',
  })

  // 2. Create User A and User B
  const userA = identityManager.createUser()
  const userB = identityManager.createUser()

  assert.notEqual(userA.userId, userB.userId)
  assert.ok(userA.token.startsWith('kbpd_sec_'))

  // 3. Authenticate User A and create session
  const authA = identityManager.authenticate(`Bearer ${userA.token}`)
  assert.equal(authA.userId, userA.userId)

  const sessionA = store.createSession(userA.userId, 'RIGHT')
  assert.equal(sessionA.ownerUserId, userA.userId)

  // User A uploads media
  const mockMedia = Buffer.from('FAKE_VIDEO_STREAM_BYTES_SAMPLE')
  const mediaA = store.saveMedia(userA.userId, sessionA.id, 'finger_tap.bin', 'application/octet-stream', mockMedia)
  assert.equal(mediaA.sessionId, sessionA.id)
  assert.ok(existsSync(mediaA.storagePath))

  // User A runs analysis
  const inputA = createSyntheticTappingInput(sessionA.id)
  const analysisA = store.saveAnalysis(userA.userId, inputA)
  assert.ok(analysisA.metrics.validTapCount >= 7)

  // 4. User B creates their own session
  const sessionB = store.createSession(userB.userId, 'LEFT')
  const mediaB = store.saveMedia(userB.userId, sessionB.id, 'b_tap.bin', 'application/octet-stream', Buffer.from('USER_B_DATA'))

  // 5. Cross-User Identity Isolation Verification
  // User B tries to get User A's session -> must fail
  assert.throws(() => {
    store.getSession(userB.userId, sessionA.id)
  }, /SESSION_NOT_FOUND/)

  // User B tries to read User A's media -> must fail
  assert.throws(() => {
    store.getMediaAsset(userB.userId, mediaA.id)
  }, /MEDIA_NOT_FOUND/)

  // User B tries to delete User A's session -> must fail
  assert.throws(() => {
    store.deleteMeasurement(userB.userId, sessionA.id)
  }, /SESSION_NOT_FOUND/)

  // 6. Fresh Reconnect: Close DB and reopen fresh store instance
  store.close()
  store = new PersistentStore(dbPath, tempDir)
  const freshErasureCoordinator = new ErasureCoordinator(identityManager, store)

  // Verify fresh read-back
  const readBack = store.getMeasurement(userA.userId, sessionA.id)
  assert.equal(readBack.session.id, sessionA.id)
  assert.equal(readBack.mediaAssets.length, 1)
  assert.equal(readBack.mediaAssets[0].sha256, mediaA.sha256)
  assert.equal(readBack.measurementOutput?.metrics.validTapCount, analysisA.metrics.validTapCount)

  // 7. ARCI Interpretation Hook
  const interpreter = new BoundedArciInterpreter([
    {
      doi: '10.3389/fneur.2021.742654',
      title: 'Remote Evaluation of PD Using Conventional Webcam',
      findingExcerpt: 'Kinematic feature extraction from standard RGB webcam video.',
      applicabilityLimit: 'Research-only; not an autonomous clinical diagnostic.',
    },
  ])

  const interpretation = await interpreter.interpret(readBack)
  assert.equal(interpretation.qualificationStatus, 'UNQUALIFIED')
  assert.equal(interpretation.status, 'UNQUALIFIED_RESEARCH_ONLY')
  assert.equal(interpretation.observedMeasurements.validTapCount, analysisA.metrics.validTapCount)
  assert.ok(interpretation.limitationsAndMissingData.medicalDisclaimers.length >= 3)
  assert.ok(interpretation.nextSteps.prohibitedInferencesAcknowledged.some(p => p.includes('Automated diagnosis')))

  // 8. Cascade Erasure of User A
  const receipt = await freshErasureCoordinator.executeErasure(userA.userId)
  assert.equal(receipt.status, 'ERASURE_COMPLETE')
  assert.equal(receipt.purgedSummary.sessionsCount, 1)
  assert.equal(receipt.purgedSummary.mediaFilesCount, 1)
  assert.ok(receipt.receiptToken.startsWith('kbpd_receipt_'))

  // Verify User A media file physically removed from disk
  assert.equal(existsSync(mediaA.storagePath), false)

  // Verify User A token is immediately revoked
  assert.throws(() => {
    identityManager.authenticate(`Bearer ${userA.token}`)
  }, /USER_NOT_ACTIVE|INVALID_TOKEN/)

  // Verify User A data completely purged from DB
  const userAList = store.listMeasurements(userA.userId)
  assert.equal(userAList.total, 0)
  const userAUsage = store.getUserStorageUsage(userA.userId)
  assert.equal(userAUsage.usedBytes, 0)

  // 9. Late-Write / Resurrect Blocker Test
  // A delayed asynchronous worker tries to save analysis for User A AFTER erasure
  assert.throws(() => {
    freshErasureCoordinator.assertCanWrite(userA.userId)
  }, UserInErasureError)

  // 10. Verify User B and Public Medical Evidence remain 100% UNTOUCHED
  const readBackB = store.getMeasurement(userB.userId, sessionB.id)
  assert.equal(readBackB.session.id, sessionB.id)
  assert.equal(readBackB.mediaAssets.length, 1)
  assert.ok(existsSync(mediaB.storagePath))

  const evidenceList = store.listMedicalEvidence('kbpd-camera-evidence-v1')
  assert.equal(evidenceList.length, 1)
  assert.equal((evidenceList[0] as any).doi, '10.3389/fneur.2021.742654')

  // 11. Deletion Receipt Inspection by Token (without user account)
  const queryReceipt = freshErasureCoordinator.getReceiptByToken(receipt.receiptToken)
  assert.notEqual(queryReceipt, null)
  assert.equal(queryReceipt?.jobId, receipt.jobId)
  assert.equal(queryReceipt?.status, 'ERASURE_COMPLETE')
})
