import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const version = '0.4.1675469240'
const source = 'node_modules/@mediapipe/hands'
if (JSON.parse(readFileSync(`${source}/package.json`)).version !== version) throw Error('MediaPipe version mismatch')
const target = `public/vendor/mediapipe/${version}`
mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })
cpSync('scripts/MEDIAPIPE-LICENSE.txt', `${target}/LICENSE`)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const apiBase = (process.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
if (apiBase) {
  const api = new URL(apiBase)
  if (api.username || api.password || api.search || api.hash ||
    !(api.protocol === 'https:' || (!process.env.VERCEL && api.protocol === 'http:' && ['localhost','127.0.0.1'].includes(api.hostname)))) {
    throw Error('API base must be HTTPS without credentials, query, or fragment; loopback HTTP is local-only')
  }
}
const files = readdirSync(target).filter(name=>name!=='manifest.json').map(name => ({ name, sha256: sha(readFileSync(`${target}/${name}`)), bytes: readFileSync(`${target}/${name}`).length }))
writeFileSync(`${target}/manifest.json`, JSON.stringify({package:'@mediapipe/hands',version,license:'Apache-2.0',files},null,2))
const paths = ['package.json','package-lock.json','vite.config.ts','vercel.json','tsconfig.app.json', ...execFileSync('find',['src','kbpd-core/src','scripts','-type','f'],{encoding:'utf8'}).trim().split('\n')].filter(p=>!p.includes('.test.')).sort()
const rawConfig=readFileSync('vercel.json')
const config=JSON.parse(rawConfig)
const deploymentConfig=Object.fromEntries(['framework','installCommand','buildCommand','outputDirectory','headers'].map(k=>[k,config[k]??null]))
const sourceFiles=paths.map(path=>({path,sha256:sha(path==='vercel.json'?JSON.stringify(deploymentConfig):readFileSync(path))}))
const sourceSha256 = sha(sourceFiles.map(f=>`${f.path}:${f.sha256}`).join('\n'))
let sourceCommit=process.env.KBPD_SOURCE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA
if(!sourceCommit){try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{throw Error('KBPD_SOURCE_COMMIT required outside Git checkout')}}
writeFileSync('public/build-identity.json', JSON.stringify({ release:'KBPD-PRODUCTION-REPAIR-20260927', sourceCommit, sourceSha256, sourceFiles, apiBase: apiBase || 'SAME_ORIGIN', deploymentConfig, platformConfigSha256:sha(rawConfig), configHashMode:'selected deployment contract fields; platform-injected fields excluded', mediapipe:version, builtAt:new Date().toISOString()}, null, 2))
console.log(`Prepared ${files.length} versioned MediaPipe files; source ${sourceSha256}`)
