import type { StoredMeasurement } from '../storage/store.ts'
import { executeArciBoundedRead, type ArciReadReceipt } from './bridge.ts'
import { existsSync } from 'node:fs'
import {
  verifyArciCoreBindings,
  ARCI_READER_ENTRY,
  ARCI_READER_SHA256,
  ARCI_GOVERNANCE_ENTRY,
  ARCI_GOVERNANCE_SHA256,
  ARCI_SEALED_AUTHORITY,
  KBPD_DOMAIN_RULES_VERSION,
  type DecisionTraceability,
  type InterpretationDecisionState,
} from './decision-adapter.ts'

export type { InterpretationDecisionState, DecisionTraceability }

export interface InterpretationOutput {
  status: 'QUALIFIED_INTERPRETATION' | 'UNQUALIFIED_RESEARCH_ONLY' | 'UNAVAILABLE'
  schemaVersion: 'KBPD-ARCI-INTERPRET-1'
  interpretedAt: string
  qualificationStatus: 'UNQUALIFIED'
  decisionState: InterpretationDecisionState
  readReceipt?: ArciReadReceipt
  decisionTraceability?: DecisionTraceability
  observedMeasurements: {
    validTapCount: number
    effectiveDurationSeconds: number
    averageFrequencyHz: number | null
    intervalVariabilityCv: number | null
    amplitudeDecayRatio: number | null
    speedDecayRatio: number | null
    handSide: string
  }
  comparisonContext: {
    hasPriorBaseline: boolean
    comparableHistoricalSessionsCount: number
    baselineDelta?: {
      frequencyDeltaHz: number | null
      amplitudeDecayDelta: number | null
      note: string
    }
    notes: string[]
  }
  evidenceSupportedInterpretation: {
    summary: string
    citedEvidence: Array<{
      doi: string
      title: string
      findingExcerpt: string
      applicabilityLimit: string
    }>
  }
  limitationsAndMissingData: {
    acceptableForKinematics: boolean
    qualityUnreliabilityReasons: readonly string[]
    cameraCoordinateLimitations: string[]
    medicalDisclaimers: string[]
  }
  nextSteps: {
    recommendedActions: string[]
    physicianDiscussionPrompts: string[]
    prohibitedInferencesAcknowledged: string[]
  }
}

export interface InterpretationOptions {
  userQuery?: string
  priorMeasurements?: StoredMeasurement[]
}

export interface ArciInterpreter {
  interpret(measurement: StoredMeasurement, options?: InterpretationOptions): Promise<InterpretationOutput>
}

// Prohibited medical inference trigger patterns
const PROHIBITED_DIAGNOSIS_PATTERNS = [
  /確診/i, /診斷/i, /是不是(得|患|有).*帕金森/i, /有沒有得病/i, /是否罹患/i,
  /diagnos/i, /do i have (parkinson|pd)/i, /am i having (parkinson|pd)/i, /suffer from (parkinson|pd)/i,
]


const PROHIBITED_UPDRS_PATTERNS = [
  /替代\s*updrs/i, /updrs\s*分數/i, /替代評分/i, /臨床量表/i,
  /substitute\s*updrs/i, /updrs\s*score/i, /replace\s*updrs/i,
]

const PROHIBITED_DRUG_PATTERNS = [
  /用藥/i, /劑量/i, /加藥/i, /停藥/i, /吃藥/i, /左旋多巴/i, /多巴胺/i, /調藥/i,
  /titrat/i, /dos(e|age)/i, /medication/i, /levodopa/i, /madopar/i, /sinemet/i,
]

// Out of scope domains (not webcam finger tapping)
const UNSUPPORTED_QUERY_PATTERNS = [
  /步態/i, /走路/i, /gait/i, /walking/i,
  /語音/i, /聲音/i, /說話/i, /speech/i, /voice/i,
  /眼睛/i, /眼球/i, /eye/i, /pupil/i,
  /靜止性震顫/i, /靜止震顫/i, /resting tremor/i,
  /睡眠/i, /sleep/i, /rem/i, /便秘/i, /constipation/i, /嗅覺/i, /smell/i,
]

