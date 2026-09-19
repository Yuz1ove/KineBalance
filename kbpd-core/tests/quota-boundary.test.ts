import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import { PersistentStore } from '../src/storage/store.ts'
import { IdentityManager } from '../src/storage/identity.ts'
import { ErasureCoordinator } from '../src/storage/erasure.ts'
import { QuotaExceededError } from '../src/storage/quota.ts'

test('Storage Quota & Boundary Enforcement: Single upload limit & cumulative quota release', async t => {
  const testDir = join(process.cwd(), '.data/quota-test')
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true })

  const dbPath = join(testDir, 'quota-test.db')
  const store = new PersistentStore(dbPath, testDir)
  const identity = new IdentityManager(store)
  const erasure = new ErasureCoordinator(identity, store)

  const user = identity.createUser()
  const userId = user.userId
  const session = store.createSession(userId, 'RIGHT')

  // 1. Verify single upload limit (10 MB = 10 * 1024 * 1024 bytes)
  const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024) // 10MB + 1KB
  assert.throws(
    () => {
      store.saveMedia(userId, session.id, 'oversized.mp4', 'video/mp4', oversizedBuffer)
    },
    (err: any) => {
      assert.ok(err instanceof QuotaExceededError)
      assert.equal(err.code, 'QUOTA_EXCEEDED')
      return true
    },
    'Uploads exceeding 10MB must be rejected'
  )

  // Verify no orphan media files created on disk
  const userMediaDir = join(testDir, 'media', userId)
  const filesAfterOversized = existsSync(userMediaDir) ? require('fs').readdirSync(userMediaDir) : []
  assert.equal(filesAfterOversized.length, 0, 'Oversized file rejection must leave zero orphan files')

  // 2. Upload valid file within quota (5 MB)
  const validChunk = Buffer.alloc(5 * 1024 * 1024)
  const asset1 = store.saveMedia(userId, session.id, 'video1.mp4', 'video/mp4', validChunk)
  assert.ok(asset1.id)

  const usage1 = store.getUserStorageUsage(userId)
  assert.equal(usage1.usedBytes, 5 * 1024 * 1024)
  assert.equal(usage1.fileCount, 1)

  // 3. Test cumulative quota: maxStoragePerUserBytes = 50MB
  // Custom store with small quota to verify cumulative limit
  const smallStore = new PersistentStore(join(testDir, 'small.db'), testDir, {
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxStoragePerUserBytes: 8 * 1024 * 1024, // 8 MB total
    maxVideoDurationSeconds: 30,
    maxFramesPerSession: 900,
    maxUserVectors: 100,
    maxConcurrentAnalyses: 2,
    tempTaskTtlMs: 3600000,
  })
  const smallIdentity = new IdentityManager(smallStore)
  const user2 = smallIdentity.createUser()
  const s2 = smallStore.createSession(user2.userId, 'RIGHT')

  // Save 5 MB (allowed)
  smallStore.saveMedia(user2.userId, s2.id, 'part1.bin', 'application/octet-stream', Buffer.alloc(5 * 1024 * 1024))

  // Save another 5 MB -> total 10 MB > 8 MB limit -> must reject!
  assert.throws(
    () => {
      smallStore.saveMedia(user2.userId, s2.id, 'part2.bin', 'application/octet-stream', Buffer.alloc(5 * 1024 * 1024))
    },
    (err: any) => {
      assert.ok(err instanceof QuotaExceededError)
      assert.equal(err.code, 'QUOTA_EXCEEDED')
      return true
    }
  )

  // 4. Verify Controlled Deletion & Quota Release
  const receipt = await erasure.executeErasure(userId)
  assert.equal(receipt.status, 'ERASURE_COMPLETE')
  assert.ok(receipt.controlledPurgeScope.includes('SQLite relational rows'))
  assert.ok(receipt.outOfScopeDisclosure.includes('Host OS block-level disk shredding'))

  // Usage must be 0 and directories removed
  const usageAfter = store.getUserStorageUsage(userId)
  assert.equal(usageAfter.usedBytes, 0)
  assert.equal(usageAfter.fileCount, 0)
  assert.equal(existsSync(userMediaDir), false, 'User media directory must be purged on erasure')

  store.close()
  smallStore.close()
  rmSync(testDir, { recursive: true, force: true })
})
