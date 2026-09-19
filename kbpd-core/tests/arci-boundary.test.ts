import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import {
  ARCI_SEALED_PATH,
  ARCI_NATIVE_SOURCE_SHA256,
  verifyArciSealedCoreIntegrity,
  executeArciBoundedRead,
} from '../src/arci/bridge.ts'
import { BoundedArciInterpreter } from '../src/arci/interpreter.ts'
import type { StoredMeasurement } from '../src/storage/store.ts'

// Load real evidence registry
const evidencePath = resolve(process.cwd(), 'evidence/evidence-registry.json')
const rawEvidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
const evidenceList = (rawEvidence.documents || []).map((doc: any) => ({
  doi: doc.doi,
  title: doc.title,
  findingExcerpt: doc.evidenceExcerpt || doc.findings,
  applicabilityLimit: doc.applicabilityLimit || doc.limitations,
}))

function createSampleMeasurement(
  id: string,
  overrides?: {
    handSide?: 'LEFT' | 'RIGHT'
    validTapCount?: number
    averageFrequencyHz?: number | null
    amplitudeDecayRatio?: number | null
    acceptableForKinematics?: boolean
    unreliabilityReasons?: string[]
  }
): StoredMeasurement {
  const handSide = overrides?.handSide ?? 'RIGHT'
  const validTapCount = overrides?.validTapCount ?? 6
  const acceptableForKinematics = overrides?.acceptableForKinematics ?? true
  const unreliabilityReasons = overrides?.unreliabilityReasons ?? []

  return {
    id,
    session: {
      userId: 'test-user-001',
      protocolVersion: 'KBPD-FT-1.0',
      handSide,
      deviceInfo: { userAgent: 'test-agent', screenResolution: '1920x1080' },
      notes: 'unit-test-session',
      createdAt: '2026-09-16T12:00:00Z',
      mirrored: false,
    },
    measurementOutput: {
      schemaVersion: 'KBPD-MEASUREMENT-OUT-1',
      sessionId: id,
      calculatedAt: '2026-09-16T12:00:15Z',
      algorithmVersion: 'KBPD-DETECTOR-V1.0.0',
      handSide,
      quality: {
        qualityVersion: 'KBPD-QUALITY-V1.0.0',
        totalFrames: 150,
        validFrames: 145,
        validFrameRatio: 0.967,
        trackingLossIntervals: [],
        largeGapDetected: false,
        sideConfidence: 1.0,
        acceptableForKinematics,
        unreliabilityReasons,
      },
      metrics: {
        validTapCount,
        effectiveDurationSeconds: 6.0,
        averageFrequencyHz: overrides?.averageFrequencyHz ?? 1.45,
        intervalSequenceMs: [700, 680, 720, 750, 790, 810],
        intervalVariabilityCv: 0.065,
        amplitudeSequenceNorm: [0.82, 0.79, 0.75, 0.72, 0.70, 0.67],
        averageAmplitudeNorm: 0.742,
        amplitudeDecayRatio: overrides?.amplitudeDecayRatio ?? 0.817,
        speedDecayRatio: 0.78,
        calculationNotes: [],
      },
      limitations: ['Standard 2D webcam normalization'],
    },
    analysisRecordPath: evidencePath, // Use real readable JSON file for bounded read test
  }
}

test('ARCI Sealed Core Binding: Directly loads and verifies read-only sealed core integrity', t => {
  const check = verifyArciSealedCoreIntegrity()
  assert.equal(check.verified, true, 'Sealed core SHA-256 must match expected sealed hash')
  assert.equal(check.sha256, ARCI_NATIVE_SOURCE_SHA256)

  // Verify bounded read produces verifiable receipt
  const { content, receipt } = executeArciBoundedRead(evidencePath, 'ANALYSIS_RECORD', 'test-meas-01')
  assert.ok(content.length > 0)
  assert.equal(receipt.schemaVersion, 'KBPD-ARCI-READ-1')
  assert.equal(receipt.status, 'SUCCEEDED')
  assert.equal(receipt.sourceSha256, ARCI_NATIVE_SOURCE_SHA256)
  assert.equal(receipt.entry, 'src/foundations/bounded-json-file.ts#readBoundedUtf8FileSync')
  assert.ok(receipt.output && receipt.output.byteLength > 0)
})

test('ARCI Boundary Case 1: Adequate quality with observable changes (with baseline comparison)', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)

  const baseline = createSampleMeasurement('meas-baseline-01', {
    averageFrequencyHz: 1.60,
    amplitudeDecayRatio: 0.90,
  })
  const current = createSampleMeasurement('meas-current-02', {
    averageFrequencyHz: 1.35,
    amplitudeDecayRatio: 0.75,
  })

  const output = await interpreter.interpret(current, {
    priorMeasurements: [baseline],
  })

  assert.equal(output.schemaVersion, 'KBPD-ARCI-INTERPRET-1')
  assert.equal(output.qualificationStatus, 'UNQUALIFIED')
  assert.equal(output.decisionState, 'NORMAL_ANALYSIS')
  assert.equal(output.comparisonContext.hasPriorBaseline, true)
  assert.equal(output.comparisonContext.comparableHistoricalSessionsCount, 1)

  // Verify baseline delta calculation
  assert.ok(output.comparisonContext.baselineDelta !== undefined)
  assert.equal(output.comparisonContext.baselineDelta?.frequencyDeltaHz, -0.25)
  assert.equal(output.comparisonContext.baselineDelta?.amplitudeDecayDelta, -0.15)

  // Verify literature citations
  assert.ok(output.evidenceSupportedInterpretation.citedEvidence.length >= 1)
  assert.ok(output.evidenceSupportedInterpretation.citedEvidence.some(e => e.doi === '10.3389/fneur.2021.742654'))

  // Verify 5 sections are present
  assert.ok(output.observedMeasurements)
  assert.ok(output.comparisonContext)
  assert.ok(output.evidenceSupportedInterpretation)
  assert.ok(output.limitationsAndMissingData)
  assert.ok(output.nextSteps)

  // Verify read receipt attached
  assert.ok(output.readReceipt)
  assert.equal(output.readReceipt?.sourceSha256, ARCI_NATIVE_SOURCE_SHA256)
})

