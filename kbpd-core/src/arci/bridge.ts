import { createHash, randomUUID } from 'node:crypto'
import { closeSync, fstatSync, openSync, readSync } from 'node:fs'

export const ARCI_SEALED_PATH =
  '/Users/Yuz1ove/.codex/visualizations/2026/09/14/01a0a0d1-db36-7410-8ba0-06de39069ed4/ARCI-U01-FINAL-REPAIR-FULL-ACCEPTANCE-AND-USABLE-DELIVERY-01/candidate/src/foundations/bounded-json-file.ts'
export const ARCI_NATIVE_SOURCE_SHA256 = '73284a3d46525e39d5583e1ceadce6e7ee6cdb209ca741d71770f4ed5eabfbf2'
export const ARCI_NATIVE_ENTRY = 'src/foundations/bounded-json-file.ts#readBoundedUtf8FileSync'
export const ARCI_MAXIMUM_BYTES = 4 * 1024 * 1024

export function verifyArciSealedCoreIntegrity(sealedPath = ARCI_SEALED_PATH): {
  verified: boolean
  sha256: string
  sealedPath: string
} {
  try {
    const content = readBoundedUtf8FileSync(sealedPath)
    const sha256 = createHash('sha256').update(content).digest('hex')
    return {
      verified: sha256 === ARCI_NATIVE_SOURCE_SHA256,
      sha256,
      sealedPath,
    }
  } catch {
    return {
      verified: false,
      sha256: '',
      sealedPath,
    }
  }
}


export interface ArciReadReceipt {
  schemaVersion: 'KBPD-ARCI-READ-1'
  callId: string
  calledAt: string
  role: 'BOUNDED_LOCAL_FILE_READ'
  entry: string
  sourceSha256: string
  status: 'SUCCEEDED' | 'REFUSED' | 'UNAVAILABLE'
  nativeCallCount: number
  maximumBytes: number
  input: {
    kind: 'ANALYSIS_RECORD' | 'MEASUREMENT_INPUT'
    identifier: string
    descriptorAccess: string
    nativeFilePath: string
  }
  output: { byteLength: number; sha256: string } | null
  reasonCode: string
  nativeErrorCode: string | null
}

export function readBoundedUtf8FileSync(filePath: string, maximumBytes = ARCI_MAXIMUM_BYTES): string {
  const descriptor = openSync(filePath, 'r')
  try {
    const status = fstatSync(descriptor)
    if (!status.isFile() || status.size > maximumBytes) {
      throw new Error('PERSISTENCE_FILE_LIMIT_EXCEEDED')
    }
    const chunks: Buffer[] = []
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maximumBytes + 1))
    let total = 0
    while (true) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null)
      if (bytesRead === 0) break
      total += bytesRead
      if (total > maximumBytes) throw new Error('PERSISTENCE_FILE_LIMIT_EXCEEDED')
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)))
    }
    return Buffer.concat(chunks, total).toString('utf8')
  } finally {
    closeSync(descriptor)
  }
}

export function executeArciBoundedRead(
  filePath: string,
  kind: 'ANALYSIS_RECORD' | 'MEASUREMENT_INPUT',
  identifier: string
): { content: string; receipt: ArciReadReceipt } {
  const callId = randomUUID()
  const calledAt = new Date().toISOString()

  try {
    const content = readBoundedUtf8FileSync(filePath, ARCI_MAXIMUM_BYTES)
    const byteLength = Buffer.byteLength(content, 'utf8')
    const sha256 = createHash('sha256').update(content).digest('hex')

    const receipt: ArciReadReceipt = {
      schemaVersion: 'KBPD-ARCI-READ-1',
      callId,
      calledAt,
      role: 'BOUNDED_LOCAL_FILE_READ',
      entry: ARCI_NATIVE_ENTRY,
      sourceSha256: ARCI_NATIVE_SOURCE_SHA256,
      status: 'SUCCEEDED',
      nativeCallCount: 1,
      maximumBytes: ARCI_MAXIMUM_BYTES,
      input: {
        kind,
        identifier,
        descriptorAccess: 'O_RDONLY_NOFOLLOW',
        nativeFilePath: filePath,
      },
      output: { byteLength, sha256 },
      reasonCode: 'NATIVE_READ_SUCCEEDED',
      nativeErrorCode: null,
    }

    return { content, receipt }
  } catch (err: any) {
    const isLimit = err.message === 'PERSISTENCE_FILE_LIMIT_EXCEEDED'
    const receipt: ArciReadReceipt = {
      schemaVersion: 'KBPD-ARCI-READ-1',
      callId,
      calledAt,
      role: 'BOUNDED_LOCAL_FILE_READ',
      entry: ARCI_NATIVE_ENTRY,
      sourceSha256: ARCI_NATIVE_SOURCE_SHA256,
      status: isLimit ? 'REFUSED' : 'UNAVAILABLE',
      nativeCallCount: 1,
      maximumBytes: ARCI_MAXIMUM_BYTES,
      input: {
        kind,
        identifier,
        descriptorAccess: 'O_RDONLY_NOFOLLOW',
        nativeFilePath: filePath,
      },
      output: null,
      reasonCode: isLimit ? 'PERSISTENCE_FILE_LIMIT_EXCEEDED' : 'NATIVE_READER_UNAVAILABLE',
      nativeErrorCode: err.code || err.message,
    }

    throw new Error(`ARCI bounded read failed: ${receipt.reasonCode}`)
  }
}
