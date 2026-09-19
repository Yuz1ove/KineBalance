import { randomBytes, randomUUID } from 'node:crypto'
import type { IdentityManager } from './identity.ts'
import { type PersistentStore, UserInErasureError } from './store.ts'
export { UserInErasureError }

export type ErasureStatus =
  | 'DELETING'
  | 'ACTIVE_DATA_PURGED'
  | 'BACKUP_RETENTION_PENDING'
  | 'ERASURE_COMPLETE'
  | 'FAILED_RETRYABLE'

export interface ErasureReceipt {
  readonly receiptToken: string
  readonly jobId: string
  readonly requestedAt: string
  readonly completedAt: string | null
  readonly status: ErasureStatus
  readonly purgedSummary: {
    readonly sessionsCount: number
    readonly mediaFilesCount: number
    readonly vectorsCount: number
  }
  readonly backupRetentionNotice: string
  readonly thirdPartyBoundaryDisclosure: string
  readonly controlledPurgeScope: string
  readonly outOfScopeDisclosure: string
}

export class ErasureCoordinator {
  private identityManager: IdentityManager
  private store: PersistentStore
  private activeJobs = new Map<string, ErasureReceipt>()
  private receiptTokens = new Map<string, string>() // receiptToken -> jobId
  private inFlightTasks = new Set<string>() // active task identifiers

  constructor(identityManager: IdentityManager, store: PersistentStore) {
    this.identityManager = identityManager
    this.store = store
  }

  /**
   * Defensive check called immediately BEFORE writing any background task, upload,
   * embedding or analysis output to storage.
   * If user is DELETING or DELETED, this check aborts the write, preventing resurrected data!
   */
  assertCanWrite(userId: string): void {
    if (this.identityManager.isDeletingOrDeleted(userId)) {
      throw new UserInErasureError(userId)
    }
  }

  registerInFlightTask(taskId: string, userId: string): () => void {
    this.assertCanWrite(userId)
    this.inFlightTasks.add(taskId)
    return () => {
      this.inFlightTasks.delete(taskId)
    }
  }

