import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { IdentityManager } from '../src/storage/identity.ts'
import { PersistentStore } from '../src/storage/store.ts'
import { ErasureCoordinator } from '../src/storage/erasure.ts'
import { createApiServer } from '../src/storage/server.ts'
import type { LandmarkFrame, MeasurementInput, NormalizedLandmark } from '../src/measurement/contracts.ts'

function dispatchRequest(
  server: any,
  options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: string | Buffer
  }
): Promise<{ statusCode: number; headers: Record<string, string>; json: () => any; text: string }> {
  return new Promise(resolve => {
    const { method = 'GET', url = '/', headers = {}, body = null } = options
    const req = new Readable({
      read() {
        if (body) this.push(Buffer.isBuffer(body) ? body : Buffer.from(body))
        this.push(null)
      },
    }) as any

    req.method = method
    req.url = url
    req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))

    const resChunks: Buffer[] = []
    const res = new EventEmitter() as any
    res.statusCode = 200
    res.headers = {}
    res.setHeader = (k: string, v: string) => {
      res.headers[k.toLowerCase()] = v
    }
    res.writeHead = (status: number, headers: Record<string, string> = {}) => {
      res.statusCode = status
      for (const [k, v] of Object.entries(headers)) res.headers[k.toLowerCase()] = v
    }
    res.write = (chunk: any) => resChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    res.end = (chunk?: any) => {
      if (chunk) resChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      const rawText = Buffer.concat(resChunks).toString('utf8')
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        text: rawText,
        json: () => JSON.parse(rawText),
      })
    }

    server.emit('request', req, res)
  })
}

function createTestFrames(): LandmarkFrame[] {
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

test('HTTP REST API: Sessions, Media Upload, Analysis, Identity Isolation & Erasure', async t => {
  const tempDir = mkdtempSync(join(tmpdir(), 'kbpd-api-test-'))
  const dbPath = join(tempDir, 'api-test.db')

  const identityManager = new IdentityManager()
  const store = new PersistentStore(dbPath, tempDir)
  const erasureCoordinator = new ErasureCoordinator(identityManager, store)

  const server = createApiServer({
    port: 0,
    identityManager,
    store,
    erasureCoordinator,
  })

  t.after(() => {
    store.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  // 1. Health check
  const healthRes = await dispatchRequest(server, { url: '/api/health' })
  assert.equal(healthRes.statusCode, 200)

  // 2. Create users
  const userA = identityManager.createUser()
  const userB = identityManager.createUser()

  // 3. User A creates session
  const createRes = await dispatchRequest(server, {
    method: 'POST',
    url: '/api/measurements',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handSide: 'RIGHT' }),
  })
  assert.equal(createRes.statusCode, 201)
  const sessionA = createRes.json()
  assert.equal(sessionA.ownerUserId, userA.userId)
  assert.equal(sessionA.handSide, 'RIGHT')

  // 4. User A uploads media
  const uploadRes = await dispatchRequest(server, {
    method: 'POST',
    url: `/api/measurements/${sessionA.id}/media`,
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/octet-stream',
      'X-File-Name': 'test_tap.mp4',
    },
    body: Buffer.from('TEST_VIDEO_BYTES_CONTENT'),
  })
  assert.equal(uploadRes.statusCode, 201)
  const mediaA = uploadRes.json()
  assert.equal(mediaA.sessionId, sessionA.id)

  // 5. User A triggers analysis
  const inputData: MeasurementInput = {
    sessionId: sessionA.id,
    protocolVersion: 'KBPD-FT-1.0',
    handSide: 'RIGHT',
    mirrored: false,
    frames: createTestFrames(),
  }
  const analyzeRes = await dispatchRequest(server, {
    method: 'POST',
    url: `/api/measurements/${sessionA.id}/analyze`,
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(inputData),
  })
  assert.equal(analyzeRes.statusCode, 200)
  const analysisOutput = analyzeRes.json()
  assert.ok(analysisOutput.metrics.validTapCount >= 7)

  // 6. User A checks storage usage
  const storageRes = await dispatchRequest(server, {
    url: '/api/me/storage',
    headers: { Authorization: `Bearer ${userA.token}` },
  })
  assert.equal(storageRes.statusCode, 200)
  const storageInfo = storageRes.json()
  assert.equal(storageInfo.fileCount, 1)
  assert.equal(storageInfo.sessionCount, 1)

  // 7. Identity Isolation: User B attempts to access User A's measurement
  const rogueRes = await dispatchRequest(server, {
    url: `/api/measurements/${sessionA.id}`,
    headers: { Authorization: `Bearer ${userB.token}` },
  })
  assert.equal(rogueRes.statusCode, 400) // Access denied / Not found for User B

  // 8. User A issues deletion request: DELETE /api/me
  const deleteRes = await dispatchRequest(server, {
    method: 'DELETE',
    url: '/api/me',
    headers: { Authorization: `Bearer ${userA.token}` },
  })
  assert.equal(deleteRes.statusCode, 202)
  const deletionReceipt = deleteRes.json()
  assert.equal(deletionReceipt.status, 'ERASURE_COMPLETE')
  assert.ok(deletionReceipt.receiptToken.startsWith('kbpd_receipt_'))

  // 9. Inspect deletion receipt via unauthenticated endpoint: GET /api/deletions/:receiptToken
  const receiptQueryRes = await dispatchRequest(server, {
    url: `/api/deletions/${deletionReceipt.receiptToken}`,
  })
  assert.equal(receiptQueryRes.statusCode, 200)
  const verifiedReceipt = receiptQueryRes.json()
  assert.equal(verifiedReceipt.jobId, deletionReceipt.jobId)

  // 10. User A attempts subsequent requests with old token -> must be rejected
  const postDeleteRes = await dispatchRequest(server, {
    url: '/api/me/storage',
    headers: { Authorization: `Bearer ${userA.token}` },
  })
  assert.equal(postDeleteRes.statusCode, 401)
})
