import type { AnalysisRecord, MotionInput } from '../kbpd/contracts'
export const WORKSPACE_VERSION = 'KBPD-WORKSPACE-1.0.0'
export type Dataset = 'DEMO' | 'CAPTURE'
export interface CaseRecord { id: string; dataset: Dataset; createdAt: string }
export interface ContextRecord {
  schemaVersion: 'KBPD-CONTEXT-1'; id: string; subjectId: string; dataset: Dataset;
  revision: number; previousId: string | null; createdAt: string; recorder: string;
  source: 'SELF' | 'CAREGIVER' | 'DEVELOPER'; fatigue: 'UNKNOWN' | 'YES' | 'NO' | 'NA';
  interruption: 'UNKNOWN' | 'YES' | 'NO' | 'NA'; medicationAt: string | null; note: string;
  professionalVerification: 'NOT_VERIFIED'
}
export interface WorkspaceRun {
  schemaVersion: 'KBPD-WORKSPACE-RUN-1'; id: string; subjectId: string; dataset: Dataset;
  createdAt: string; analysis: AnalysisRecord; context: ContextRecord | null;
  previousRunId: string | null; acquisition: 'DEMO' | 'CAPTURE' | 'IMPORT';
  core: { revision: string; digest: string; entrySha256: string; role: 'BOUNDED_LOCAL_FILE_READ' };
  review: { status: 'NOT_REVIEWED' }; evidenceUsed: [];
}
export interface SourceInfo { id: string; title: string; year: number; version: string; url: string; license: string; sha256: string; rawVerified: boolean; parsed: 'UNKNOWN'; stored: 'NOT_CONNECTED'; searchable: false; cited: false }
export interface OperationEvent { id: string; operationId: string; subjectId: string; dataset: Dataset; createdAt: string; source: 'KBPD_APPLICATION'; state: 'STARTED' | 'SUCCEEDED' | 'LIMITED' | 'FAILED'; runId: string | null; reason: string | null }
export interface WorkspaceSnapshot {
  version: string; updatedAt: string; cases: CaseRecord[]; contexts: ContextRecord[]; runs: WorkspaceRun[];
  operations: OperationEvent[]; sources: SourceInfo[]; sourceAuditAt: string | null;
  service: { coreRevision: string; coreDigest: string; coreEntryVerified: boolean; medical: 'UNQUALIFIED'; modelDispatches: number; mode: 'LOCAL_SINGLE_USER'; build: string }
}
export interface SaveInput { session: MotionInput; acquisition: WorkspaceRun['acquisition']; contextId: string | null; previousRunId: string | null }
export const labels = { validEventCount: '有效敲擊', rate: '敲擊速率', intervalVariability: '間隔變異 CV', speedDecay: '前後段間隔差' }
export const units = { events: '次', 'events/s': '次／秒', '%': '%' }
export const qualityLabels = { QUALIFIED: '工程品質可用', INSUFFICIENT: '資料不足', INVALID: '品質未通過' }
export const navigation = ['個案總覽', '開始量測', '量表與評估', '判讀工作台', '歷史與報告', '管理後台']