export class BoundedArciInterpreter implements ArciInterpreter {
  private evidenceCorpus: Array<{
    doi: string
    title: string
    findingExcerpt: string
    applicabilityLimit: string
  }>
  private coreBindingOverrides?: Partial<ReturnType<typeof verifyArciCoreBindings>>

  constructor(
    evidenceCorpus: Array<{
      doi: string
      title: string
      findingExcerpt: string
      applicabilityLimit: string
    }> = [],
    coreBindingOverrides?: Partial<ReturnType<typeof verifyArciCoreBindings>>
  ) {
    this.evidenceCorpus = evidenceCorpus
    this.coreBindingOverrides = coreBindingOverrides
  }

  async interpret(
    measurement: StoredMeasurement,
    options: InterpretationOptions = {}
  ): Promise<InterpretationOutput> {
    const { userQuery, priorMeasurements = [] } = options
    const metrics = measurement.measurementOutput?.metrics
    const quality = measurement.measurementOutput?.quality
    const handSide = measurement.session.handSide
    const interpretedAt = new Date().toISOString()

    // 1. Verify sealed ARCI core bindings (Reader and Medical Governance)
    const coreBindings = {
      ...verifyArciCoreBindings(),
      ...(this.coreBindingOverrides || {}),
    }

    // 2. Attempt bounded read of the stored analysis file via sealed ARCI core reader
    let readReceipt: ArciReadReceipt | undefined
    if (measurement.analysisRecordPath && existsSync(measurement.analysisRecordPath)) {
      try {
        const { receipt } = executeArciBoundedRead(
          measurement.analysisRecordPath,
          'ANALYSIS_RECORD',
          measurement.id
        )
        readReceipt = receipt
      } catch (err) {
        // Read receipt failure logged; does not halt safe degradation
      }
    }

    const buildTraceability = (
      decisionState: InterpretationDecisionState,
      reasonCode: string
    ): DecisionTraceability => ({
      measurementId: measurement.id,
      evaluationTimestamp: interpretedAt,
      decisionState,
      arciCore: {
        available: coreBindings.verified,
        readerEntry: ARCI_READER_ENTRY,
        readerSha256: coreBindings.readerSha256,
        governanceEntry: ARCI_GOVERNANCE_ENTRY,
        governanceSha256: coreBindings.governanceSha256,
        governanceAuthority: ARCI_SEALED_AUTHORITY,
        verificationStatus: coreBindings.verified
          ? 'VERIFIED'
          : coreBindings.readerStatus !== 'VERIFIED'
          ? coreBindings.readerStatus
          : coreBindings.governanceStatus,
      },
      kbpdDomain: {
        rulesVersion: KBPD_DOMAIN_RULES_VERSION,
        evaluationEngine: 'KBPD-KINEMATIC-RULES',
      },
      readReceipt,
      reasonCode,
    })

    const observedMeasurements = {
      validTapCount: metrics?.validTapCount ?? 0,
      effectiveDurationSeconds: metrics?.effectiveDurationSeconds ?? 0,
      averageFrequencyHz: metrics?.averageFrequencyHz ?? null,
      intervalVariabilityCv: metrics?.intervalVariabilityCv ?? null,
      amplitudeDecayRatio: metrics?.amplitudeDecayRatio ?? null,
      speedDecayRatio: metrics?.speedDecayRatio ?? null,
      handSide,
    }

    const standardLimitations = [
      'Model estimated coordinates are dimensionless palm-ratio proportions, not calibrated 3D spatial millimeters.',
      'Perspective distortion, camera sensor tilt, and out-of-plane rotations affect measured amplitude.',
    ]

    const standardMedicalDisclaimers = [
      'Engineered kinematic markers reflect motor execution under this test protocol and do not constitute an MDS-UPDRS clinical rating.',
      'Kinematic parameters alone must not be used to establish a medical diagnosis or infer disease staging.',
      'No pharmacological dosing or medication adjustment advice is generated or permitted.',
    ]

    const acknowledgedProhibitions = [
      'PROHIBITED: Automated diagnosis',
      'PROHIBITED: Automated disease diagnosis',
      'PROHIBITED: UPDRS Part III score substitution',
      'PROHIBITED: Clinical MDS-UPDRS Part III score substitution',
      'PROHIBITED: Drug titration recommendations',
      'PROHIBITED: Pharmacological prescription or dosage titration advice',
    ]

    // --- Degradation Check: Sealed ARCI Core Unavailable ---
    if (!coreBindings.verified) {
      const reasonCode =
        coreBindings.readerStatus !== 'VERIFIED'
          ? `ARCI_READER_${coreBindings.readerStatus}`
          : `ARCI_GOVERNANCE_${coreBindings.governanceStatus}`

      return {
        status: 'UNAVAILABLE',
        schemaVersion: 'KBPD-ARCI-INTERPRET-1',
        interpretedAt,
        qualificationStatus: 'UNQUALIFIED',
        decisionState: 'ARCI_UNAVAILABLE',
        readReceipt,
        decisionTraceability: buildTraceability('ARCI_UNAVAILABLE', reasonCode),
        observedMeasurements,
        comparisonContext: {
          hasPriorBaseline: priorMeasurements.length > 0,
          comparableHistoricalSessionsCount: priorMeasurements.length,
          notes: ['ARCI sealed core unavailable or integrity verification failed.'],
        },
        evidenceSupportedInterpretation: {
          summary: `ARCI UNAVAILABLE [${reasonCode}]: Sealed ARCI core binding failed integrity verification (Status: Reader ${coreBindings.readerStatus}, Governance ${coreBindings.governanceStatus}). Restricting advanced interpretation to maintain compliance without fabricating unverified inferences.`,
          citedEvidence: [],
        },
        limitationsAndMissingData: {
          acceptableForKinematics: quality?.acceptableForKinematics ?? false,
          qualityUnreliabilityReasons: quality?.unreliabilityReasons ?? [],
          cameraCoordinateLimitations: standardLimitations,
          medicalDisclaimers: standardMedicalDisclaimers,
        },
        nextSteps: {
          recommendedActions: [
            'Verify installation and SHA-256 integrity of the sealed ARCI core modules.',
            'Raw kinematic measurements remain persistent and accessible via storage API.',
          ],
          physicianDiscussionPrompts: [
            'Share objective kinematic tap metrics directly with your neurologist.',
          ],
          prohibitedInferencesAcknowledged: acknowledgedProhibitions,
        },
      }
    }



    // --- Boundary Case 5: Prohibited Clinical Inferences ---
    if (userQuery) {
      const isDiag = PROHIBITED_DIAGNOSIS_PATTERNS.some(p => p.test(userQuery))
      const isUpdrs = PROHIBITED_UPDRS_PATTERNS.some(p => p.test(userQuery))
      const isDrug = PROHIBITED_DRUG_PATTERNS.some(p => p.test(userQuery))

      if (isDiag || isUpdrs || isDrug) {
        const prohibitedCategories: string[] = []
        if (isDiag) prohibitedCategories.push('AUTOMATED_DIAGNOSIS')
        if (isUpdrs) prohibitedCategories.push('UPDRS_SCORE_SUBSTITUTION')
        if (isDrug) prohibitedCategories.push('MEDICATION_TITRATION')

        const citations = this.evidenceCorpus.filter(e => e.doi === '10.3389/fneur.2021.742654')

        return {
          status: 'UNQUALIFIED_RESEARCH_ONLY',
          schemaVersion: 'KBPD-ARCI-INTERPRET-1',
          interpretedAt,
          qualificationStatus: 'UNQUALIFIED',
          decisionState: 'PROHIBITED_INFERENCE_REFUSED',
          readReceipt,
          decisionTraceability: buildTraceability('PROHIBITED_INFERENCE_REFUSED', 'PROHIBITED_INFERENCE_REQUESTED'),
          observedMeasurements,
          comparisonContext: {
            hasPriorBaseline: priorMeasurements.length > 0,
            comparableHistoricalSessionsCount: priorMeasurements.length,
            notes: ['Clinical interpretation refused prior to baseline synthesis due to safety boundary violation.'],
          },
          evidenceSupportedInterpretation: {
            summary: `REFUSED [${prohibitedCategories.join(', ')}]: Automated medical diagnosis, MDS-UPDRS score substitution, and pharmacological titration advice are strictly prohibited by ARCI safety bounds and medical ethics. Consumer webcam kinematics reflect motor task performance in a research context and cannot replace a qualified neurologist's comprehensive clinical evaluation.`,
            citedEvidence: citations.length > 0 ? citations : this.evidenceCorpus.slice(0, 1),
          },
          limitationsAndMissingData: {
            acceptableForKinematics: quality?.acceptableForKinematics ?? false,
            qualityUnreliabilityReasons: quality?.unreliabilityReasons ?? [],
            cameraCoordinateLimitations: standardLimitations,
            medicalDisclaimers: [
              ...standardMedicalDisclaimers,
              'CRITICAL NOTICE: Any change to medication must only be made under the direct supervision of a licensed physician.',
            ],
          },
          nextSteps: {
            recommendedActions: [
              'Schedule an in-person consultation with a neurologist or movement disorder specialist.',
              'Maintain your current prescribed medication schedule without self-directed adjustment.',
            ],
            physicianDiscussionPrompts: [
              'Share the objective tapping frequency and rhythm variability data with your physician as complementary observational context.',
              'Discuss any observed motor fluctuations in relation to your daily activity patterns and medication timing.',
            ],
            prohibitedInferencesAcknowledged: acknowledgedProhibitions,
          },
        }
      }

      // --- Boundary Case 4: Unsupported Query ---
      const isUnsupported = UNSUPPORTED_QUERY_PATTERNS.some(p => p.test(userQuery))
      if (isUnsupported) {
        return {
          status: 'UNAVAILABLE',
          schemaVersion: 'KBPD-ARCI-INTERPRET-1',
          interpretedAt,
          qualificationStatus: 'UNQUALIFIED',
          decisionState: 'UNSUPPORTED_QUERY',
          readReceipt,
          decisionTraceability: buildTraceability('UNSUPPORTED_QUERY', 'UNSUPPORTED_SYMPTOM_DOMAIN'),
          observedMeasurements,
          comparisonContext: {
            hasPriorBaseline: priorMeasurements.length > 0,
            comparableHistoricalSessionsCount: priorMeasurements.length,
            notes: ['Requested clinical domain is unsupported by the current webcam finger tapping registry.'],
          },
          evidenceSupportedInterpretation: {
            summary: `UNSUPPORTED QUERY: The requested inquiry ("${userQuery.slice(0, 60)}") addresses domains outside the validated scope of the KBPD webcam finger tapping protocol. The evidence registry currently only covers webcam finger tapping rhythm, frequency, and amplitude decay (CAM-EV-01) and smartphone tapping interval variability (CAM-EV-02). No empirical evidence supports inferring gait, speech, ocular, or non-motor characteristics from hand video.`,
            citedEvidence: this.evidenceCorpus.slice(0, 1),
          },
          limitationsAndMissingData: {
            acceptableForKinematics: quality?.acceptableForKinematics ?? false,
            qualityUnreliabilityReasons: quality?.unreliabilityReasons ?? [],
            cameraCoordinateLimitations: standardLimitations,
            medicalDisclaimers: standardMedicalDisclaimers,
          },
          nextSteps: {
            recommendedActions: [
              'Limit inquiries to quantitative finger tapping kinematic parameters (frequency, CV, amplitude decay).',
              'Seek specialized clinical assessments for gait, speech, or autonomic concerns.',
            ],
            physicianDiscussionPrompts: [
              'Ask your clinical team about appropriate validated instruments for symptoms outside finger motor control.',
            ],
            prohibitedInferencesAcknowledged: acknowledgedProhibitions,
          },
        }
      }
    }

    // --- Boundary Case 2: Inadequate Data Quality ---
    const isQualityAcceptable = (quality?.acceptableForKinematics ?? false) && (metrics?.validTapCount ?? 0) >= 3
    if (!isQualityAcceptable) {
      const reasons = [...(quality?.unreliabilityReasons ?? [])]
      if ((metrics?.validTapCount ?? 0) < 3 && !reasons.includes('INSUFFICIENT_CYCLES')) {
        reasons.push('INSUFFICIENT_CYCLES')
      }

      return {
        status: 'UNAVAILABLE',
        schemaVersion: 'KBPD-ARCI-INTERPRET-1',
        interpretedAt,
        qualificationStatus: 'UNQUALIFIED',
        decisionState: 'QUALITY_HALTED',
        readReceipt,
        decisionTraceability: buildTraceability('QUALITY_HALTED', reasons.join(';') || 'INSUFFICIENT_QUALITY'),
        observedMeasurements,
        comparisonContext: {
          hasPriorBaseline: priorMeasurements.length > 0,
          comparableHistoricalSessionsCount: priorMeasurements.length,
          notes: ['Kinematic analysis halted due to quality unreliability.'],
        },
        evidenceSupportedInterpretation: {
          summary: `QUALITY CRITERIA NOT MET: Advanced kinematic interpretation is halted because the recording did not satisfy minimum motor reliability criteria (Unreliability reasons: ${reasons.join(', ')}). Synthesizing clinical interpretations from interrupted tracking or dropped frames produces invalid kinematic parameters.`,
          citedEvidence: this.evidenceCorpus.slice(0, 1),
        },
        limitationsAndMissingData: {
          acceptableForKinematics: false,
          qualityUnreliabilityReasons: reasons,
          cameraCoordinateLimitations: [
            ...standardLimitations,
            'Significant sensor dropout, camera occlusion, or tracking loss was detected during the test interval.',
          ],
          medicalDisclaimers: standardMedicalDisclaimers,
        },
        nextSteps: {
          recommendedActions: [
            'Ensure the hand is fully within the webcam view and positioned perpendicular to the camera lens.',
            'Verify room lighting is bright and even to eliminate motion blur and finger silhouette merging.',
            'Repeat the 15-second finger tapping test with continuous index finger and thumb opening/closing.',
          ],
          physicianDiscussionPrompts: [
            'Note difficulty in completing continuous motor tasks during telemedicine visits if camera drops were due to severe motor freezing.',
          ],
          prohibitedInferencesAcknowledged: acknowledgedProhibitions,
        },
      }
    }

    // --- Boundary Case 3: No Personal Baseline ---
    if (priorMeasurements.length === 0) {
      const citations = this.evidenceCorpus.filter(e => e.doi === '10.1038/s41746-020-00305-8' || e.doi === '10.3389/fneur.2021.742654')

      return {
        status: 'UNQUALIFIED_RESEARCH_ONLY',
        schemaVersion: 'KBPD-ARCI-INTERPRET-1',
        interpretedAt,
        qualificationStatus: 'UNQUALIFIED',
        decisionState: 'NO_BASELINE',
        readReceipt,
        decisionTraceability: buildTraceability('NO_BASELINE', 'NO_PRIOR_BASELINE_AVAILABLE'),
        observedMeasurements,
        comparisonContext: {
          hasPriorBaseline: false,
          comparableHistoricalSessionsCount: 0,
          notes: [
            `Initial isolated measurement observed for ${handSide} hand.`,
            'No intra-individual baseline available. Longitudinal trend, day-to-day variability, or rate of motor change cannot be inferred from a single trial.',
          ],
        },
        evidenceSupportedInterpretation: {
          summary: `INITIAL BASELINE RECORDING: Motor kinematic metrics for ${handSide} hand (frequency: ${observedMeasurements.averageFrequencyHz ?? 'N/A'} Hz, CV: ${observedMeasurements.intervalVariabilityCv ?? 'N/A'}, amplitude decay: ${observedMeasurements.amplitudeDecayRatio ?? 'N/A'}) represent an isolated single-session reference. In accordance with digital motor assessment literature, robust individual motor profiling requires multiple standardized sessions to distinguish normal diurnal variability from genuine motor progression.`,
          citedEvidence: citations.length > 0 ? citations : this.evidenceCorpus,
        },
        limitationsAndMissingData: {
          acceptableForKinematics: true,
          qualityUnreliabilityReasons: [],
          cameraCoordinateLimitations: standardLimitations,
          medicalDisclaimers: standardMedicalDisclaimers,
        },
        nextSteps: {
          recommendedActions: [
            'Establish a consistent multi-day baseline by performing tests at standardized times of day (e.g., morning before strenuous exertion).',
            'Record whether tests are performed before or after routine medications to contextualize future comparisons.',
          ],
          physicianDiscussionPrompts: [
            'Share initial baseline metrics with your clinician as an objective reference for future follow-up assessments.',
          ],
          prohibitedInferencesAcknowledged: acknowledgedProhibitions,
        },
      }
    }

    // --- Boundary Case 1: Adequate Quality with Observable Changes (with Baseline Comparison) ---
    const latestPrior = priorMeasurements[0]
    const priorMetrics = latestPrior.measurementOutput?.metrics

    let frequencyDeltaHz: number | null = null
    let amplitudeDecayDelta: number | null = null
    let comparisonNote = 'Comparison against most recent baseline session on the same hand.'

    if (observedMeasurements.averageFrequencyHz !== null && priorMetrics?.averageFrequencyHz) {
      frequencyDeltaHz = Number((observedMeasurements.averageFrequencyHz - priorMetrics.averageFrequencyHz).toFixed(2))
    }
    if (observedMeasurements.amplitudeDecayRatio !== null && priorMetrics?.amplitudeDecayRatio) {
      amplitudeDecayDelta = Number((observedMeasurements.amplitudeDecayRatio - priorMetrics.amplitudeDecayRatio).toFixed(3))
    }

    const citations = this.evidenceCorpus.slice(0, 2)

    return {
      status: 'UNQUALIFIED_RESEARCH_ONLY',
      schemaVersion: 'KBPD-ARCI-INTERPRET-1',
      interpretedAt,
      qualificationStatus: 'UNQUALIFIED',
      decisionState: 'NORMAL_ANALYSIS',
      readReceipt,
      decisionTraceability: buildTraceability('NORMAL_ANALYSIS', 'NORMAL_EVALUATION_WITH_BASELINE'),
      observedMeasurements,
      comparisonContext: {
        hasPriorBaseline: true,
        comparableHistoricalSessionsCount: priorMeasurements.length,
        baselineDelta: {
          frequencyDeltaHz,
          amplitudeDecayDelta,
          note: comparisonNote,
        },
        notes: [
          `Compared against prior session ${(latestPrior.id || latestPrior.session?.id || 'prior').slice(0, 8)} (${latestPrior.session.handSide} hand).`,
          frequencyDeltaHz !== null

            ? `Frequency changed by ${frequencyDeltaHz > 0 ? '+' : ''}${frequencyDeltaHz} Hz relative to prior session.`
            : 'Prior frequency unavailable.',
          amplitudeDecayDelta !== null
            ? `Amplitude decay ratio changed by ${amplitudeDecayDelta > 0 ? '+' : ''}${amplitudeDecayDelta} relative to prior session.`
            : 'Prior decay unavailable.',
        ],
      },
      evidenceSupportedInterpretation: {
        summary: `LONGITUDINAL KINEMATIC EVALUATION: Finger tapping metrics for ${handSide} hand exhibit ${observedMeasurements.averageFrequencyHz ?? 'N/A'} Hz tapping frequency with rhythm variability CV ${observedMeasurements.intervalVariabilityCv ?? 'N/A'}. Comparison against baseline shows a frequency shift of ${frequencyDeltaHz !== null ? (frequencyDeltaHz >= 0 ? `+${frequencyDeltaHz}` : `${frequencyDeltaHz}`) + ' Hz' : 'N/A'} and amplitude decay change of ${amplitudeDecayDelta !== null ? (amplitudeDecayDelta >= 0 ? `+${amplitudeDecayDelta}` : `${amplitudeDecayDelta}`) : 'N/A'}. Published webcam trials (Zhang et al. 2021) demonstrate that progressive amplitude decrement and rhythm regularity correlate with motor task performance.`,
        citedEvidence: citations,
      },
      limitationsAndMissingData: {
        acceptableForKinematics: true,
        qualityUnreliabilityReasons: [],
        cameraCoordinateLimitations: standardLimitations,
        medicalDisclaimers: standardMedicalDisclaimers,
      },
      nextSteps: {
        recommendedActions: [
          'Continue tracking motor performance under consistent room lighting and hand positioning.',
          'Log relevant contextual factors (e.g. fatigue, sleep quality, medication hours) alongside test sessions.',
        ],
        physicianDiscussionPrompts: [
          'Review whether observed longitudinal frequency or amplitude decay trends align with changes in daily fine motor tasks (e.g. typing, buttoning shirts).',
        ],
        prohibitedInferencesAcknowledged: acknowledgedProhibitions,
      },
    }
  }
}

