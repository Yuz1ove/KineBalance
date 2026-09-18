/**
 * KBPD Demo Mode Service
 * Manages Demo Mode toggle, persistence in localStorage, and synthetic data isolation.
 */

import { DEMO_MEASUREMENTS, type DemoMeasurementRecord } from './demo-dataset'
import { DEMO_PROFILE, DEMO_STORAGE_KEY } from './demo-profile'
import type { StorageUsage } from '../services/kbpdApi'

type DemoModeListener = (enabled: boolean) => void

class DemoService {
  private listeners: Set<DemoModeListener> = new Set()

  isDemoMode(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DEMO_STORAGE_KEY) === 'true'
  }

  enableDemoMode(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true')
    }
    this.notifyListeners(true)
  }

  disableDemoMode(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_STORAGE_KEY)
    }
    this.notifyListeners(false)
  }

  subscribe(listener: DemoModeListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(enabled: boolean) {
    for (const listener of this.listeners) {
      try {
        listener(enabled)
      } catch (err) {
        console.error('Error in demo mode listener:', err)
      }
    }
  }

  getProfile() {
    return DEMO_PROFILE
  }

  getMeasurements(): DemoMeasurementRecord[] {
    // Return a clone sorted by measured_at descending (latest first)
    return [...DEMO_MEASUREMENTS].sort(
      (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
    )
  }

  getMeasurementById(id: string): DemoMeasurementRecord | undefined {
    return DEMO_MEASUREMENTS.find(
      (m) => m.id === id || m.measurement_id === id
    )
  }

  getStorageUsage(): StorageUsage {
    return {
      userId: DEMO_PROFILE.profile_id,
      totalBytesUsed: 56 * 1024 * 1024,
      quotaBytes: 100 * 1024 * 1024,
      mediaFilesCount: 0,
      measurementsCount: DEMO_MEASUREMENTS.length,
    }
  }
}

export const demoService = new DemoService()
