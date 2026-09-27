// launchd owns restart/backoff; this wrapper only redacts and bounds child logs.
import { spawn } from 'node:child_process'
import { appendFileSync, statSync, renameSync, existsSync } from 'node:fs'
const config = JSON.parse((await import('node:fs')).readFileSync(process.argv[2], 'utf8'))
const log = (event, detail = {}) => {
  if (existsSync(config.log) && statSync(config.log).size > 1024 * 1024) renameSync(config.log, config.log + '.1')
  appendFileSync(config.log, JSON.stringify({ at: new Date().toISOString(), event, ...detail }) + '\n', { mode: 0o600 })
}
const child = spawn(config.executable, config.args, { cwd: config.cwd, env: { PATH: '/usr/bin:/bin', HOME: process.env.HOME, ...config.env }, stdio: ['ignore', 'pipe', 'pipe'] })
log('start', { childPid: child.pid, service: config.service })
// Never forward raw stderr/stdout: upstream exceptions may contain credentials or payloads.
for (const [stream, name] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) stream.on('data', chunk => log('child-output', { stream: name, bytes: chunk.length }))
child.on('error', e => log('spawn-error', { code: e.code || 'UNKNOWN' }))
child.on('exit', (code, signal) => { log('exit', { code, signal }); process.exit(code ?? 1) })
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { log('stop-request'); child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 10000).unref() })
