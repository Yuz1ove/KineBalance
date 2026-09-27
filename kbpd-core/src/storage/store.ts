import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DEFAULT_QUOTA_CONFIG, QuotaExceededError, type StorageQuotaConfig, type UserStorageUsage } from './quota.ts'
import type { MeasurementInput, MeasurementOutput } from '../measurement/contracts.ts'
import { validateRawMeasurement } from '../measurement/validation.ts'
import { calculateTrend, digest } from '../measurement/trend.ts'
import { analyzeFingerTapping } from '../measurement/detector.ts'

export class StoreError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(`[${code}] ${message}`)
    this.code = code
    this.name = 'StoreError'
  }
}

export class UserInErasureError extends Error {
  readonly code = 'USER_IN_ERASURE_OR_DELETED'
  constructor(userId: string) {
    super(`Write aborted: user ${userId} is undergoing erasure or has been purged`)
    this.name = 'UserInErasureError'
  }
}

export interface SessionRecord {
  id: string
  ownerUserId: string
  handSide: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface MediaAssetRecord {
  id: string
  sessionId: string
  ownerUserId: string
  fileName: string
  mimeType: string
  byteSize: number
  sha256: string
  storagePath: string
  createdAt: string
}

export interface StoredMeasurement {
  id?: string
  session: SessionRecord
  mediaAssets: MediaAssetRecord[]
  measurementOutput: MeasurementOutput | null
  metadata?: any
  rawInput?: MeasurementInput
  interpretation?: any
  analysisRecordPath?: string
}


export class PersistentStore {
  private db: DatabaseSync
  private baseDir: string
  private mediaDir: string
  private quotaConfig: StorageQuotaConfig

  constructor(dbPath: string, baseDir: string, quotaConfig: StorageQuotaConfig = DEFAULT_QUOTA_CONFIG) {
    this.baseDir = baseDir
    this.mediaDir = join(baseDir, 'media')
    this.quotaConfig = quotaConfig

    mkdirSync(this.mediaDir, { recursive: true })
    this.db = new DatabaseSync(dbPath)
    this.initializeSchema()
  }

