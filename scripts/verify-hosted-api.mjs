import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const identity = JSON.parse(readFileSync('dist/build-identity.json', 'utf8'))
if (process.env.KBPD_VERIFY_REMOTE_API === '1' && identity.apiBase !== 'SAME_ORIGIN') {
  const sourceFiles = identity.sourceFiles.filter(f => f.path.startsWith('kbpd-core/src/') && f.path.endsWith('.ts'))
  const expected = createHash('sha256').update(sourceFiles.map(f => `${f.path.slice('kbpd-core/src/'.length)}:${f.sha256}`).join('\n')).digest('hex')
  const response = await fetch(identity.apiBase + '/api/health', { signal: AbortSignal.timeout(20000) })
  const health = await response.json()
  if (!response.ok || health.algorithmVersion !== readFileSync('kbpd-core/src/measurement/detector.ts', 'utf8').match(/export const ALGORITHM_VERSION = '([^']+)'/)[1] || health.sourceSha256 !== expected) throw Error('Hosted API identity mismatch')
  const denied = await fetch(identity.apiBase + '/api/me/measurements', { signal: AbortSignal.timeout(20000) })
  if (denied.status !== 401) throw Error('Anonymous API access must be rejected')
  const receipt = { execution: 'VERCEL_REMOTE_BUILD', at: new Date().toISOString(), apiBase: identity.apiBase, health, anonymousStatus: denied.status, sourceHashVerified: true, authenticatedSave: 'NOT_TESTED_BY_THIS_REMOTE_PROBE' }
  writeFileSync('dist/api-connectivity.json', JSON.stringify(receipt, null, 2))
  console.log('External HTTPS API identity and anonymous isolation verified from Vercel build')
}
