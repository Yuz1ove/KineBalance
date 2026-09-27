import { randomBytes, randomUUID } from 'node:crypto'
import type { PersistentStore } from './store.ts'

export type UserStatus = 'ACTIVE' | 'DELETING' | 'DELETED'

export interface UserSession {
  readonly userId: string
  readonly token: string
  readonly createdAt: string
  readonly expiresAt: string
}

export class AuthenticationError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(`[${code}] ${message}`)
    this.code = code
    this.name = 'AuthenticationError'
  }
}

export class IdentityManager {
  private users = new Map<string, { id: string; status: UserStatus; version: number }>()
  private tokens = new Map<string, { userId: string; token: string; expiresAt: number; revoked: boolean }>()
  private store: PersistentStore | null = null

  constructor(store?: PersistentStore) {
    if (store) {
      this.attachStore(store)
    }
  }

  attachStore(store: PersistentStore) {
    this.store = store
    // Rehydrate active users from database on startup
    for (const u of store.getAllActiveUsers()) {
      this.users.set(u.id, { id: u.id, status: u.status as UserStatus, version: u.version })
    }
    // Rehydrate active sessions from database
    for (const s of store.getAllActiveSessions()) {
      this.tokens.set(s.token, { userId: s.userId, token: s.token, expiresAt: s.expiresAt, revoked: s.revoked })
    }
  }

  createUser(): { userId: string; token: string } {
    const userId = randomUUID()
    this.users.set(userId, { id: userId, status: 'ACTIVE', version: 1 })
    if (this.store) {
      this.store.createUserRecord(userId, 'ACTIVE', 1)
    }
    const token = this.generateToken(userId)
    return { userId, token }
  }

  generateToken(userId: string): string {
    let user = this.users.get(userId)
    if (!user && this.store) {
      const rec = this.store.getUserRecord(userId)
      if (rec) {
        user = { id: rec.id, status: rec.status as UserStatus, version: rec.version }
        this.users.set(userId, user)
      }
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new AuthenticationError('USER_INACTIVE', 'User is not active')
    }
    const token = `kbpd_sec_${randomBytes(24).toString('hex')}`
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    this.tokens.set(token, { userId, token, expiresAt, revoked: false })

    if (this.store) {
      this.store.saveUserSession(token, userId, expiresAt)
    }

    return token
  }

  /**
   * Authenticates caller strictly from verified Bearer token or session.
   * NEVER trust client-supplied user_id in body/query/headers!
   */
  authenticate(authHeader: string | undefined): { userId: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('UNAUTHORIZED', 'Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7).trim()
    let session = this.tokens.get(token)

    // Check persistent store if not in memory
    if (!session && this.store) {
      const dbSession = this.store.getUserSession(token)
      if (dbSession) {
        session = dbSession
        this.tokens.set(token, dbSession)
      }
    }

    if (!session || session.revoked || session.expiresAt < Date.now()) {
      throw new AuthenticationError('INVALID_TOKEN', 'Session token is invalid or expired')
    }

    let user = this.users.get(session.userId)
    if (!user && this.store) {
      const dbUser = this.store.getUserRecord(session.userId)
      if (dbUser) {
        user = { id: dbUser.id, status: dbUser.status as UserStatus, version: dbUser.version }
        this.users.set(session.userId, user)
      }
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new AuthenticationError('USER_NOT_ACTIVE', 'User account is inactive or being erased')
    }

    return { userId: session.userId }
  }

  getUser(userId: string) {
    let user = this.users.get(userId)
    if (!user && this.store) {
      const dbUser = this.store.getUserRecord(userId)
      if (dbUser) {
        user = { id: dbUser.id, status: dbUser.status as UserStatus, version: dbUser.version }
        this.users.set(userId, user)
      }
    }
    return user
  }

  markDeleting(userId: string): number {
    let user = this.users.get(userId)
    if (!user && this.store) {
      const dbUser = this.store.getUserRecord(userId)
      if (dbUser) {
        user = { id: dbUser.id, status: dbUser.status as UserStatus, version: dbUser.version }
        this.users.set(userId, user)
      }
    }

    if (!user) throw new AuthenticationError('USER_NOT_FOUND', 'User does not exist')
    user.status = 'DELETING'
    user.version += 1

    // Immediately revoke all sessions for this user in memory
    for (const session of this.tokens.values()) {
      if (session.userId === userId) {
        session.revoked = true
      }
    }

    // Persist to store
    if (this.store) {
      this.store.setUserStatus(userId, 'DELETING')
      this.store.revokeUserSessions(userId)
    }

    return user.version
  }

  markDeleted(userId: string) {
    let user = this.users.get(userId)
    if (!user && this.store) {
      const dbUser = this.store.getUserRecord(userId)
      if (dbUser) {
        user = { id: dbUser.id, status: dbUser.status as UserStatus, version: dbUser.version }
        this.users.set(userId, user)
      }
    }

    if (user) {
      user.status = 'DELETED'
      user.version += 1
    }

    if (this.store) {
      this.store.setUserStatus(userId, 'DELETED')
      this.store.revokeUserSessions(userId)
    }
  }

  isDeletingOrDeleted(userId: string): boolean {
    const user = this.getUser(userId)
    return !user || user.status === 'DELETING' || user.status === 'DELETED'
  }
}
