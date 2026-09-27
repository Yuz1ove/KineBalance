import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const dir='dist/vendor/mediapipe/0.4.1675469240'
const manifest=JSON.parse(readFileSync(`${dir}/manifest.json`))
for(const f of manifest.files){
  const bytes=readFileSync(`${dir}/${f.name}`)
  if(bytes.length!==f.bytes || createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error(`Missing or changed deployed asset: ${f.name}`)
}
console.log(`Verified ${manifest.files.length} deployed MediaPipe assets, models, WASM and license`)
