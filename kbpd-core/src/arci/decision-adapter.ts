/**
 * ARCI Decision Adapter
 *
 * Explicit Responsibility Split:
 * 1. Archived ARCI Core Responsibilities:
 *    - Bounded file read with source integrity verification (src/foundations/bounded-json-file.ts)
 *    - Sealed medical governance authority policy (src/medical/governance/llm.ts -> MEDICAL_LLM_AUTHORITY)
 *      Enforcing: canFinalizeClinicalDecision: false, canDiagnose: false, canPrescribe: false.
 * 2. KBPD Domain Kinematic Decision Responsibilities:
 *    - Kinematic quality criteria evaluation (minimum cycles, time gap / tracking loss cutoff)
 *    - Intra-individual baseline comparisons (frequency change delta Hz, amplitude decay delta)
 *    - Safety boundary violation interception (prohibited clinical diagnosis/drug adjustment requests)
 *    - Domain registry scope check (unsupported non-hand symptoms)
 *
 * Guarantees:
 * - Full traceability: Every output traces to measurementId, sealed ARCI entries, hashes, versions, authority, and reason codes.
 * - Truthful degradation: If ARCI sealed core is unavailable or corrupted, status is UNAVAILABLE with real reason code.
 * - Separation: Analysis record storage is completely independent of ARCI decision availability.
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { readBoundedUtf8FileSync, executeArciBoundedRead, type ArciReadReceipt } from './bridge.ts'
import type { StoredMeasurement } from '../storage/store.ts'

export const ARCI_READER_ENTRY =
  '/Users/Yuz1ove/.codex/visualizations/2026/09/14/01a0a0d1-db36-7410-8ba0-06de39069ed4/ARCI-U01-FINAL-REPAIR-FULL-ACCEPTANCE-AND-USABLE-DELIVERY-01/candidate/src/foundations/bounded-json-file.ts'
export const ARCI_READER_SHA256 = '73284a3d46525e39d5583e1ceadce6e7ee6cdb209ca741d71770f4ed5eabfbf2'

export const ARCI_GOVERNANCE_ENTRY =
  '/Users/Yuz1ove/.codex/visualizations/2026/09/14/01a0a0d1-db36-7410-8ba0-06de39069ed4/ARCI-U01-FINAL-REPAIR-FULL-ACCEPTANCE-AND-USABLE-DELIVERY-01/candidate/src/medical/governance/llm.ts'
export const ARCI_GOVERNANCE_SHA256 = 'c9140a84b89703c915362e3e9fb437723e8001fec4ac83c9b11d28d0a0b23d43'

export const ARCI_SEALED_AUTHORITY = Object.freeze({
  canSummarize: true,
  canExtract: true,
  canGenerateCandidates: true,
  canOverrideContraindications: false,
  canInventSources: false,
  canFinalizeClinicalDecision: false,
  canDiagnose: false,
  canPrescribe: false,
} as const)

export const KBPD_DOMAIN_RULES_VERSION = 'KBPD-DOMAIN-EVAL-V1.0.0'

export type InterpretationDecisionState =
  | 'NORMAL_ANALYSIS'
  | 'QUALITY_HALTED'
  | 'NO_BASELINE'
  | 'UNSUPPORTED_QUERY'
  | 'PROHIBITED_INFERENCE_REFUSED'
  | 'ARCI_UNAVAILABLE'

export interface DecisionTraceability {
  readonly measurementId: string
  readonly evaluationTimestamp: string
  readonly decisionState: InterpretationDecisionState
  readonly arciCore: {
    readonly available: boolean
    readonly readerEntry: string
    readonly readerSha256: string
    readonly governanceEntry: string
    readonly governanceSha256: string
    readonly governanceAuthority: typeof ARCI_SEALED_AUTHORITY
    readonly verificationStatus: 'VERIFIED' | 'DIGEST_MISMATCH' | 'FILE_MISSING'
  }
  readonly kbpdDomain: {
    readonly rulesVersion: string
    readonly evaluationEngine: 'KBPD-KINEMATIC-RULES'
  }
  readonly readReceipt?: ArciReadReceipt
  readonly reasonCode: string
}

export function verifyArciCoreBindings(): {
  verified: boolean
  readerStatus: 'VERIFIED' | 'DIGEST_MISMATCH' | 'FILE_MISSING'
  governanceStatus: 'VERIFIED' | 'DIGEST_MISMATCH' | 'FILE_MISSING'
  readerSha256: string
  governanceSha256: string
} {
  let readerStatus: 'VERIFIED' | 'DIGEST_MISMATCH' | 'FILE_MISSING' = 'FILE_MISSING'
  let readerSha256 = ''
  if (existsSync(ARCI_READER_ENTRY)) {
    try {
      const content = readBoundedUtf8FileSync(ARCI_READER_ENTRY)
      readerSha256 = createHash('sha256').update(content).digest('hex')
      readerStatus = readerSha256 === ARCI_READER_SHA256 ? 'VERIFIED' : 'DIGEST_MISMATCH'
    } catch {
      readerStatus = 'FILE_MISSING'
    }
  }

  let governanceStatus: 'VERIFIED' | 'DIGEST_MISMATCH' | 'FILE_MISSING' = 'FILE_MISSING'
  let governanceSha256 = ''
  if (existsSync(ARCI_GOVERNANCE_ENTRY)) {
    try {
      const content = readFileSync(ARCI_GOVERNANCE_ENTRY, 'utf8')
      governanceSha256 = createHash('sha256').update(content).digest('hex')
      governanceStatus = governanceSha256 === ARCI_GOVERNANCE_SHA256 ? 'VERIFIED' : 'DIGEST_MISMATCH'
    } catch {
      governanceStatus = 'FILE_MISSING'
    }
  }

  const verified = readerStatus === 'VERIFIED' && governanceStatus === 'VERIFIED'
  return {
    verified,
    readerStatus,
    governanceStatus,
    readerSha256,
    governanceSha256,
  }
}
