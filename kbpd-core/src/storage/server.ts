import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import type { IdentityManager } from './identity.ts'
import type { PersistentStore } from './store.ts'
import type { ErasureCoordinator } from './erasure.ts'
import type { ArciInterpreter } from '../arci/interpreter.ts'

export interface ServerOptions {
  port: number
  identityManager: IdentityManager
  store: PersistentStore
  erasureCoordinator: ErasureCoordinator
  arciInterpreter?: ArciInterpreter
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data, null, 2))
}

function sendError(res: ServerResponse, statusCode: number, code: string, message: string) {
  sendJson(res, statusCode, { error: { code, message } })
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  const buf = await readBody(req)
  if (buf.length === 0) return {}
  return JSON.parse(buf.toString('utf8'))
}


export function createApiServer(options: ServerOptions) {
  const { identityManager, store, erasureCoordinator, arciInterpreter } = options

  const server = createServer(async (req, res) => {
    // Add basic CORS & security headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname
    const authHeader = req.headers.authorization

    try {
      // 1. Unauthenticated Deletion Receipt Endpoint (by receipt token)
      if (req.method === 'GET' && pathname.startsWith('/api/deletions/')) {
        const token = pathname.slice('/api/deletions/'.length)
        const receipt = erasureCoordinator.getReceiptByToken(token)
        if (!receipt) {
          sendError(res, 404, 'RECEIPT_NOT_FOUND', 'Deletion receipt token not found')
          return
        }
        sendJson(res, 200, receipt)
        return
      }

      // 2. Health check
      if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, { status: 'OK', timestamp: new Date().toISOString() })
        return
      }

      // Static Public Files (Product UI or Engineering Test Harness)
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html' || pathname === '/test-harness' || pathname === '/test-harness.html')) {
        const publicDir = resolve(process.cwd(), 'public')
        const targetFile = (pathname === '/test-harness' || pathname === '/test-harness.html')
          ? join(publicDir, 'test-harness.html')
          : join(publicDir, 'index.html')
        if (existsSync(targetFile)) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(readFileSync(targetFile))
          return
        }
      }

      // Static Vendor Assets (MediaPipe Hands WASM, BinaryPB, TFLite & Scripts)
      if (req.method === 'GET' && pathname.startsWith('/vendor/mediapipe/')) {
        const fileName = pathname.slice('/vendor/mediapipe/'.length)
        const vendorPath = resolve(process.cwd(), 'node_modules/@mediapipe/hands', fileName)
        if (existsSync(vendorPath) && statSync(vendorPath).isFile()) {
          let contentType = 'application/octet-stream'
          if (fileName.endsWith('.js')) contentType = 'application/javascript; charset=utf-8'
          else if (fileName.endsWith('.wasm')) contentType = 'application/wasm'
          else if (fileName.endsWith('.json')) contentType = 'application/json'
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          })
          res.end(readFileSync(vendorPath))
          return
        }
        sendError(res, 404, 'VENDOR_ASSET_NOT_FOUND', `Vendor asset ${fileName} not found`)
        return
      }

      // Public fixture endpoint for real video replay
      if (req.method === 'GET' && pathname === '/api/fixtures/real-video') {
        const { loadRealHandVideoFrames, loadRealHandVideoWithTrackingDisturbance, REAL_VIDEO_PROVENANCE } = await import(
          '../../tests/fixtures/real-video-fixture.ts'
        )
        const disturbed = url.searchParams.get('disturbed') === 'true'
        if (disturbed) {
          sendJson(res, 200, {
            meta: REAL_VIDEO_PROVENANCE,
            frames: loadRealHandVideoWithTrackingDisturbance(),
          })
        } else {
          sendJson(res, 200, loadRealHandVideoFrames())
        }
        return
      }


      // 3. User Registration / Creation: POST /api/auth/register or POST /api/identity
      if (req.method === 'POST' && (pathname === '/api/auth/register' || pathname === '/api/identity')) {
        const user = identityManager.createUser()
        sendJson(res, 201, {
          userId: user.userId,
          token: user.token,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        })
        return
      }

      // 4. User Session Restore / Verify: POST /api/auth/restore
      if (req.method === 'POST' && pathname === '/api/auth/restore') {
        const bodyBuf = await readBody(req)
        let tokenToVerify = ''
        if (bodyBuf.length > 0) {
          try {
            const parsed = JSON.parse(bodyBuf.toString('utf8'))
            if (parsed.token) tokenToVerify = parsed.token
          } catch {}
        }
        if (!tokenToVerify && authHeader?.startsWith('Bearer ')) {
          tokenToVerify = authHeader.slice(7).trim()
        }

        if (!tokenToVerify) {
          sendError(res, 400, 'TOKEN_REQUIRED', 'Token is required to restore session')
          return
        }

        try {
          const auth = identityManager.authenticate(`Bearer ${tokenToVerify}`)
          sendJson(res, 200, {
            userId: auth.userId,
            token: tokenToVerify,
            status: 'ACTIVE',
            restoredAt: new Date().toISOString(),
          })
          return
        } catch (err: any) {
          sendError(res, 401, err.code || 'INVALID_TOKEN', err.message || 'Session token could not be restored')
          return
        }
      }

      // All remaining endpoints require authenticated identity
      let userId: string
      try {
        const auth = identityManager.authenticate(authHeader)
        userId = auth.userId
      } catch (err: any) {
        sendError(res, 401, err.code || 'UNAUTHORIZED', err.message || 'Authentication required')
        return
      }

      // 5. User Identity and Data Erasure (DELETE /api/me allows idempotent deletion even if in erasure)
      if (req.method === 'DELETE' && pathname === '/api/me') {
        const receipt = await erasureCoordinator.executeErasure(userId)
        sendJson(res, 202, receipt)
        return
      }

      // Check if user is being erased for all remaining write/read operations
      try {
        erasureCoordinator.assertCanWrite(userId)
      } catch (err: any) {
        sendError(res, 403, 'USER_IN_ERASURE', 'Account is being deleted; operations are forbidden')
        return
      }

      // 6. User Storage Usage
      if (req.method === 'GET' && pathname === '/api/me/storage') {
        const usage = store.getUserStorageUsage(userId)
        sendJson(res, 200, usage)
        return
      }

      // 7. User Measurements List (Paginated)
      if (req.method === 'GET' && pathname === '/api/me/measurements') {
        const page = parseInt(url.searchParams.get('page') || '1', 10)
        const limit = parseInt(url.searchParams.get('limit') || '20', 10)
        const result = store.listMeasurements(userId, page, limit)
        sendJson(res, 200, result)
        return
      }

      // 8. Create Measurement Session
      if (req.method === 'POST' && pathname === '/api/measurements') {
        const bodyBuf = await readBody(req)
        const body = bodyBuf.length > 0 ? JSON.parse(bodyBuf.toString('utf8')) : {}
        const handSide = body.handSide || 'RIGHT'
        const session = store.createSession(userId, handSide)
        sendJson(res, 201, session)
        return
      }

      // Dynamic routes: /api/measurements/:id/... or /api/me/measurements/:id/...
      const measurementIdMatch = pathname.match(/^\/api\/(?:me\/)?measurements\/([a-zA-Z0-9-]+)(\/.*)?$/)
      if (measurementIdMatch) {

        const measurementId = measurementIdMatch[1]
        const subPath = measurementIdMatch[2] || ''

        // Delete single measurement
        if (req.method === 'DELETE' && subPath === '') {
          store.deleteMeasurement(userId, measurementId)
          sendJson(res, 200, { success: true, deletedMeasurementId: measurementId })
          return
        }

        // Get single measurement
        if (req.method === 'GET' && subPath === '') {
          const measurement = store.getMeasurement(userId, measurementId)
          sendJson(res, 200, measurement)
          return
        }

        // Upload media for measurement
        if (req.method === 'POST' && subPath === '/media') {
          const buffer = await readBody(req)
          const fileName = req.headers['x-file-name'] ? String(req.headers['x-file-name']) : 'recording.bin'
          const mimeType = req.headers['content-type'] || 'application/octet-stream'

          const media = store.saveMedia(userId, measurementId, fileName, mimeType, buffer)
          sendJson(res, 201, media)
          return
        }

        // Trigger Analysis
        if (req.method === 'POST' && subPath === '/analyze') {
          const bodyBuf = await readBody(req)
          const input = JSON.parse(bodyBuf.toString('utf8'))
          input.sessionId = measurementId

          // Defensive check before write
          erasureCoordinator.assertCanWrite(userId)
          const output = store.saveAnalysis(userId, input)
          sendJson(res, 200, output)
          return
        }

        // ARCI Interpretation
        if (req.method === 'POST' && subPath === '/interpret') {
          if (!arciInterpreter) {
            sendJson(res, 200, {
              status: 'UNAVAILABLE',
              reason: 'ARCI_INTERPRETER_DISABLED',
              message: 'ARCI live interpretation service is disabled or unconfigured in this environment',
            })
            return
          }

          const body = await parseJsonBody(req).catch(() => ({}))
          const userQuery = body.query || body.userQuery
          const measurement = store.getMeasurement(userId, measurementId)
          const priors = store.getPriorMeasurements(userId, measurement.session.handSide)
            .filter(m => m.id !== measurementId)
          const interpretation = await arciInterpreter.interpret(measurement, {
            userQuery,
            priorMeasurements: priors,
          })
          sendJson(res, 200, interpretation)
          return
        }

        // Image Vector Assessment (Mandatory requirement evaluation)
        if (req.method === 'POST' && subPath === '/vector') {
          sendJson(res, 200, {
            status: 'UNAVAILABLE',
            schemaVersion: 'KBPD-IMAGE-VECTOR-1',
            code: 'MODEL_WEIGHTS_NOT_INSTALLED',
            vectorDimension: 512,
            embedding: null,
            disclosure:
              'Local vision embedding model weights are not present or authorized in this runtime environment. Kinematic motor tracking, persistent storage, and traceable ARCI restricted interpretation operate independently without obstruction.',
            evaluatedAt: new Date().toISOString(),
          })
          return
        }
      }



      sendError(res, 404, 'NOT_FOUND', `Cannot ${req.method} ${pathname}`)
    } catch (err: any) {
      if (err.name === 'QuotaExceededError') {
        sendError(res, 413, err.code, err.message)
        return
      }
      if (err.name === 'StoreError') {
        sendError(res, 400, err.code, err.message)
        return
      }
      if (err.name === 'AuthenticationError') {
        sendError(res, 401, err.code, err.message)
        return
      }
      if (err.name === 'UserInErasureError') {
        sendError(res, 403, err.code, err.message)
        return
      }

      sendError(res, 500, 'INTERNAL_SERVER_ERROR', err.message || 'Unknown server error')
    }
  })

  return server
}