  private initializeSchema() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS measurement_sessions (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        hand_side TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS measurement_payloads (
        session_id TEXT PRIMARY KEY REFERENCES measurement_sessions(id) ON DELETE CASCADE,
        metadata_json TEXT NOT NULL, raw_json TEXT, interpretation_json TEXT
      );
      CREATE TABLE IF NOT EXISTS visit_summaries (
        owner_user_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES measurement_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS analysis_results (
        session_id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        algorithm_version TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        quality_json TEXT NOT NULL,
        limitations_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES measurement_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_vectors (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        asset_id TEXT,
        modality TEXT NOT NULL, -- 'text' | 'image'
        model_id TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        embedding_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medical_evidence (
        id TEXT PRIMARY KEY,
        doi TEXT UNIQUE,
        title TEXT NOT NULL,
        authors TEXT NOT NULL,
        year INTEGER NOT NULL,
        license_type TEXT NOT NULL,
        corpus_version TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        embedding_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS erasure_records (
        job_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        receipt_token TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        purged_counts_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_owner ON measurement_sessions(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_owner ON analysis_results(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_vectors_owner ON user_vectors(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_erasure_token ON erasure_records(receipt_token);
      CREATE INDEX IF NOT EXISTS idx_erasure_user ON erasure_records(user_id);
    `)
  }

  // --- Quota & Storage Tracking ---

  getUserStorageUsage(userId: string): UserStorageUsage {
    const mediaStmt = this.db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(byte_size), 0) as totalBytes FROM media_assets WHERE owner_user_id = ?'
    )
    const mediaRes = mediaStmt.get(userId) as { count: number; totalBytes: number }

    const sessStmt = this.db.prepare('SELECT COUNT(*) as count FROM measurement_sessions WHERE owner_user_id = ?')
    const sessRes = sessStmt.get(userId) as { count: number }

    const vecStmt = this.db.prepare('SELECT COUNT(*) as count FROM user_vectors WHERE owner_user_id = ?')
    const vecRes = vecStmt.get(userId) as { count: number }

    const usedBytes = Number(mediaRes.totalBytes)
    const remainingBytes = Math.max(0, this.quotaConfig.maxStoragePerUserBytes - usedBytes)

    return {
      userId,
      usedBytes,
      quotaBytes: this.quotaConfig.maxStoragePerUserBytes,
      fileCount: Number(mediaRes.count),
      sessionCount: Number(sessRes.count),
      vectorCount: Number(vecRes.count),
      remainingBytes,
    }
  }

  private checkQuota(userId: string, additionalBytes: number) {
    if (additionalBytes > this.quotaConfig.maxFileSizeBytes) {
      throw new QuotaExceededError(
        `File size ${additionalBytes} exceeds maximum allowed ${this.quotaConfig.maxFileSizeBytes}`,
        additionalBytes,
        0,
        this.quotaConfig.maxFileSizeBytes
      )
    }

    const usage = this.getUserStorageUsage(userId)
    if (usage.usedBytes + additionalBytes > this.quotaConfig.maxStoragePerUserBytes) {
      throw new QuotaExceededError(
        `User storage quota exceeded. Current: ${usage.usedBytes}, Adding: ${additionalBytes}, Max: ${this.quotaConfig.maxStoragePerUserBytes}`,
        additionalBytes,
        usage.usedBytes,
        this.quotaConfig.maxStoragePerUserBytes
      )
    }
  }

  // --- User & Session Persistence ---

  createUserRecord(userId: string, status = 'ACTIVE', version = 1): void {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO users (id, status, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(userId, status, version, now, now)
  }

  getUserRecord(userId: string): { id: string; status: string; version: number } | null {
    const stmt = this.db.prepare('SELECT id, status, version FROM users WHERE id = ?')
    const row = stmt.get(userId) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      id: row.id as string,
      status: row.status as string,
      version: Number(row.version),
    }
  }

  setUserStatus(userId: string, status: string): number {
    const now = new Date().toISOString()
    const current = this.getUserRecord(userId)
    const newVersion = (current?.version ?? 0) + 1
    const stmt = this.db.prepare(`
      INSERT INTO users (id, status, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, version = version + 1, updated_at = excluded.updated_at
    `)
    stmt.run(userId, status, newVersion, now, now)

    if (status === 'DELETING' || status === 'DELETED') {
      this.revokeUserSessions(userId)
    }

    return newVersion
  }

  saveUserSession(token: string, userId: string, expiresAt: number): void {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_sessions (token, user_id, expires_at, revoked, created_at)
      VALUES (?, ?, ?, 0, ?)
    `)
    stmt.run(token, userId, expiresAt, now)
  }

  getUserSession(token: string): { token: string; userId: string; expiresAt: number; revoked: boolean } | null {
    const stmt = this.db.prepare('SELECT token, user_id, expires_at, revoked FROM user_sessions WHERE token = ?')
    const row = stmt.get(token) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      token: row.token as string,
      userId: row.user_id as string,
      expiresAt: Number(row.expires_at),
      revoked: Boolean(row.revoked),
    }
  }

  revokeUserSessions(userId: string): void {
    this.db.prepare('UPDATE user_sessions SET revoked = 1 WHERE user_id = ?').run(userId)
  }

  getAllActiveUsers(): { id: string; status: string; version: number }[] {
    const rows = this.db.prepare("SELECT id, status, version FROM users WHERE status = 'ACTIVE'").all() as Record<string, unknown>[]
    return rows.map(r => ({
      id: r.id as string,
      status: r.status as string,
      version: Number(r.version),
    }))
  }

  getAllActiveSessions(): { token: string; userId: string; expiresAt: number; revoked: boolean }[] {
    const rows = this.db.prepare('SELECT token, user_id, expires_at, revoked FROM user_sessions WHERE revoked = 0').all() as Record<string, unknown>[]
    return rows.map(r => ({
      token: r.token as string,
      userId: r.user_id as string,
      expiresAt: Number(r.expires_at),
      revoked: Boolean(r.revoked),
    }))
  }

  // --- Session Management ---

  createSession(userId: string, handSide: string, metadata: any = {}): SessionRecord {
    if (!['LEFT','RIGHT','UNKNOWN'].includes(handSide)) throw new StoreError('INVALID_HAND', 'Invalid hand side')
    if (metadata.measuredAt !== undefined && (typeof metadata.measuredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(metadata.measuredAt) || !Number.isFinite(Date.parse(metadata.measuredAt)))) throw new StoreError('INVALID_TIMESTAMP', 'Invalid timestamp')
    if (metadata.measuredAt && metadata.source !== 'SYNTHETIC_TEST_DATA') throw new StoreError('INVALID_SOURCE', 'Historical test timestamps require synthetic source')
    if (metadata.source !== undefined && !['SYNTHETIC_TEST_DATA','CAMERA','REAL_VIDEO','UNKNOWN'].includes(metadata.source)) throw new StoreError('INVALID_SOURCE','Invalid source')
    const existing = this.db.prepare("SELECT COALESCE(p.metadata_json, '{}') AS metadata_json FROM measurement_sessions s LEFT JOIN measurement_payloads p ON p.session_id=s.id WHERE s.owner_user_id = ?").all(userId) as any[]
    if (existing.some(r => (JSON.parse(r.metadata_json).source === 'SYNTHETIC_TEST_DATA') !== (metadata.source === 'SYNTHETIC_TEST_DATA'))) throw new StoreError('SOURCE_ISOLATION','Use a separate identity for synthetic data')
    const userRec = this.getUserRecord(userId)
    if (userRec && (userRec.status === 'DELETING' || userRec.status === 'DELETED')) {
      throw new UserInErasureError(userId)
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO measurement_sessions (id, owner_user_id, hand_side, status, created_at, updated_at)
      VALUES (?, ?, ?, 'CREATED', ?, ?)
    `)
    stmt.run(id, userId, handSide, metadata.measuredAt || now, now)
    this.db.prepare('INSERT INTO measurement_payloads(session_id, metadata_json) VALUES (?,?)').run(id,JSON.stringify(metadata))

    return {
      id,
      ownerUserId: userId,
      handSide,
      status: 'CREATED',
      createdAt: metadata.measuredAt || now,
      updatedAt: now,
    }
  }

  getSession(userId: string, sessionId: string): SessionRecord {
    const stmt = this.db.prepare(`
      SELECT id, owner_user_id, hand_side, status, created_at, updated_at
      FROM measurement_sessions
      WHERE id = ? AND owner_user_id = ?
    `)
    const row = stmt.get(sessionId, userId) as Record<string, unknown> | undefined
    if (!row) {
      throw new StoreError('SESSION_NOT_FOUND', `Session ${sessionId} not found or access denied`)
    }

    return {
      id: row.id as string,
      ownerUserId: row.owner_user_id as string,
      handSide: row.hand_side as string,
      status: row.status as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  // --- Media Storage ---

  saveMedia(
    userId: string,
    sessionId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer
  ): MediaAssetRecord {
    // 0. Pre-check: user must not be deleting or deleted
    const userRec = this.getUserRecord(userId)
    if (userRec && (userRec.status === 'DELETING' || userRec.status === 'DELETED')) {
      throw new UserInErasureError(userId)
    }

    // 1. Verify session ownership
    this.getSession(userId, sessionId)

    // 2. Quota check
    this.checkQuota(userId, buffer.byteLength)

    // 3. Path Traversal Defense
    const assetId = randomUUID()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const userMediaDir = join(this.mediaDir, userId)
    mkdirSync(userMediaDir, { recursive: true })

    const safePath = resolve(userMediaDir, `${assetId}_${sanitizedFileName}`)
    if (!safePath.startsWith(resolve(userMediaDir))) {
      throw new StoreError('PATH_TRAVERSAL_DETECTED', 'Invalid file path traversal attempt')
    }

    // 4. Write file
    writeFileSync(safePath, buffer)
    const sha256 = createHash('sha256').update(buffer).digest('hex')
    const now = new Date().toISOString()

    // 5. Defensive commit-time check: Re-verify user is STILL active right before DB commit!
    const postCheck = this.getUserRecord(userId)
    if (postCheck && (postCheck.status === 'DELETING' || postCheck.status === 'DELETED')) {
      // Compensating cleanup!
      rmSync(safePath, { force: true })
      throw new UserInErasureError(userId)
    }

    // 6. Record asset
    const stmt = this.db.prepare(`
      INSERT INTO media_assets (id, session_id, owner_user_id, file_name, mime_type, byte_size, sha256, storage_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(assetId, sessionId, userId, sanitizedFileName, mimeType, buffer.byteLength, sha256, safePath, now)

    return {
      id: assetId,
      sessionId,
      ownerUserId: userId,
      fileName: sanitizedFileName,
      mimeType,
      byteSize: buffer.byteLength,
      sha256,
      storagePath: safePath,
      createdAt: now,
    }
  }

  getMediaAsset(userId: string, assetId: string): MediaAssetRecord & { buffer: Buffer } {
    const stmt = this.db.prepare(`
      SELECT id, session_id, owner_user_id, file_name, mime_type, byte_size, sha256, storage_path, created_at
      FROM media_assets
      WHERE id = ? AND owner_user_id = ?
    `)
    const row = stmt.get(assetId, userId) as Record<string, unknown> | undefined
    if (!row) {
      throw new StoreError('MEDIA_NOT_FOUND', `Media asset ${assetId} not found or access denied`)
    }

    const storagePath = row.storage_path as string
    if (!existsSync(storagePath)) {
      throw new StoreError('FILE_MISSING_ON_DISK', 'Media file is missing on storage volume')
    }

    const buffer = readFileSync(storagePath)
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      ownerUserId: row.owner_user_id as string,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string,
      byteSize: Number(row.byte_size),
      sha256: row.sha256 as string,
      storagePath,
      createdAt: row.created_at as string,
      buffer,
    }
  }

  // --- Measurement Analysis & Retrieval ---

  saveAnalysis(userId: string, input: MeasurementInput): MeasurementOutput {
    // 0. Pre-check
    const userRec = this.getUserRecord(userId)
    if (userRec && (userRec.status === 'DELETING' || userRec.status === 'DELETED')) {
      throw new UserInErasureError(userId)
    }

    // Verify session
    const session = this.getSession(userId, input.sessionId)
    const invalid = validateRawMeasurement(input)
    if (invalid) throw new StoreError('INVALID_RAW_MEASUREMENT', invalid)
    if (input.handSide !== session.handSide) throw new StoreError('SIDE_MISMATCH', 'Session side differs')

    // Run deterministic analysis core
    const output = analyzeFingerTapping(input)
    if (output.quality.validFrames === 0) throw new StoreError('NO_VALID_FRAMES', '沒有有效手部量測資料，未保存分析')
    if (output.metrics.averageFrequencyHz !== null && output.metrics.averageFrequencyHz > 12) throw new StoreError('KINEMATIC_OUTLIER','Engineering frequency limit exceeded')

    // Defensive commit-time check
    const postCheck = this.getUserRecord(userId)
    if (postCheck && (postCheck.status === 'DELETING' || postCheck.status === 'DELETED')) {
      throw new UserInErasureError(userId)
    }

    const now = output.calculatedAt
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO analysis_results (session_id, owner_user_id, algorithm_version, metrics_json, quality_json, limitations_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      input.sessionId,
      userId,
      output.algorithmVersion,
      JSON.stringify(output.metrics),
      JSON.stringify(output.quality),
      JSON.stringify(output.limitations),
      now
    )

    this.db.prepare(`
      UPDATE measurement_sessions SET status = 'ANALYZED', updated_at = ? WHERE id = ? AND owner_user_id = ?
    `).run(now, input.sessionId, userId)

    this.db.prepare(`INSERT INTO measurement_payloads(session_id,metadata_json,raw_json) VALUES (?,'{}',?) ON CONFLICT(session_id) DO UPDATE SET raw_json=excluded.raw_json, interpretation_json=NULL`).run(input.sessionId, JSON.stringify(input))
    this.db.prepare('DELETE FROM visit_summaries WHERE owner_user_id = ?').run(userId)
    // Write physical bounded analysis file for sealed ARCI local reads
    const userAnalysisDir = join(this.baseDir, 'analyses', userId)
    mkdirSync(userAnalysisDir, { recursive: true })
    const analysisPath = join(userAnalysisDir, `${input.sessionId}.json`)
    writeFileSync(analysisPath, JSON.stringify(output, null, 2))

    return output
  }


  getMeasurement(userId: string, sessionId: string): StoredMeasurement {
    const session = this.getSession(userId, sessionId)

    const mediaStmt = this.db.prepare(`
      SELECT id, session_id, owner_user_id, file_name, mime_type, byte_size, sha256, storage_path, created_at
      FROM media_assets
      WHERE session_id = ? AND owner_user_id = ?
    `)
    const mediaRows = mediaStmt.all(sessionId, userId) as Record<string, unknown>[]
    const mediaAssets: MediaAssetRecord[] = mediaRows.map(r => ({
      id: r.id as string,
      sessionId: r.session_id as string,
      ownerUserId: r.owner_user_id as string,
      fileName: r.file_name as string,
      mimeType: r.mime_type as string,
      byteSize: Number(r.byte_size),
      sha256: r.sha256 as string,
      storagePath: r.storage_path as string,
      createdAt: r.created_at as string,
    }))

    const anaStmt = this.db.prepare(`
      SELECT algorithm_version, metrics_json, quality_json, limitations_json, created_at
      FROM analysis_results
      WHERE session_id = ? AND owner_user_id = ?
    `)
    const anaRow = anaStmt.get(sessionId, userId) as Record<string, unknown> | undefined

    let measurementOutput: MeasurementOutput | null = null
    if (anaRow) {
      measurementOutput = {
        schemaVersion: 'KBPD-MEASUREMENT-OUT-1',
        sessionId,
        calculatedAt: anaRow.created_at as string,
        algorithmVersion: anaRow.algorithm_version as string,
        handSide: session.handSide as any,
        quality: JSON.parse(anaRow.quality_json as string),
        metrics: JSON.parse(anaRow.metrics_json as string),
        limitations: JSON.parse(anaRow.limitations_json as string),
      }
    }

    const analysisPath = join(this.baseDir, 'analyses', userId, `${sessionId}.json`)
    // V1.2 adds the decision trace; the existing physical record already stores it.
    // Keep the existing schema and legacy records, while returning the full new output.
    if (measurementOutput?.algorithmVersion.startsWith('KBPD-DETECTOR-V1.2.0')) {
      if (!existsSync(analysisPath)) throw new StoreError('ANALYSIS_FILE_MISSING', '保存的分析檔不完整')
      const stored = JSON.parse(readFileSync(analysisPath, 'utf8'))
      for (const key of ['sessionId', 'algorithmVersion', 'calculatedAt', 'handSide', 'metrics', 'quality', 'limitations'] as const) {
        if (JSON.stringify(stored[key]) !== JSON.stringify(measurementOutput[key])) {
          throw new StoreError('ANALYSIS_INTEGRITY_MISMATCH', '保存的分析內容不一致')
        }
      }
      measurementOutput = { ...measurementOutput, trace: stored.trace }
    }
    const payload = this.db.prepare('SELECT * FROM measurement_payloads WHERE session_id=?').get(sessionId) as any
    return {
      metadata: payload ? JSON.parse(payload.metadata_json) : {},
      rawInput: payload?.raw_json ? JSON.parse(payload.raw_json) : undefined,
      interpretation: payload?.interpretation_json ? JSON.parse(payload.interpretation_json) : undefined,
      id: session.id,
      session,
      mediaAssets,
      measurementOutput,
      analysisRecordPath: existsSync(analysisPath) ? analysisPath : undefined,
    }
  }


  listMeasurements(userId: string, page = 1, limit = 20): { total: number; items: SessionRecord[] } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM measurement_sessions WHERE owner_user_id = ?')
    const total = Number((countStmt.get(userId) as { count: number }).count)

    const offset = (page - 1) * limit
    const listStmt = this.db.prepare(`
      SELECT s.id, s.owner_user_id, s.hand_side, s.status, s.created_at, s.updated_at,
             a.algorithm_version, a.metrics_json, a.quality_json, a.limitations_json, a.created_at as analysis_created_at
      FROM measurement_sessions s
      LEFT JOIN analysis_results a ON a.session_id = s.id AND a.owner_user_id = s.owner_user_id
      WHERE s.owner_user_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `)
    const rows = listStmt.all(userId, limit, offset) as Record<string, unknown>[]

    return {
      total,
      items: rows.map(r => {
        const session: SessionRecord = {
          id: r.id as string,
          ownerUserId: r.owner_user_id as string,
          handSide: r.hand_side as string,
          status: r.status as string,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        }
        let analysis: MeasurementOutput | undefined = undefined
        if (r.algorithm_version && r.metrics_json) {
          analysis = {
            schemaVersion: 'KBPD-MEASUREMENT-OUT-1',
            sessionId: r.id as string,
            calculatedAt: (r.analysis_created_at || r.created_at) as string,
            algorithmVersion: r.algorithm_version as string,
            handSide: session.handSide as any,
            quality: JSON.parse(r.quality_json as string),
            metrics: JSON.parse(r.metrics_json as string),
            limitations: JSON.parse(r.limitations_json as string),
          }
        }
        return {
          ...session,
          session,
          analysis,
          metadata: this.getMeasurement(userId,session.id).metadata,
          interpretation: this.getMeasurement(userId,session.id).interpretation,
        } as any
      }),
    }
  }

  // --- Deletion (Single Measurement) ---

  deleteMeasurement(userId: string, sessionId: string): void {
    // 1. Verify ownership & get media paths
    this.getSession(userId, sessionId)

    const mediaStmt = this.db.prepare('SELECT storage_path FROM media_assets WHERE session_id = ? AND owner_user_id = ?')
    const mediaRows = mediaStmt.all(sessionId, userId) as { storage_path: string }[]

    // 2. Delete media from disk
    for (const row of mediaRows) {
      if (existsSync(row.storage_path)) {
        rmSync(row.storage_path, { force: true })
      }
    }

    for (const suffix of ['.json', '.interpretation-input.json']) rmSync(join(this.baseDir,'analyses',userId,`${sessionId}${suffix}`),{force:true})
    this.db.prepare('DELETE FROM visit_summaries WHERE owner_user_id = ?').run(userId)
    // 3. Delete from DB (CASCADE deletes media_assets and analysis_results)
    this.db.prepare('DELETE FROM measurement_sessions WHERE id = ? AND owner_user_id = ?').run(sessionId, userId)
  }

  // --- Cascade Erasure for User ---

  purgeUserData(userId: string): { purgedSessions: number; purgedFiles: number; purgedVectors: number } {
    // 1. Collect media files to delete
    const mediaStmt = this.db.prepare('SELECT storage_path FROM media_assets WHERE owner_user_id = ?')
    const mediaRows = mediaStmt.all(userId) as { storage_path: string }[]

    for (const row of mediaRows) {
      if (existsSync(row.storage_path)) {
        rmSync(row.storage_path, { force: true })
      }
    }

    // Also remove user media directory and analyses directory
    const userMediaDir = join(this.mediaDir, userId)
    if (existsSync(userMediaDir)) {
      rmSync(userMediaDir, { recursive: true, force: true })
    }
    const userAnalysisDir = join(this.baseDir, 'analyses', userId)
    if (existsSync(userAnalysisDir)) {
      rmSync(userAnalysisDir, { recursive: true, force: true })
    }


    // 2. Query counts before deleting
    const sessCount = (this.db.prepare('SELECT COUNT(*) as count FROM measurement_sessions WHERE owner_user_id = ?').get(userId) as { count: number }).count
    const fileCount = (this.db.prepare('SELECT COUNT(*) as count FROM media_assets WHERE owner_user_id = ?').get(userId) as { count: number }).count
    const vecCount = (this.db.prepare('SELECT COUNT(*) as count FROM user_vectors WHERE owner_user_id = ?').get(userId) as { count: number }).count

    // 3. Delete user data across all tables
    this.db.prepare('DELETE FROM visit_summaries WHERE owner_user_id = ?').run(userId)
    this.db.prepare('DELETE FROM user_vectors WHERE owner_user_id = ?').run(userId)
    this.db.prepare('DELETE FROM analysis_results WHERE owner_user_id = ?').run(userId)
    this.db.prepare('DELETE FROM media_assets WHERE owner_user_id = ?').run(userId)
    this.db.prepare('DELETE FROM measurement_sessions WHERE owner_user_id = ?').run(userId)

    return {
      purgedSessions: Number(sessCount),
      purgedFiles: Number(fileCount),
      purgedVectors: Number(vecCount),
    }
  }

  // --- Public Medical Evidence (Read-only for users) ---

  insertMedicalEvidence(evidence: {
    doi: string
    title: string
    authors: string
    year: number
    licenseType: string
    corpusVersion: string
    summaryText: string
    embeddingJson?: string
  }) {
    const id = randomUUID()
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO medical_evidence (id, doi, title, authors, year, license_type, corpus_version, summary_text, embedding_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      evidence.doi,
      evidence.title,
      evidence.authors,
      evidence.year,
      evidence.licenseType,
      evidence.corpusVersion,
      evidence.summaryText,
      evidence.embeddingJson ?? null,
      now
    )
    return id
  }

  listMedicalEvidence(corpusVersion?: string) {
    let query = 'SELECT * FROM medical_evidence'
    const params: string[] = []
    if (corpusVersion) {
      query += ' WHERE corpus_version = ?'
      params.push(corpusVersion)
    }
    return this.db.prepare(query).all(...params)
  }

  // --- Deletion Receipt Persistence ---

  saveErasureRecord(record: {
    jobId: string
    userId: string
    receiptToken: string
    status: string
    startedAt: string
    completedAt: string | null
    purgedCountsJson: string
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO erasure_records (job_id, user_id, receipt_token, status, started_at, completed_at, purged_counts_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      record.jobId,
      record.userId,
      record.receiptToken,
      record.status,
      record.startedAt,
      record.completedAt,
      record.purgedCountsJson
    )
  }

  getErasureRecordByToken(receiptToken: string): {
    job_id: string
    user_id: string
    receipt_token: string
    status: string
    started_at: string
    completed_at: string | null
    purged_counts_json: string
  } | null {
    const stmt = this.db.prepare('SELECT * FROM erasure_records WHERE receipt_token = ?')
    const row = stmt.get(receiptToken) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      job_id: row.job_id as string,
      user_id: row.user_id as string,
      receipt_token: row.receipt_token as string,
      status: row.status as string,
      started_at: row.started_at as string,
      completed_at: row.completed_at as string | null,
      purged_counts_json: row.purged_counts_json as string,
    }
  }

  getErasureRecordByUserId(userId: string): {
    job_id: string
    user_id: string
    receipt_token: string
    status: string
    started_at: string
    completed_at: string | null
    purged_counts_json: string
  } | null {
    const stmt = this.db.prepare('SELECT * FROM erasure_records WHERE user_id = ? ORDER BY started_at DESC LIMIT 1')
    const row = stmt.get(userId) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      job_id: row.job_id as string,
      user_id: row.user_id as string,
      receipt_token: row.receipt_token as string,
      status: row.status as string,
      started_at: row.started_at as string,
      completed_at: row.completed_at as string | null,
      purged_counts_json: row.purged_counts_json as string,
    }
  }

  // --- Baseline Retrieval for ARCI Comparison ---

  getPriorMeasurements(userId: string, handSide?: string, excludeSessionId?: string): StoredMeasurement[] {
    let query = `
      SELECT s.id
      FROM measurement_sessions s
      JOIN analysis_results a ON a.session_id = s.id
      WHERE s.owner_user_id = ?
    `
    const params: any[] = [userId]
    if (handSide && handSide !== 'UNKNOWN') {
      query += ' AND s.hand_side = ?'
      params.push(handSide)
    }
    if (excludeSessionId) {
      query += ' AND s.id != ?'
      params.push(excludeSessionId)
    }
    query += ' ORDER BY s.created_at ASC'
    const rows = this.db.prepare(query).all(...params) as { id: string }[]
    return rows.map(r => this.getMeasurement(userId, r.id))
  }

  getTrend(userId: string) { return calculateTrend(this.getPriorMeasurements(userId)) }

  prepareInterpretationInput(userId: string, measurement: StoredMeasurement, trend: unknown) {
    const path = join(this.baseDir,'analyses',userId,`${measurement.session.id}.interpretation-input.json`)
    const value = {measurement:measurement.measurementOutput,metadata:measurement.metadata,trend}
    writeFileSync(path, JSON.stringify(value,null,2))
    return {...measurement,analysisRecordPath:path}
  }

  saveInterpretation(userId: string, sessionId: string, interpretation: any) {
    this.getSession(userId,sessionId)
    const value={...interpretation,id:`arci-${digest(interpretation)}`}
    this.db.prepare('UPDATE measurement_payloads SET interpretation_json=? WHERE session_id=?').run(JSON.stringify(value),sessionId)
    this.db.prepare('DELETE FROM visit_summaries WHERE owner_user_id=?').run(userId)
    return value
  }

  getSummary(userId: string, since?: string) {
    const records=this.getPriorMeasurements(userId).filter(r => !since || Date.parse(r.session.createdAt) >= Date.parse(since))
    const trend=calculateTrend(records)
    const value={schemaVersion:'KBPD-VISIT-SUMMARY-1',trend,measurementIds:records.map(r=>r.session.id),
      interpretations:records.filter(r=>r.interpretation).map(r=>({measurementId:r.session.id,id:r.interpretation.id,summary:r.interpretation.evidenceSupportedInterpretation?.summary})),
      sources:[...new Set(records.map(r=>r.metadata?.source??'UNKNOWN'))],qualificationStatus:'UNQUALIFIED',
      disclaimer:'工程量測觀察，不構成診斷、臨床評分或用藥建議。'}
    const result={...value,id:`summary-${digest(value)}`}
    if (!since) this.db.prepare('INSERT OR REPLACE INTO visit_summaries(owner_user_id,payload_json) VALUES (?,?)').run(userId,JSON.stringify(result))
    return result
  }

  // Close database
  close() {
    this.db.close()
  }
}
