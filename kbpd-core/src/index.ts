import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { IdentityManager } from './storage/identity.ts'
import { PersistentStore } from './storage/store.ts'
import { ErasureCoordinator } from './storage/erasure.ts'
import { createApiServer } from './storage/server.ts'
import { BoundedArciInterpreter } from './arci/interpreter.ts'

const PORT = parseInt(process.env.PORT || '4498', 10)
const DATA_DIR = resolve(process.cwd(), '.data')
const DB_PATH = join(DATA_DIR, 'kbpd-operational.db')

console.log('=== KBPD Independent Core & Storage System ===')
console.log(`Operational Data Directory: ${DATA_DIR}`)
console.log(`Database Path: ${DB_PATH}`)

const store = new PersistentStore(DB_PATH, DATA_DIR)
const identityManager = new IdentityManager(store)
const erasureCoordinator = new ErasureCoordinator(identityManager, store)

// Load incremental camera evidence
let evidenceList: any[] = []
const evidencePath = resolve(process.cwd(), 'evidence/evidence-registry.json')
if (existsSync(evidencePath)) {
  try {
    const raw = JSON.parse(readFileSync(evidencePath, 'utf8'))
    evidenceList = (raw.documents || []).map((doc: any) => ({
      doi: doc.doi,
      title: doc.title,
      findingExcerpt: doc.evidenceExcerpt || doc.findings,
      applicabilityLimit: doc.applicabilityLimit || doc.limitations,
    }))
  } catch (err) {
    console.warn('Could not parse evidence registry:', err)
  }
}

const arciInterpreter = new BoundedArciInterpreter(evidenceList)

const apiServer = createApiServer({
  port: PORT,
  identityManager,
  store,
  erasureCoordinator,
  arciInterpreter,
})

// Wrap server to serve formal product UI and engineering test harness
const publicDir = resolve(process.cwd(), 'public')
const mainServer = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  // 1. Engineering Test Harness
  if (pathname === '/test-harness' || pathname === '/test-harness.html') {
    const harnessPath = join(publicDir, 'test-harness.html')
    if (existsSync(harnessPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(readFileSync(harnessPath))
      return
    }
  }

  // 2. Static Assets (CSS, JS, Fonts)
  if (pathname.startsWith('/assets/')) {
    const assetPath = join(publicDir, pathname)
    if (existsSync(assetPath)) {
      let contentType = 'application/octet-stream'
      if (pathname.endsWith('.js')) contentType = 'application/javascript; charset=utf-8'
      else if (pathname.endsWith('.css')) contentType = 'text/css; charset=utf-8'
      else if (pathname.endsWith('.wasm')) contentType = 'application/wasm'
      else if (pathname.endsWith('.svg')) contentType = 'image/svg+xml'
      else if (pathname.endsWith('.json')) contentType = 'application/json'

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      })
      res.end(readFileSync(assetPath))
      return
    }
  }

  // 3. API and Vendor routes go to apiServer
  if (pathname.startsWith('/api/') || pathname.startsWith('/vendor/')) {
    apiServer.emit('request', req, res)
    return
  }

  // 4. Client-side SPA routing fallback for formal product UI
  if (req.method === 'GET' || req.method === 'HEAD') {
    const indexPath = join(publicDir, 'index.html')
    if (existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      res.end(readFileSync(indexPath))
      return
    }
  }

  // Fallback to API server
  apiServer.emit('request', req, res)
})

mainServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[KBPD-CORE] Server listening on http://127.0.0.1:${PORT}`)
  console.log(`[KBPD-CORE] Engineering Test Harness: http://127.0.0.1:${PORT}/test-harness`)
  console.log('[KBPD-CORE] API Status: Ready')
})

function shutdown() {
  console.log('\nGracefully shutting down KBPD Core...')
  mainServer.close(() => {
    store.close()
    console.log('Database and server closed.')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