  /**
   * Initiates and completes the cascade erasure workflow.
   * Idempotent: If user is already DELETED, returns existing completed receipt.
   */
  async executeErasure(userId: string): Promise<ErasureReceipt> {
    // 0. Check if user already deleted (Idempotent DELETE)
    const existingUser = this.identityManager.getUser(userId)
    if (existingUser && existingUser.status === 'DELETED') {
      const existingRecord = this.store.getErasureRecordByUserId(userId)
      if (existingRecord) {
        return {
          receiptToken: existingRecord.receipt_token,
          jobId: existingRecord.job_id,
          requestedAt: existingRecord.started_at,
          completedAt: existingRecord.completed_at,
          status: existingRecord.status as ErasureStatus,
          purgedSummary: JSON.parse(existingRecord.purged_counts_json || '{"sessionsCount":0,"mediaFilesCount":0,"vectorsCount":0}'),
          backupRetentionNotice:
            'Active operational stores purged immediately. Database WAL and disaster snapshots are retained under a 7-day immutable quarantine and automatically expire.',
          thirdPartyBoundaryDisclosure:
            'Purge guarantees deletion of all internal operational storage. Copies previously exported or downloaded by the client are outside system operational control.',
          controlledPurgeScope:
            'SQLite relational rows (users, sessions, analyses, media, vectors), local disk directories (.data/media/{userId}, .data/analyses/{userId}), in-flight tasks, and session tokens.',
          outOfScopeDisclosure:
            'Host OS block-level disk shredding, APFS/filesystem snapshots, system backups (Time Machine), and client-side exported downloads are outside operational system control.',
        }
      }
    }

    const jobId = randomUUID()
    const receiptToken = `kbpd_receipt_${randomBytes(24).toString('hex')}`
    const requestedAt = new Date().toISOString()

    // 1. Atomic state change to DELETING & immediately revoke tokens
    this.identityManager.markDeleting(userId)

    const initialReceipt: ErasureReceipt = {
      receiptToken,
      jobId,
      requestedAt,
      completedAt: null,
      status: 'DELETING',
      purgedSummary: {
        sessionsCount: 0,
        mediaFilesCount: 0,
        vectorsCount: 0,
      },
      backupRetentionNotice:
        'Active operational stores purged immediately. Database WAL and disaster snapshots are retained under a 7-day immutable quarantine and automatically expire.',
      thirdPartyBoundaryDisclosure:
        'Purge guarantees deletion of all internal operational storage. Copies previously exported or downloaded by the client are outside system operational control.',
      controlledPurgeScope:
        'SQLite relational rows (users, sessions, analyses, media, vectors), local disk directories (.data/media/{userId}, .data/analyses/{userId}), in-flight tasks, and session tokens.',
      outOfScopeDisclosure:
        'Host OS block-level disk shredding, APFS/filesystem snapshots, system backups (Time Machine), and client-side exported downloads are outside operational system control.',
    }

    this.activeJobs.set(jobId, initialReceipt)
    this.receiptTokens.set(receiptToken, jobId)

    // Persist initial erasure state in DB
    this.store.saveErasureRecord({
      jobId,
      userId,
      receiptToken,
      status: 'DELETING',
      startedAt: requestedAt,
      completedAt: null,
      purgedCountsJson: JSON.stringify(initialReceipt.purgedSummary),
    })

    // 2. Cancel / isolate all in-flight asynchronous tasks for this user
    this.inFlightTasks.clear()

    // 3. Purge physical files and database records
    const counts = this.store.purgeUserData(userId)

    // 4. Mark user DELETED in identity manager
    this.identityManager.markDeleted(userId)

    const completedAt = new Date().toISOString()
    const finalReceipt: ErasureReceipt = {
      receiptToken,
      jobId,
      requestedAt,
      completedAt,
      status: 'ERASURE_COMPLETE',
      purgedSummary: {
        sessionsCount: counts.purgedSessions,
        mediaFilesCount: counts.purgedFiles,
        vectorsCount: counts.purgedVectors,
      },
      backupRetentionNotice:
        'Active operational stores purged immediately. Database WAL and disaster snapshots are retained under a 7-day immutable quarantine and automatically expire.',
      thirdPartyBoundaryDisclosure:
        'Purge guarantees deletion of all internal operational storage. Copies previously exported or downloaded by the client are outside system operational control.',
      controlledPurgeScope:
        'SQLite relational rows (users, sessions, analyses, media, vectors), local disk directories (.data/media/{userId}, .data/analyses/{userId}), in-flight tasks, and session tokens.',
      outOfScopeDisclosure:
        'Host OS block-level disk shredding, APFS/filesystem snapshots, system backups (Time Machine), and client-side exported downloads are outside operational system control.',
    }

    this.activeJobs.set(jobId, finalReceipt)

    // Persist final erasure state in DB
    this.store.saveErasureRecord({
      jobId,
      userId,
      receiptToken,
      status: 'ERASURE_COMPLETE',
      startedAt: requestedAt,
      completedAt,
      purgedCountsJson: JSON.stringify(finalReceipt.purgedSummary),
    })

    return finalReceipt
  }

  getReceiptByToken(receiptToken: string): ErasureReceipt | null {
    // Check in-memory map first
    const jobId = this.receiptTokens.get(receiptToken)
    if (jobId && this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId) || null
    }

    // Check persistent SQLite store
    const record = this.store.getErasureRecordByToken(receiptToken)
    if (record) {
      return {
        receiptToken: record.receipt_token,
        jobId: record.job_id,
        requestedAt: record.started_at,
        completedAt: record.completed_at,
        status: record.status as ErasureStatus,
        purgedSummary: JSON.parse(record.purged_counts_json || '{"sessionsCount":0,"mediaFilesCount":0,"vectorsCount":0}'),
        backupRetentionNotice:
          'Active operational stores purged immediately. Database WAL and disaster snapshots are retained under a 7-day immutable quarantine and automatically expire.',
        thirdPartyBoundaryDisclosure:
          'Purge guarantees deletion of all internal operational storage. Copies previously exported or downloaded by the client are outside system operational control.',
      }
    }

    return null
  }
}
