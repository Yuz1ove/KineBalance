// Deployment entry for the original backend and existing data directory.
// Never silently initialize another database when a mount/configuration is missing.
import { createServer } from 'node:http'
import { existsSync, readFileSync, realpathSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { PersistentStore } from './storage/store.ts'
import { IdentityManager } from './storage/identity.ts'
import { ErasureCoordinator } from './storage/erasure.ts'
import { createApiServer } from './storage/server.ts'
import { BoundedArciInterpreter } from './arci/interpreter.ts'
import { ALGORITHM_VERSION } from './measurement/detector.ts'

const configuredData = process.env.KBPD_DATA_DIR
if (!configuredData || !existsSync(join(configuredData, 'kbpd-operational.db'))) {
  throw Error('KBPD_DATA_DIR must point to the existing original database directory; refusing to create a database')
}
const dataDir = realpathSync(configuredData)
const existing = new DatabaseSync(join(dataDir, 'kbpd-operational.db'), { readOnly: true })
try {
  const tables = new Set(existing.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name))
  if (['users', 'user_sessions', 'measurement_sessions', 'measurement_payloads', 'analysis_results', 'visit_summaries'].some(name => !tables.has(name))) {
    throw Error('Existing original storage schema required; refusing to initialize a replacement database')
  }
} finally { existing.close() }
const origins = (process.env.KBPD_ALLOWED_ORIGINS || '').split(',').filter(Boolean)
if (!origins.length || origins.some(value => {
  const url = new URL(value)
  return value !== url.origin || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
})) throw Error('KBPD_ALLOWED_ORIGINS requires exact HTTPS origins (loopback HTTP is permitted for local verification)')
const sourceRoot = fileURLToPath(new URL('.', import.meta.url))
const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : [])
const sourceSha256 = createHash('sha256').update(sourceFiles(sourceRoot).sort().map(path =>
  `${path.slice(sourceRoot.length)}:${createHash('sha256').update(readFileSync(path)).digest('hex')}`).join('\n')).digest('hex')
const store = new PersistentStore(join(dataDir, 'kbpd-operational.db'), dataDir)
const identityManager = new IdentityManager(store)
const profilePath = join(dataDir, 'demo-profile.json')
const evidencePath = resolve(process.env.KBPD_EVIDENCE_FILE || join(dataDir, '../evidence/evidence-registry.json'))
const evidence = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, 'utf8')).documents || [] : []
const port = Number(process.env.PORT || 4511)
const api = createApiServer({ port, store, identityManager,
  erasureCoordinator: new ErasureCoordinator(identityManager, store),
  arciInterpreter: new BoundedArciInterpreter(evidence.map((doc: any) => ({ doi: doc.doi, title: doc.title,
    findingExcerpt: doc.evidenceExcerpt || doc.findings, applicabilityLimit: doc.applicabilityLimit || doc.limitations }))),
  demoProfile: existsSync(profilePath) ? JSON.parse(readFileSync(profilePath, 'utf8')) : undefined,
  allowedOrigins: origins,
  runtimeIdentity: { algorithmVersion: ALGORITHM_VERSION, sourceSha256, sourceCommit: process.env.KBPD_SOURCE_COMMIT || 'UNCOMMITTED_REVIEW' },
})
const server = createServer((req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  // Deploy only the original API; static/test/vendor handlers are not public backend routes.
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/fixtures/') || pathname === '/api/auth/demo') {
    res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } })); return
  }
  api.emit('request', req, res)
})
server.requestTimeout = 30_000
server.headersTimeout = 15_000
server.listen(port, process.env.KBPD_BIND_HOST || '127.0.0.1', () => console.log(JSON.stringify({
  service: 'kbpd-core-original-storage', port, algorithmVersion: ALGORITHM_VERSION, sourceSha256,
  dataBinding: 'EXISTING_DATABASE', allowedOrigins: origins,
})))
const stop = () => server.close(() => { store.close(); process.exit(0) })
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
