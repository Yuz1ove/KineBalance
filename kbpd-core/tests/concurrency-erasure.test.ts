import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs'
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

test('Controlled Concurrency Race: Pre-check Passes -> Identity Erasure -> Late-Write Abort & Compensating Cleanup', async t => {
  const tempDir = mkdtempSync(join(tmpdir(), 'kbpd-race-test-'))
  const dbPath = join(tempDir, 'race-test.db')

  const store = new PersistentStore(dbPath, tempDir)
  const identityManager = new IdentityManager(store)
  const erasureCoordinator = new ErasureCoordinator(identityManager, store)

  t.after(() => {
    store.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  // 1. Create User A and User B
  const userA = identityManager.createUser()
  const userB = identityManager.createUser()

  const sessionA = store.createSession(userA.userId, 'RIGHT')
  const sessionB = store.createSession(userB.userId, 'LEFT')

  // 2. Race Scenario 1: Media upload in-flight
  // Simulated delayed job:
  // Step A: Job passes pre-check
  erasureCoordinator.assertCanWrite(userA.userId)

  // Step B: User A triggers deletion concurrently before job writes to disk/db
  const receiptA = await erasureCoordinator.executeErasure(userA.userId)
  assert.equal(receiptA.status, 'ERASURE_COMPLETE')

  // Step C: In-flight upload job attempts to write media to store
  assert.throws(() => {
    store.saveMedia(
      userA.userId,
      sessionA.id,
      'late_arriving_video.mp4',
      'video/mp4',
      Buffer.from('LATE_VIDEO_STREAM_BYTES')
    )
  }, UserInErasureError)

  // Verify: No orphan media files left on disk for User A
  const userAMediaDir = join(tempDir, 'media', userA.userId)
  if (existsSync(userAMediaDir)) {
    const files = readdirSync(userAMediaDir)
    assert.equal(files.length, 0, 'No orphan files should remain in User A media directory')
  }

  // Verify: No media records exist in DB for User A
  const usageA = store.getUserStorageUsage(userA.userId)
  assert.equal(usageA.fileCount, 0)
  assert.equal(usageA.usedBytes, 0)

  // 3. Race Scenario 2: Analysis worker in-flight
  const inputA: MeasurementInput = {
    sessionId: sessionA.id,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames: createSampleFrames(),
  }

  assert.throws(() => {
    store.saveAnalysis(userA.userId, inputA)
  }, UserInErasureError)

  // Verify: User A is not resurrected, measurements count is 0
  const listA = store.listMeasurements(userA.userId)
  assert.equal(listA.total, 0)

  const userStatusA = identityManager.getUser(userA.userId)
  assert.equal(userStatusA?.status, 'DELETED')

  // 4. Verify User B is completely unaffected by User A's erasure and race
  const mediaB = store.saveMedia(userB.userId, sessionB.id, 'b.mp4', 'video/mp4', Buffer.from('USER_B_DATA'))
  assert.ok(existsSync(mediaB.storagePath))

  const inputB: MeasurementInput = {
    sessionId: sessionB.id,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'LEFT',
    mirrored: false,
    frames: createSampleFrames(),
  }
  const analysisB = store.saveAnalysis(userB.userId, inputB)
  assert.ok(analysisB.metrics.validTapCount >= 7)

  const readBackB = store.getMeasurement(userB.userId, sessionB.id)
  assert.equal(readBackB.session.id, sessionB.id)
  assert.equal(readBackB.mediaAssets.length, 1)

  // 5. Idempotent DELETE verification
  // Sending another deletion request for already-deleted User A
  const secondReceiptA = await erasureCoordinator.executeErasure(userA.userId)
  assert.equal(secondReceiptA.status, 'ERASURE_COMPLETE')
  assert.equal(secondReceiptA.receiptToken, receiptA.receiptToken)
  assert.equal(secondReceiptA.jobId, receiptA.jobId)
})
