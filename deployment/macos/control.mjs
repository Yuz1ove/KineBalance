import { execFileSync, spawnSync } from 'node:child_process'
const [action, name] = process.argv.slice(2)
if (!['status','stop','start','restart'].includes(action) || !['backend','tunnel'].includes(name)) throw Error('Usage: control.mjs status|stop|start|restart backend|tunnel')
const domain = `gui/${process.getuid()}`, label = `space.yuz1ove.kinebalance.${name}`
const target = `${domain}/${label}`
if (action === 'status') { process.stdout.write(execFileSync('/bin/launchctl', ['print', target])); process.exit(0) }
if (action === 'stop' || action === 'restart') execFileSync('/bin/launchctl', ['bootout', target])
if (action === 'start' || action === 'restart') {
  for (let attempt = 0; attempt < 30; attempt++) {
    const r = spawnSync('/bin/launchctl', ['bootstrap', domain, `${process.env.HOME}/Library/LaunchAgents/${label}.plist`], { encoding: 'utf8' })
    if (r.status === 0) { console.log(`${label} started`); break }
    if (attempt === 29) throw Error(`Service start failed: ${r.stderr}`)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}
