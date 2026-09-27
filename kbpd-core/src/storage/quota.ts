export interface StorageQuotaConfig {
  readonly maxFileSizeBytes: number
  readonly maxVideoDurationSeconds: number
  readonly maxStoragePerUserBytes: number
  readonly maxFramesPerSession: number
  readonly maxUserVectors: number
  readonly maxConcurrentAnalyses: number
  readonly tempTaskTtlMs: number
}

export const DEFAULT_QUOTA_CONFIG: StorageQuotaConfig = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB per file
  maxVideoDurationSeconds: 30, // 30 seconds
  maxStoragePerUserBytes: 50 * 1024 * 1024, // 50 MB total per user
  maxFramesPerSession: 900, // 30 fps * 30 seconds
  maxUserVectors: 1000,
  maxConcurrentAnalyses: 2,
  tempTaskTtlMs: 60 * 60 * 1000, // 1 hour TTL
}

export interface UserStorageUsage {
  readonly userId: string
  readonly usedBytes: number
  readonly quotaBytes: number
  readonly fileCount: number
  readonly sessionCount: number
  readonly vectorCount: number
  readonly remainingBytes: number
}

export class QuotaExceededError extends Error {
  readonly code = 'QUOTA_EXCEEDED'
  readonly requestedBytes: number
  readonly currentUsedBytes: number
  readonly limitBytes: number

  constructor(message: string, requestedBytes: number, currentUsedBytes: number, limitBytes: number) {
    super(message)
    this.name = 'QuotaExceededError'
    this.requestedBytes = requestedBytes
    this.currentUsedBytes = currentUsedBytes
    this.limitBytes = limitBytes
  }
}
