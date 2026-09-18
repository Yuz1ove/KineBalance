/**
 * KBPD Demo Profile Definition
 * Synthetic Demo Profile (DEMO-001)
 */

export interface DemoProfile {
  profile_id: string
  name: string
  type: string
  dateRange: {
    start: string
    end: string
    totalDays: number
  }
  source: 'synthetic_demo'
  isDemo: true
}

export const DEMO_PROFILE: DemoProfile = {
  profile_id: 'DEMO-001',
  name: '展示個案 A',
  type: 'Synthetic Demo Profile',
  dateRange: {
    start: '2026-09-04',
    end: '2026-09-17',
    totalDays: 14,
  },
  source: 'synthetic_demo',
  isDemo: true,
}

export const DEMO_SEED = 'KBPD-DEMO-001-V1'
export const DEMO_STORAGE_KEY = 'kbpd_demo_mode'