test('ARCI Boundary Case 2: Inadequate data quality halts advanced interpretation', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)

  const disturbed = createSampleMeasurement('meas-disturbed-03', {
    acceptableForKinematics: false,
    unreliabilityReasons: ['TIME_GAPS_DETECTED', 'INSUFFICIENT_VALID_FRAMES'],
    validTapCount: 2,
  })

  const output = await interpreter.interpret(disturbed)

  assert.equal(output.status, 'UNAVAILABLE')
  assert.equal(output.decisionState, 'QUALITY_HALTED')
  assert.equal(output.limitationsAndMissingData.acceptableForKinematics, false)
  assert.ok(output.limitationsAndMissingData.qualityUnreliabilityReasons.includes('TIME_GAPS_DETECTED'))
  assert.ok(output.evidenceSupportedInterpretation.summary.includes('QUALITY CRITERIA NOT MET'))
  assert.ok(output.nextSteps.recommendedActions.some(a => a.includes('Ensure the hand is fully within the webcam view')))
})

test('ARCI Boundary Case 3: No personal baseline available (initial observation)', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)

  const firstSession = createSampleMeasurement('meas-initial-04')
  const output = await interpreter.interpret(firstSession, {
    priorMeasurements: [],
  })

  assert.equal(output.decisionState, 'NO_BASELINE')
  assert.equal(output.comparisonContext.hasPriorBaseline, false)
  assert.equal(output.comparisonContext.comparableHistoricalSessionsCount, 0)
  assert.ok(output.comparisonContext.notes.some(n => n.includes('No intra-individual baseline available')))
  assert.ok(output.evidenceSupportedInterpretation.summary.includes('INITIAL BASELINE RECORDING'))
  assert.ok(output.evidenceSupportedInterpretation.citedEvidence.some(e => e.doi === '10.1038/s41746-020-00305-8'))
})

test('ARCI Boundary Case 4: Unsupported query addresses out-of-scope symptom', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)

  const session = createSampleMeasurement('meas-query-05')
  const output = await interpreter.interpret(session, {
    userQuery: '能否根據手指敲擊測量我的步態凍結 (gait freezing) 與說話聲音狀況？',
  })

  assert.equal(output.status, 'UNAVAILABLE')
  assert.equal(output.decisionState, 'UNSUPPORTED_QUERY')
  assert.ok(output.evidenceSupportedInterpretation.summary.includes('UNSUPPORTED QUERY'))
  assert.ok(output.evidenceSupportedInterpretation.summary.includes('addresses domains outside the validated scope'))
  assert.ok(output.nextSteps.recommendedActions.some(a => a.includes('Limit inquiries to quantitative finger tapping')))
})

test('ARCI Boundary Case 5: Prohibited clinical inferences (automated diagnosis, UPDRS substitution, drug titration)', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)
  const session = createSampleMeasurement('meas-safety-06')

  // 5a. Prohibited diagnosis request
  const diagOutput = await interpreter.interpret(session, {
    userQuery: '請直接告訴我這個結果是否確診帕金森氏症？',
  })
  assert.equal(diagOutput.decisionState, 'PROHIBITED_INFERENCE_REFUSED')
  assert.ok(diagOutput.evidenceSupportedInterpretation.summary.includes('REFUSED [AUTOMATED_DIAGNOSIS]'))
  assert.ok(diagOutput.nextSteps.prohibitedInferencesAcknowledged.some(p => p.includes('PROHIBITED: Automated disease diagnosis')))

  // 5b. Prohibited UPDRS substitution
  const updrsOutput = await interpreter.interpret(session, {
    userQuery: '這個數值可以替代 UPDRS Part III 分數並作為正式臨床量表嗎？',
  })
  assert.equal(updrsOutput.decisionState, 'PROHIBITED_INFERENCE_REFUSED')
  assert.ok(updrsOutput.evidenceSupportedInterpretation.summary.includes('REFUSED [UPDRS_SCORE_SUBSTITUTION]'))

  // 5c. Prohibited medication titration
  const drugOutput = await interpreter.interpret(session, {
    userQuery: '看到振幅衰減，我是不是應該加藥？請建議左旋多巴 (Levodopa) 的調整劑量。',
  })
  assert.equal(drugOutput.decisionState, 'PROHIBITED_INFERENCE_REFUSED')
  assert.ok(drugOutput.evidenceSupportedInterpretation.summary.includes('REFUSED [MEDICATION_TITRATION]'))
  assert.ok(drugOutput.limitationsAndMissingData.medicalDisclaimers.some(d => d.includes('CRITICAL NOTICE')))
  assert.ok(drugOutput.nextSteps.recommendedActions.some(a => a.includes('consultation with a neurologist')))
})
