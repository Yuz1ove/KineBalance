import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { IdentityManager } from '../src/storage/identity.ts'
import { PersistentStore, UserInErasureError } from '../src/storage/store.ts'
import { ErasureCoordinator } from '../src/storage/erasure.ts'
import type { LandmarkFrame, MeasurementInput, NormalizedLandmark } from '../src/measurement/contracts.ts'

function createSampleFrames(): LandmarkFrame[] {
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
  return frames
}

test('Persistence Across Process Restart: Identity, Measurements, Files, and Deletion Receipts', async t => {
  const tempDir = mkdtempSync(join(tmpdir(), 'kbpd-restart-test-'))
  const dbPath = join(tempDir, 'restart-test.db')

  // Phase 1: First Process Lifetime
  let store = new PersistentStore(dbPath, tempDir)
  let identityManager = new IdentityManager(store)
  let erasureCoordinator = new ErasureCoordinator(identityManager, store)

  t.after(() => {
    try {
      store.close()
    } catch {}
    rmSync(tempDir, { recursive: true, force: true })
  })

  // 1. Create User A and User B
  const userA = identityManager.createUser()
  const userB = identityManager.createUser()

  // 2. User A creates session, media, analysis
  const sessionA = store.createSession(userA.userId, 'RIGHT')
  const mediaA = store.saveMedia(userA.userId, sessionA.id, 'user_a_sample.bin', 'application/octet-stream', Buffer.from('USER_A_BINARY_PAYLOAD'))
  const inputA: MeasurementInput = {
    sessionId: sessionA.id,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames: createSampleFrames(),
  }
  store.saveAnalysis(userA.userId, inputA)

  // 3. User B creates session, media, analysis
  const sessionB = store.createSession(userB.userId, 'LEFT')
  const mediaB = store.saveMedia(userB.userId, sessionB.id, 'user_b_sample.bin', 'application/octet-stream', Buffer.from('USER_B_BINARY_PAYLOAD'))
  const inputB: MeasurementInput = {
    sessionId: sessionB.id,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'LEFT',
    mirrored: false,
    frames: createSampleFrames(),
  }
  store.saveAnalysis(userB.userId, inputB)

  // 4. User A deletes their account
  const receiptA = await erasureCoordinator.executeErasure(userA.userId)
  assert.equal(receiptA.status, 'ERASURE_COMPLETE')
  assert.ok(receiptA.receiptToken.startsWith('kbpd_receipt_'))

  // Phase 2: Simulate Complete Process Termination & Re-initialization
  store.close()

  const freshStore = new PersistentStore(dbPath, tempDir)
  store = freshStore // update ref for teardown
  const freshIdentityManager = new IdentityManager(freshStore)
  const freshErasureCoordinator = new ErasureCoordinator(freshIdentityManager, freshStore)

  // 5. Verify User B re-authenticates and restores seamlessly after process reboot
  const authB = freshIdentityManager.authenticate(`Bearer ${userB.token}`)
  assert.equal(authB.userId, userB.userId)

  // 6. Verify User B measurements and files are intact and readable
  const readBackB = freshStore.getMeasurement(userB.userId, sessionB.id)
  assert.equal(readBackB.session.id, sessionB.id)
  assert.equal(readBackB.mediaAssets.length, 1)
  assert.equal(readBackB.mediaAssets[0].sha256, mediaB.sha256)
  assert.equal(readBackB.measurementOutput?.metrics.validTapCount, 9)

  const mediaReadBackB = freshStore.getMediaAsset(userB.userId, mediaB.id)
  assert.equal(mediaReadBackB.buffer.toString(), 'USER_B_BINARY_PAYLOAD')

  // 7. Verify User A's token is STILL revoked and cannot authenticate after reboot
  assert.throws(() => {
    freshIdentityManager.authenticate(`Bearer ${userA.token}`)
  }, /USER_NOT_ACTIVE|INVALID_TOKEN/)

  // 8. Verify User A's erasure receipt is STILL queryable via receipt token after reboot!
  const queryReceipt = freshErasureCoordinator.getReceiptByToken(receiptA.receiptToken)
  assert.notEqual(queryReceipt, null)
  assert.equal(queryReceipt?.jobId, receiptA.jobId)
  assert.equal(queryReceipt?.status, 'ERASURE_COMPLETE')
  assert.equal(queryReceipt?.purgedSummary.mediaFilesCount, 1)

  // 9. Verify late-write blocker still catches User A after reboot
  assert.throws(() => {
    freshErasureCoordinator.assertCanWrite(userA.userId)
  }, UserInErasureError)

  assert.throws(() => {
    freshStore.createSession(userA.userId, 'RIGHT')
  }, UserInErasureError)
})
