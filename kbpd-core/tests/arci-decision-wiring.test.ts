import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { BoundedArciInterpreter } from '../src/arci/interpreter.ts'
import { verifyArciCoreBindings } from '../src/arci/decision-adapter.ts'
import type { StoredMeasurement } from '../src/storage/store.ts'

const evidencePath = resolve(process.cwd(), 'evidence/evidence-registry.json')
const rawEvidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
const evidenceList = (rawEvidence.documents || []).map((doc: any) => ({
  doi: doc.doi,
  title: doc.title,
  findingExcerpt: doc.evidenceExcerpt || doc.findings,
  applicabilityLimit: doc.applicabilityLimit || doc.limitations,
}))

function createDummyMeasurement(id: string, overrides: Partial<StoredMeasurement['measurementOutput']['metrics']> = {}): StoredMeasurement {
  return {
    id,
    session: {
      userId: 'user-wiring-test',
      protocolVersion: 'KBPD-FT-1.0',
      handSide: 'RIGHT',
      createdAt: new Date().toISOString(),
      mirrored: false,
    },
    measurementOutput: {
      schemaVersion: 'KBPD-MEASUREMENT-OUT-1',
      sessionId: id,
      calculatedAt: new Date().toISOString(),
      algorithmVersion: 'KBPD-DETECTOR-V1.0.0',
      handSide: 'RIGHT',
      quality: {
        qualityVersion: 'KBPD-QUALITY-V1.0.0',
        totalFrames: 150,
        validFrames: 145,
        validFrameRatio: 0.967,
        trackingLossIntervals: [],
        largeGapDetected: false,
        sideConfidence: 1.0,
        acceptableForKinematics: true,
        unreliabilityReasons: [],
      },
      metrics: {
        validTapCount: 6,
        effectiveDurationSeconds: 6.0,
        averageFrequencyHz: 1.45,
        intervalSequenceMs: [700, 680, 720, 750, 790, 810],
        intervalVariabilityCv: 0.065,
        amplitudeSequenceNorm: [0.82, 0.79, 0.75, 0.72, 0.70, 0.67],
        averageAmplitudeNorm: 0.742,
        amplitudeDecayRatio: 0.817,
        speedDecayRatio: 0.78,
        calculationNotes: [],
        ...overrides,
      },
      limitations: [],
    },
    analysisRecordPath: evidencePath,
  }
}

test('ARCI Decision Wiring: Injected reader mismatch triggers UNAVAILABLE and does not report fake success', async t => {
  // Inject simulated failure: reader digest mismatch
  const interpreter = new BoundedArciInterpreter(evidenceList, {
    verified: false,
    readerStatus: 'DIGEST_MISMATCH',
    governanceStatus: 'VERIFIED',
    readerSha256: 'deadbeef00000000000000000000000000000000000000000000000000000000',
  })

  const measurement = createDummyMeasurement('m-fail-01')
  const output = await interpreter.interpret(measurement)

  // Must report UNAVAILABLE and real reason, NOT false success!
  assert.equal(output.status, 'UNAVAILABLE')
  assert.equal(output.decisionState, 'ARCI_UNAVAILABLE')
  assert.ok(output.decisionTraceability)
  assert.equal(output.decisionTraceability.arciCore.available, false)
  assert.equal(output.decisionTraceability.arciCore.verificationStatus, 'DIGEST_MISMATCH')
  assert.equal(output.decisionTraceability.reasonCode, 'ARCI_READER_DIGEST_MISMATCH')
  assert.ok(output.evidenceSupportedInterpretation.summary.includes('ARCI UNAVAILABLE [ARCI_READER_DIGEST_MISMATCH]'))
  // Observed measurements must remain intact for user inspection
  assert.equal(output.observedMeasurements.validTapCount, 6)
  assert.equal(output.observedMeasurements.averageFrequencyHz, 1.45)
})

test('ARCI Decision Wiring: Injected governance policy missing triggers UNAVAILABLE', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList, {
    verified: false,
    readerStatus: 'VERIFIED',
    governanceStatus: 'FILE_MISSING',
    governanceSha256: '',
  })

  const measurement = createDummyMeasurement('m-fail-02')
  const output = await interpreter.interpret(measurement)

  assert.equal(output.status, 'UNAVAILABLE')
  assert.equal(output.decisionState, 'ARCI_UNAVAILABLE')
  assert.equal(output.decisionTraceability?.reasonCode, 'ARCI_GOVERNANCE_FILE_MISSING')
})

test('ARCI Decision Traceability: Full audit trail traces measurement ID, core entries, hashes and governance', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)
  const measurement = createDummyMeasurement('m-trace-01')

  const output = await interpreter.interpret(measurement)

  assert.ok(output.decisionTraceability)
  assert.equal(output.decisionTraceability.measurementId, 'm-trace-01')
  assert.equal(output.decisionTraceability.decisionState, 'NO_BASELINE')
  assert.equal(output.decisionTraceability.arciCore.available, true)
  assert.equal(output.decisionTraceability.arciCore.verificationStatus, 'VERIFIED')
  assert.equal(output.decisionTraceability.arciCore.governanceAuthority.canDiagnose, false)
  assert.equal(output.decisionTraceability.arciCore.governanceAuthority.canPrescribe, false)
  assert.equal(output.decisionTraceability.arciCore.governanceAuthority.canFinalizeClinicalDecision, false)
  assert.equal(output.decisionTraceability.kbpdDomain.rulesVersion, 'KBPD-DOMAIN-EVAL-V1.0.0')
  assert.ok(output.decisionTraceability.evaluationTimestamp.length > 0)
})

test('ARCI Decision Response Divergence: Outputs vary strictly with different inputs', async t => {
  const interpreter = new BoundedArciInterpreter(evidenceList)

  // 1. Initial measurement (No baseline)
  const mInitial = createDummyMeasurement('m-div-01')
  const outInitial = await interpreter.interpret(mInitial)
  assert.equal(outInitial.decisionState, 'NO_BASELINE')

  // 2. Second measurement with prior baseline (Normal analysis with delta)
  const mSecond = createDummyMeasurement('m-div-02', { averageFrequencyHz: 1.80, amplitudeDecayRatio: 0.750 })
  const outSecond = await interpreter.interpret(mSecond, { priorMeasurements: [mInitial] })
  assert.equal(outSecond.decisionState, 'NORMAL_ANALYSIS')
  assert.notEqual(outInitial.comparisonContext.hasPriorBaseline, outSecond.comparisonContext.hasPriorBaseline)
  assert.equal(outSecond.comparisonContext.baselineDelta?.frequencyDeltaHz, 0.35)

  // 3. Prohibited query (safety boundary)
  const outProhibited = await interpreter.interpret(mSecond, { userQuery: '請幫我確診是不是帕金森，並且調整左旋多巴劑量' })
  assert.equal(outProhibited.decisionState, 'PROHIBITED_INFERENCE_REFUSED')
  assert.ok(outProhibited.evidenceSupportedInterpretation.summary.includes('REFUSED'))

  // 4. Unsupported query (domain boundary)
  const outUnsupported = await interpreter.interpret(mSecond, { userQuery: '這段影片能分析步態和睡眠障礙嗎？' })
  assert.equal(outUnsupported.decisionState, 'UNSUPPORTED_QUERY')

  // All 4 outputs have distinct summaries and decision states!
  const states = [outInitial.decisionState, outSecond.decisionState, outProhibited.decisionState, outUnsupported.decisionState]
  assert.equal(new Set(states).size, 4, 'All 4 boundary cases must have unique decision states')
})
