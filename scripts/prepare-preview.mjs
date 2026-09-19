import {cpSync,mkdirSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname} from 'node:path'
const require=createRequire(import.meta.url)
const vendor=dirname(require.resolve('../kbpd-core/node_modules/@mediapipe/hands/package.json'))
mkdirSync('public/vendor/mediapipe',{recursive:true})
cpSync(vendor,'public/vendor/mediapipe',{recursive:true})
const {loadRealHandVideoFrames,loadRealHandVideoWithTrackingDisturbance}=await import('../kbpd-core/tests/fixtures/real-video-fixture.ts')
mkdirSync('public/fixtures',{recursive:true})
writeFileSync('public/fixtures/finger-tapping-synthetic.json',JSON.stringify(loadRealHandVideoFrames()))
writeFileSync('public/fixtures/finger-tapping-synthetic-disturbed.json',JSON.stringify(loadRealHandVideoWithTrackingDisturbance()))
