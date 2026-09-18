/** P2 transport contract. Qualification is decided by the native server policy. */
export type EvidenceTopic = 'A' | 'B' | 'C'
export type EvidenceLookupStatus = 'FOUND' | 'INSUFFICIENT_EVIDENCE' | 'OUT_OF_SCOPE'
  | 'SOURCE_DISABLED' | 'SERVICE_UNAVAILABLE' | 'UNQUALIFIED'

export interface EvidenceLookupInput {
  analysisId: string
  topic: EvidenceTopic
  query: string
}

export interface EvidenceCard {
  evidenceId: string
  chunkId: string
  documentId: string
  sourceId: string
  title: string
  authors: string[]
  year: number | null
  documentType: string
  sourceUrl: string
  excerpt: string
  locator: { type: string; value: string; url: string | null }
  matchedTerms: string[]
  population: string
  method: string
  limitations: string[]
  /** Name the editorial/translation process; never imply clinical review. */
  summaryLabel: string
  sourceVersion: string
  license: { name: string; url: string | null; copyright?: string }
  rawSha256: string
  contentSha256: string
  sourceStatus: 'ACTIVE' | 'DISABLED' | 'RETRACTED' | 'UNKNOWN'
}

export interface EvidenceLookupRecord extends EvidenceLookupInput {
  schemaVersion: 'KBPD-EVIDENCE-LOOKUP-1' | 'KBPD-EVIDENCE-LOOKUP-2'
  lookupId: string
  createdAt: string
  normalizedQuery: string
  status: EvidenceLookupStatus
  reasonCodes: string[]
  semanticAdmission?: {
    state: 'SUPPORTED_EVIDENCE' | 'INSUFFICIENT_EVIDENCE' | 'CONTRADICTORY_EVIDENCE' | 'UNSUPPORTED_QUERY' | 'HIGH_RISK_REFUSAL'
    judgmentHash: string
    originalQuery: string
    conditions: string[]
    queryMedicationState?: 'ON'|'OFF'|'UNKNOWN'|'BOTH'|null
    queryCondition?: string
    evidenceConditions?: Array<{chunkId:string;sourceMedicationState:'ON'|'OFF'|'UNKNOWN'|'BOTH'|'NOT_REPORTED'|'NOT_APPLICABLE'|null;sourceCondition?:string;queryCondition?:string;compatibility:string;admitted:boolean}>
  }
  missingInformation: string[]
  cards: EvidenceCard[]
  versions: { corpus: string; retriever: string; policy: string; glossary: string | null }
  qualification: {
    status: 'QUALIFIED' | 'UNQUALIFIED' | 'INVALIDATED'
    reference: string | null
    snapshot?: Record<string, unknown>
  }
  trace: {
    entrypoint: string | null
    governanceDecision: string
    nativeExecutionStatus: string
    applicationCorrelationId: string
    nativeRequestId: string | null
    nativeResultId: string | null
  }
  clinicalUse: false
  generativeAnswers: false
}

export const EVIDENCE_QUERY_MAX_LENGTH = 280
