/** KBPD-P1 engineering contracts. No record is qualified for clinical use. */
export type DataOrigin = 'SYNTHETIC' | 'DEVELOPER_CAPTURE'
export type InputModality = 'KEYBOARD' | 'POINTER' | 'SYNTHETIC' | 'MIXED' | 'UNKNOWN'
export interface MotionEvent {
  eventId: string
  relativeTimeMs: number
  side: 'left' | 'right'
  modality: InputModality
}
export interface MotionInput {
  schemaVersion: 'KBPD-MOTION-1'
  sessionId: string
  subjectId: string
  origin: DataOrigin
  clinicalUse: false
  hand: 'BOTH' | 'LEFT' | 'RIGHT'
  device: string
  modality: InputModality
  protocolVersion: string
  startedAt: string
  endedAt: string
  elapsedMs: number
  expectedDurationMs: number
  status: 'COMPLETED' | 'INTERRUPTED'
  rawEvents: MotionEvent[]
}
export interface MotionSession extends MotionInput { rawInputHash: string }

export interface MedicationEvent {
  eventId: string
  occurredAt: string
  recordedAt: string
  source: string
  eventType: 'SCHEDULED' | 'DISPENSED' | 'CUP_REMOVED' | 'SELF_REPORTED_TAKEN'
  origin: DataOrigin
}
export interface MedicationStatus {
  taken: 'UNKNOWN' | 'SELF_REPORTED'
  occurredAt: string | null
}

export type MetricName = 'validEventCount' | 'rate' | 'intervalVariability' | 'speedDecay'
export interface Observation {
  value: number | null
  unit: 'events' | 'events/s' | '%'
  formula: string
  minimumEvents: number
  reasonCode: string | null
}
export type Observations = Record<MetricName, Observation>
export interface DataQuality {
  status: 'QUALIFIED' | 'INSUFFICIENT' | 'INVALID'
  issues: string[]
  cleaningLog: string[]
  validEventIds: string[]
}
export interface MotionComputation { observations: Observations; dataQuality: DataQuality }

export interface ReferenceSet {
  subjectId: string
  origin: DataOrigin
  source: 'LOCAL_ANALYSIS_STORE'
  hand: MotionInput['hand']
  device: string
  modality: InputModality
  protocolVersion: string
  comparisonRuleVersion: string
  minimumSessions: number
  includedSessionIds: string[]
  excludedSessions: Array<{ sessionId: string; reasonCodes: string[] }>
  inputs: Array<{ sessionId: string; rawInputHash: string; observations: Observations }>
  clinicalValidation: 'NOT_CLINICALLY_VALIDATED'
}
export interface ComparisonMetric {
  currentValue: number
  referenceMean: number
  delta: number
  unit: Observation['unit']
}
export interface Comparison {
  status: 'AVAILABLE' | 'NOT_AVAILABLE'
  reasonCodes: string[]
  referenceCount: number
  metrics: Partial<Record<MetricName, ComparisonMetric>>
  interpretation: 'DESCRIPTIVE_ONLY'
}

export type EvidenceStatus = 'DISABLED' | 'UNAVAILABLE' | 'UNQUALIFIED' | 'FIXTURE_ONLY' | 'AVAILABLE'
export interface EvidenceReference {
  sourceId: string | null
  documentVersion: string | null
  locator: string | null
  licenseStatus: string | null
  retrievedAt: string | null
  applicabilityLimits: string[]
  reasonCode: string | null
}
export interface EvidenceBundle {
  status: EvidenceStatus
  reasonCode: string
  refs: EvidenceReference[]
  retrievalEnabled: boolean
}

/** Receipt of the unmodified ARCI bounded file reader. Not an ARCI policy. */
export interface ArciReadReceipt {
  schemaVersion: 'KBPD-ARCI-READ-1'
  callId: string
  calledAt: string
  role: 'BOUNDED_LOCAL_FILE_READ'
  entry: 'src/foundations/bounded-json-file.ts#readBoundedUtf8FileSync'
  sourceSha256: string
  status: 'SUCCEEDED' | 'REFUSED' | 'UNAVAILABLE'
  nativeCallCount: 1
  maximumBytes: number
  input: {
    kind: 'MOTION_INPUT' | 'ANALYSIS_RECORD'
    identifier: string
    descriptorAccess: 'O_RDONLY_NOFOLLOW' | 'O_RDWR_EXCLUSIVE_NOFOLLOW'
    nativeFilePath: string
  }
  output: { byteLength: number; sha256: string } | null
  reasonCode: 'NATIVE_READ_SUCCEEDED' | 'PERSISTENCE_FILE_LIMIT_EXCEEDED' | 'NATIVE_READER_UNAVAILABLE'
  nativeErrorCode: string | null
}
export type ArciAnalysisStatus =
  | { status: 'NOT_CONNECTED'; nativeCallCount: 0; reasonCode: string }
  | { status: 'SUCCEEDED'; nativeCallCount: 1; reasonCode: 'BOUNDED_INPUT_READ_CONSUMED'; receipt: ArciReadReceipt }

export interface AnalysisRecord {
  schemaVersion: 'KBPD-ANALYSIS-1'
  analysisId: string
  sessionId: string
  subjectId: string
  createdAt: string
  inputHash: string
  versions: { algorithm: string; policy: string; adapter: string; comparisonRule: string }
  session: MotionSession
  medicationEvents: MedicationEvent[]
  medicationStatus: MedicationStatus
  observations: Observations
  dataQuality: DataQuality
  referenceSet: ReferenceSet
  comparison: Comparison
  missingInformation: string[]
  evidenceStatus: EvidenceStatus
  evidenceRefs: EvidenceReference[]
  evidenceBundle: EvidenceBundle
  limitations: string[]
  nextStep: 'READ_RECORD' | 'ADD_INFORMATION' | 'LOCAL_REVIEW_DRAFT'
  computationMode: 'DETERMINISTIC_RULES'
  arci: ArciAnalysisStatus
  clinicalUse: false
}
