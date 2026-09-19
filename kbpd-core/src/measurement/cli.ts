#!/usr/bin/env node
/**
 * CLI for KBPD Independent Finger-Tapping Measurement Core
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { analyzeFingerTapping } from './detector.ts'
import type { MeasurementInput } from './contracts.ts'

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node --experimental-strip-types cli.ts <input-file.json> [output-file.json]

Options:
  --help, -h    Show this help message
`)
    process.exit(0)
  }

  const inputPath = resolve(process.cwd(), args[0])
  const rawInput = readFileSync(inputPath, 'utf8')
  const inputData = JSON.parse(rawInput) as MeasurementInput

  const result = analyzeFingerTapping(inputData)

  if (args[1]) {
    const outputPath = resolve(process.cwd(), args[1])
    writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8')
    console.log(`Result written to ${outputPath}`)
  } else {
    console.log(JSON.stringify(result, null, 2))
  }
}

main()
