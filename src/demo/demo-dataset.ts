/**
 * KBPD Deterministic Demo Dataset
 * Seed: "KBPD-DEMO-001-V1"
 * Profile: DEMO-001 (展示個案 A)
 * 
 * Exactly 56 measurements across 14 days (2026-09-04 to 2026-09-17)
 * 55 PASS, 1 REJECTED (2026-09-08 AM PRE RIGHT)
 */

import type { MeasurementRecord } from '../services/kbpdApi'

export interface DemoMeasurementRecord extends MeasurementRecord {
  measurement_id: string
  profile_id: string
  measured_at: string
  hand: 'left' | 'right'
  task: 'finger_tapping'
  duration_sec: number
  medication_phase: 'pre' | 'post'
  minutes_from_medication?: number
  tap_frequency_hz: number | null
  tap_count: number
  rhythm_cv_pct: number | null
  amplitude_decrement_pct: number | null
  interruption_count: number
  tracking_quality: {
    valid_frame_ratio: number
    hand_visibility: number
    lighting: string
    confidence: number
  }
  quality_gate: 'PASS' | 'REJECTED'
  rejection_reason?: string
  context: {
    sleep_hours: number
    fatigue: number
    stress: number
    note?: string
  }
  source: 'synthetic_demo'
  demo_version: string
  is_demo: true
}

export const DEMO_MEASUREMENTS: DemoMeasurementRecord[] = [
  {
    "id": "DEMO-001-20260904-AM-PRE-R",
    "measurement_id": "DEMO-001-20260904-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-04T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260904-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-04T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.76,
    "tap_count": 55,
    "rhythm_cv_pct": 18.2,
    "amplitude_decrement_pct": 13.5,
    "interruption_count": 3,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.2,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260904-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 55,
        "averageFrequencyHz": 2.76,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.182,
        "amplitudeDecayRatio": 0.135,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 3,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260904-AM-PRE-L",
    "measurement_id": "DEMO-001-20260904-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-04T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260904-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-04T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.24,
    "tap_count": 65,
    "rhythm_cv_pct": 11.8,
    "amplitude_decrement_pct": 8.8,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.2,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260904-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 65,
        "averageFrequencyHz": 3.24,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.118,
        "amplitudeDecayRatio": 0.088,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260904-AM-POST-L",
    "measurement_id": "DEMO-001-20260904-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-04T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260904-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-04T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 62,
    "tap_frequency_hz": 3.48,
    "tap_count": 70,
    "rhythm_cv_pct": 9.4,
    "amplitude_decrement_pct": 6.2,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.2,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 62 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260904-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 70,
        "averageFrequencyHz": 3.48,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.094,
        "amplitudeDecayRatio": 0.062,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260904-AM-POST-R",
    "measurement_id": "DEMO-001-20260904-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-04T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260904-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-04T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 65,
    "tap_frequency_hz": 3.36,
    "tap_count": 67,
    "rhythm_cv_pct": 12.1,
    "amplitude_decrement_pct": 7.9,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.2,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 65 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260904-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 67,
        "averageFrequencyHz": 3.36,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.121,
        "amplitudeDecayRatio": 0.079,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260905-AM-PRE-R",
    "measurement_id": "DEMO-001-20260905-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-05T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260905-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-05T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.71,
    "tap_count": 54,
    "rhythm_cv_pct": 19.4,
    "amplitude_decrement_pct": 14.8,
    "interruption_count": 3,
    "tracking_quality": {
      "valid_frame_ratio": 0.97,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.94
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.8,
      "fatigue": 1,
      "stress": 2,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260905-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 54,
        "averageFrequencyHz": 2.71,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.194,
        "amplitudeDecayRatio": 0.148,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 582,
        "effectiveTrackingRatio": 0.97,
        "timeGapsCount": 0,
        "trackingLostCount": 3,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260905-AM-PRE-L",
    "measurement_id": "DEMO-001-20260905-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-05T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260905-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-05T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.18,
    "tap_count": 63,
    "rhythm_cv_pct": 12.5,
    "amplitude_decrement_pct": 9.4,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.8,
      "fatigue": 1,
      "stress": 2,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260905-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 63,
        "averageFrequencyHz": 3.18,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.125,
        "amplitudeDecayRatio": 0.094,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260905-AM-POST-L",
    "measurement_id": "DEMO-001-20260905-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-05T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260905-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-05T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 58,
    "tap_frequency_hz": 3.42,
    "tap_count": 68,
    "rhythm_cv_pct": 10.1,
    "amplitude_decrement_pct": 6.9,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.8,
      "fatigue": 0,
      "stress": 2,
      "note": "服藥後約 58 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260905-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 68,
        "averageFrequencyHz": 3.42,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.101,
        "amplitudeDecayRatio": 0.069,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260905-AM-POST-R",
    "measurement_id": "DEMO-001-20260905-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-05T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260905-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-05T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 64,
    "tap_frequency_hz": 3.3,
    "tap_count": 66,
    "rhythm_cv_pct": 12.8,
    "amplitude_decrement_pct": 8.6,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "good",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.8,
      "fatigue": 0,
      "stress": 2,
      "note": "服藥後約 64 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260905-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 66,
        "averageFrequencyHz": 3.3,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.128,
        "amplitudeDecayRatio": 0.086,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2
      }
    }
  },
  {
    "id": "DEMO-001-20260906-AM-PRE-R",
    "measurement_id": "DEMO-001-20260906-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-06T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260906-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-06T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.82,
    "tap_count": 56,
    "rhythm_cv_pct": 17.5,
    "amplitude_decrement_pct": 12.8,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.5,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260906-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 56,
        "averageFrequencyHz": 2.82,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.175,
        "amplitudeDecayRatio": 0.128,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 2,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260906-AM-PRE-L",
    "measurement_id": "DEMO-001-20260906-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-06T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260906-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-06T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.32,
    "tap_count": 66,
    "rhythm_cv_pct": 11.2,
    "amplitude_decrement_pct": 8.1,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.5,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260906-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 66,
        "averageFrequencyHz": 3.32,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.112,
        "amplitudeDecayRatio": 0.081,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260906-AM-POST-L",
    "measurement_id": "DEMO-001-20260906-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-06T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260906-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-06T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 70,
    "tap_frequency_hz": 3.56,
    "tap_count": 71,
    "rhythm_cv_pct": 8.8,
    "amplitude_decrement_pct": 5.8,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.98
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.5,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 70 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260906-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 71,
        "averageFrequencyHz": 3.56,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.088,
        "amplitudeDecayRatio": 0.058,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260906-AM-POST-R",
    "measurement_id": "DEMO-001-20260906-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-06T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260906-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-06T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 72,
    "tap_frequency_hz": 3.45,
    "tap_count": 69,
    "rhythm_cv_pct": 11,
    "amplitude_decrement_pct": 7.1,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.5,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 72 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260906-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 69,
        "averageFrequencyHz": 3.45,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.11,
        "amplitudeDecayRatio": 0.071,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260907-AM-PRE-R",
    "measurement_id": "DEMO-001-20260907-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-07T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260907-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-07T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.68,
    "tap_count": 53,
    "rhythm_cv_pct": 20.1,
    "amplitude_decrement_pct": 15.6,
    "interruption_count": 4,
    "tracking_quality": {
      "valid_frame_ratio": 0.96,
      "hand_visibility": 0.97,
      "lighting": "adequate",
      "confidence": 0.93
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.5,
      "fatigue": 2,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260907-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 53,
        "averageFrequencyHz": 2.68,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.201,
        "amplitudeDecayRatio": 0.156,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 576,
        "effectiveTrackingRatio": 0.96,
        "timeGapsCount": 0,
        "trackingLostCount": 4,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260907-AM-PRE-L",
    "measurement_id": "DEMO-001-20260907-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-07T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260907-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-07T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.15,
    "tap_count": 63,
    "rhythm_cv_pct": 13,
    "amplitude_decrement_pct": 9.8,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.94
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.5,
      "fatigue": 2,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260907-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 63,
        "averageFrequencyHz": 3.15,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.13,
        "amplitudeDecayRatio": 0.098,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2
      }
    }
  },
  {
    "id": "DEMO-001-20260907-AM-POST-L",
    "measurement_id": "DEMO-001-20260907-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-07T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260907-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-07T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 60,
    "tap_frequency_hz": 3.38,
    "tap_count": 67,
    "rhythm_cv_pct": 10.6,
    "amplitude_decrement_pct": 7.4,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.5,
      "fatigue": 1,
      "stress": 1,
      "note": "服藥後約 60 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260907-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 67,
        "averageFrequencyHz": 3.38,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.106,
        "amplitudeDecayRatio": 0.074,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260907-AM-POST-R",
    "measurement_id": "DEMO-001-20260907-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-07T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260907-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-07T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 66,
    "tap_frequency_hz": 3.28,
    "tap_count": 65,
    "rhythm_cv_pct": 13.4,
    "amplitude_decrement_pct": 9.2,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "good",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.5,
      "fatigue": 1,
      "stress": 1,
      "note": "服藥後約 66 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260907-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 65,
        "averageFrequencyHz": 3.28,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.134,
        "amplitudeDecayRatio": 0.092,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2
      }
    }
  },
  {
    "id": "DEMO-001-20260908-AM-PRE-R",
    "measurement_id": "DEMO-001-20260908-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-08T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260908-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "REJECTED",
      "createdAt": "2026-09-08T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": null,
    "tap_count": 0,
    "rhythm_cv_pct": null,
    "amplitude_decrement_pct": null,
    "interruption_count": 8,
    "tracking_quality": {
      "valid_frame_ratio": 0.63,
      "hand_visibility": 0.68,
      "lighting": "low",
      "confidence": 0.54
    },
    "quality_gate": "REJECTED",
    "rejection_reason": "INSUFFICIENT_TRACKING_QUALITY",
    "context": {
      "sleep_hours": 5.8,
      "fatigue": 2,
      "stress": 2,
      "note": "光線不足且手部頻繁移出追蹤畫面"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260908-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 0,
        "averageFrequencyHz": null,
        "averageOpeningAmplitudeNorm": null,
        "intervalVariabilityCv": null,
        "amplitudeDecayRatio": null,
        "speedDecayRatio": null
      },
      "quality": {
        "status": "UNUSABLE",
        "totalFrames": 600,
        "trackedFrames": 378,
        "effectiveTrackingRatio": 0.63,
        "timeGapsCount": 5,
        "trackingLostCount": 8,
        "reasons": [
          "INSUFFICIENT_TRACKING_QUALITY"
        ]
      }
    }
  },
  {
    "id": "DEMO-001-20260908-AM-PRE-L",
    "measurement_id": "DEMO-001-20260908-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-08T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260908-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-08T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.2,
    "tap_count": 64,
    "rhythm_cv_pct": 12.2,
    "amplitude_decrement_pct": 9,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.97,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.94
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.8,
      "fatigue": 2,
      "stress": 2,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260908-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 64,
        "averageFrequencyHz": 3.2,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.122,
        "amplitudeDecayRatio": 0.09,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 582,
        "effectiveTrackingRatio": 0.97,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260908-AM-POST-L",
    "measurement_id": "DEMO-001-20260908-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-08T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260908-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-08T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 64,
    "tap_frequency_hz": 3.44,
    "tap_count": 69,
    "rhythm_cv_pct": 9.8,
    "amplitude_decrement_pct": 6.5,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.8,
      "fatigue": 1,
      "stress": 2,
      "note": "服藥後約 64 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260908-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 69,
        "averageFrequencyHz": 3.44,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.098,
        "amplitudeDecayRatio": 0.065,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260908-AM-POST-R",
    "measurement_id": "DEMO-001-20260908-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-08T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260908-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-08T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 67,
    "tap_frequency_hz": 3.34,
    "tap_count": 66,
    "rhythm_cv_pct": 12.3,
    "amplitude_decrement_pct": 8.2,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.8,
      "fatigue": 1,
      "stress": 2,
      "note": "服藥後約 67 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260908-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 66,
        "averageFrequencyHz": 3.34,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.123,
        "amplitudeDecayRatio": 0.082,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260909-AM-PRE-R",
    "measurement_id": "DEMO-001-20260909-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-09T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260909-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-09T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.79,
    "tap_count": 55,
    "rhythm_cv_pct": 18,
    "amplitude_decrement_pct": 13.8,
    "interruption_count": 3,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260909-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 55,
        "averageFrequencyHz": 2.79,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.18,
        "amplitudeDecayRatio": 0.138,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 3,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260909-AM-PRE-L",
    "measurement_id": "DEMO-001-20260909-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-09T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260909-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-09T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.28,
    "tap_count": 65,
    "rhythm_cv_pct": 11.5,
    "amplitude_decrement_pct": 8.5,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260909-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 65,
        "averageFrequencyHz": 3.28,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.115,
        "amplitudeDecayRatio": 0.085,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260909-AM-POST-L",
    "measurement_id": "DEMO-001-20260909-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-09T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260909-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-09T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 65,
    "tap_frequency_hz": 3.5,
    "tap_count": 70,
    "rhythm_cv_pct": 9.2,
    "amplitude_decrement_pct": 6,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 65 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260909-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 70,
        "averageFrequencyHz": 3.5,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.092,
        "amplitudeDecayRatio": 0.06,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260909-AM-POST-R",
    "measurement_id": "DEMO-001-20260909-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-09T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260909-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-09T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 68,
    "tap_frequency_hz": 3.4,
    "tap_count": 68,
    "rhythm_cv_pct": 11.5,
    "amplitude_decrement_pct": 7.5,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 68 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260909-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 68,
        "averageFrequencyHz": 3.4,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.115,
        "amplitudeDecayRatio": 0.075,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260910-AM-PRE-R",
    "measurement_id": "DEMO-001-20260910-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-10T07:42:00+08:00",
    "session": {
      "id": "DEMO-001-20260910-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-10T07:42:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.84,
    "tap_count": 57,
    "rhythm_cv_pct": 18.6,
    "amplitude_decrement_pct": 13.2,
    "interruption_count": 3,
    "tracking_quality": {
      "valid_frame_ratio": 0.97,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.94
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.4,
      "fatigue": 2,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260910-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 57,
        "averageFrequencyHz": 2.84,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.186,
        "amplitudeDecayRatio": 0.132,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 582,
        "effectiveTrackingRatio": 0.97,
        "timeGapsCount": 0,
        "trackingLostCount": 3,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260910-AM-PRE-L",
    "measurement_id": "DEMO-001-20260910-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-10T07:55:00+08:00",
    "session": {
      "id": "DEMO-001-20260910-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-10T07:55:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.26,
    "tap_count": 65,
    "rhythm_cv_pct": 11.9,
    "amplitude_decrement_pct": 8.6,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.4,
      "fatigue": 2,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260910-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 65,
        "averageFrequencyHz": 3.26,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.119,
        "amplitudeDecayRatio": 0.086,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260910-AM-POST-L",
    "measurement_id": "DEMO-001-20260910-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-10T08:55:00+08:00",
    "session": {
      "id": "DEMO-001-20260910-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-10T08:55:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 62,
    "tap_frequency_hz": 3.52,
    "tap_count": 70,
    "rhythm_cv_pct": 9.1,
    "amplitude_decrement_pct": 5.9,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.4,
      "fatigue": 1,
      "stress": 1,
      "note": "服藥後約 62 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260910-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 70,
        "averageFrequencyHz": 3.52,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.091,
        "amplitudeDecayRatio": 0.059,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260910-AM-POST-R",
    "measurement_id": "DEMO-001-20260910-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-10T09:03:00+08:00",
    "session": {
      "id": "DEMO-001-20260910-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-10T09:03:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 66,
    "tap_frequency_hz": 3.42,
    "tap_count": 68,
    "rhythm_cv_pct": 11.3,
    "amplitude_decrement_pct": 6.8,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.4,
      "fatigue": 1,
      "stress": 1,
      "note": "服藥後約 66 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260910-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 68,
        "averageFrequencyHz": 3.42,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.113,
        "amplitudeDecayRatio": 0.068,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260911-AM-PRE-R",
    "measurement_id": "DEMO-001-20260911-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-11T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260911-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-11T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.86,
    "tap_count": 57,
    "rhythm_cv_pct": 17.2,
    "amplitude_decrement_pct": 12.5,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.3,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260911-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 57,
        "averageFrequencyHz": 2.86,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.172,
        "amplitudeDecayRatio": 0.125,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260911-AM-PRE-L",
    "measurement_id": "DEMO-001-20260911-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-11T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260911-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-11T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.35,
    "tap_count": 67,
    "rhythm_cv_pct": 10.8,
    "amplitude_decrement_pct": 7.8,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.3,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260911-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 67,
        "averageFrequencyHz": 3.35,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.108,
        "amplitudeDecayRatio": 0.078,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260911-AM-POST-L",
    "measurement_id": "DEMO-001-20260911-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-11T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260911-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-11T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 71,
    "tap_frequency_hz": 3.6,
    "tap_count": 72,
    "rhythm_cv_pct": 8.5,
    "amplitude_decrement_pct": 5.5,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 1,
      "lighting": "good",
      "confidence": 0.98
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.3,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 71 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260911-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 72,
        "averageFrequencyHz": 3.6,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.085,
        "amplitudeDecayRatio": 0.055,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260911-AM-POST-R",
    "measurement_id": "DEMO-001-20260911-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-11T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260911-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-11T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 73,
    "tap_frequency_hz": 3.46,
    "tap_count": 69,
    "rhythm_cv_pct": 10.9,
    "amplitude_decrement_pct": 6.9,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.3,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 73 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260911-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 69,
        "averageFrequencyHz": 3.46,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.109,
        "amplitudeDecayRatio": 0.069,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260912-AM-PRE-R",
    "measurement_id": "DEMO-001-20260912-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-12T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260912-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-12T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.66,
    "tap_count": 53,
    "rhythm_cv_pct": 21.2,
    "amplitude_decrement_pct": 16.4,
    "interruption_count": 4,
    "tracking_quality": {
      "valid_frame_ratio": 0.96,
      "hand_visibility": 0.97,
      "lighting": "adequate",
      "confidence": 0.92
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.2,
      "fatigue": 3,
      "stress": 2,
      "note": "睡眠較短，稍感疲累"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260912-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 53,
        "averageFrequencyHz": 2.66,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.212,
        "amplitudeDecayRatio": 0.164,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 576,
        "effectiveTrackingRatio": 0.96,
        "timeGapsCount": 0,
        "trackingLostCount": 4,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260912-AM-PRE-L",
    "measurement_id": "DEMO-001-20260912-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-12T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260912-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-12T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.12,
    "tap_count": 62,
    "rhythm_cv_pct": 13.6,
    "amplitude_decrement_pct": 10.4,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.97,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.94
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.2,
      "fatigue": 3,
      "stress": 2,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260912-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 62,
        "averageFrequencyHz": 3.12,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.136,
        "amplitudeDecayRatio": 0.104,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 582,
        "effectiveTrackingRatio": 0.97,
        "timeGapsCount": 0,
        "trackingLostCount": 2
      }
    }
  },
  {
    "id": "DEMO-001-20260912-AM-POST-L",
    "measurement_id": "DEMO-001-20260912-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-12T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260912-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-12T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 55,
    "tap_frequency_hz": 3.32,
    "tap_count": 66,
    "rhythm_cv_pct": 11.2,
    "amplitude_decrement_pct": 7.8,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.2,
      "fatigue": 2,
      "stress": 2,
      "note": "服藥後約 55 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260912-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 66,
        "averageFrequencyHz": 3.32,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.112,
        "amplitudeDecayRatio": 0.078,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260912-AM-POST-R",
    "measurement_id": "DEMO-001-20260912-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-12T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260912-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-12T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 60,
    "tap_frequency_hz": 3.22,
    "tap_count": 64,
    "rhythm_cv_pct": 13.8,
    "amplitude_decrement_pct": 9.6,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "good",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 5.2,
      "fatigue": 2,
      "stress": 2,
      "note": "服藥後約 60 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260912-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 64,
        "averageFrequencyHz": 3.22,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.138,
        "amplitudeDecayRatio": 0.096,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2
      }
    }
  },
  {
    "id": "DEMO-001-20260913-AM-PRE-R",
    "measurement_id": "DEMO-001-20260913-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-13T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260913-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-13T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.88,
    "tap_count": 58,
    "rhythm_cv_pct": 16.8,
    "amplitude_decrement_pct": 12.1,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.8,
      "fatigue": 1,
      "stress": 0,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260913-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 58,
        "averageFrequencyHz": 2.88,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.168,
        "amplitudeDecayRatio": 0.121,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 2,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260913-AM-PRE-L",
    "measurement_id": "DEMO-001-20260913-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-13T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260913-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-13T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.38,
    "tap_count": 67,
    "rhythm_cv_pct": 10.4,
    "amplitude_decrement_pct": 7.5,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.8,
      "fatigue": 1,
      "stress": 0,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260913-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 67,
        "averageFrequencyHz": 3.38,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.104,
        "amplitudeDecayRatio": 0.075,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260913-AM-POST-L",
    "measurement_id": "DEMO-001-20260913-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-13T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260913-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-13T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 68,
    "tap_frequency_hz": 3.64,
    "tap_count": 73,
    "rhythm_cv_pct": 8.1,
    "amplitude_decrement_pct": 5.2,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 1,
      "lighting": "good",
      "confidence": 0.98
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.8,
      "fatigue": 0,
      "stress": 0,
      "note": "服藥後約 68 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260913-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 73,
        "averageFrequencyHz": 3.64,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.081,
        "amplitudeDecayRatio": 0.052,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260913-AM-POST-R",
    "measurement_id": "DEMO-001-20260913-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-13T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260913-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-13T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 70,
    "tap_frequency_hz": 3.52,
    "tap_count": 70,
    "rhythm_cv_pct": 10.4,
    "amplitude_decrement_pct": 6.5,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.8,
      "fatigue": 0,
      "stress": 0,
      "note": "服藥後約 70 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260913-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 70,
        "averageFrequencyHz": 3.52,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.104,
        "amplitudeDecayRatio": 0.065,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260914-AM-PRE-R",
    "measurement_id": "DEMO-001-20260914-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-14T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260914-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-14T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.81,
    "tap_count": 56,
    "rhythm_cv_pct": 17.9,
    "amplitude_decrement_pct": 13.4,
    "interruption_count": 3,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.1,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260914-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 56,
        "averageFrequencyHz": 2.81,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.179,
        "amplitudeDecayRatio": 0.134,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 3,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260914-AM-PRE-L",
    "measurement_id": "DEMO-001-20260914-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-14T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260914-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-14T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.3,
    "tap_count": 66,
    "rhythm_cv_pct": 11.4,
    "amplitude_decrement_pct": 8.3,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.1,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260914-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 66,
        "averageFrequencyHz": 3.3,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.114,
        "amplitudeDecayRatio": 0.083,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260914-AM-POST-L",
    "measurement_id": "DEMO-001-20260914-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-14T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260914-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-14T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 63,
    "tap_frequency_hz": 3.54,
    "tap_count": 71,
    "rhythm_cv_pct": 8.9,
    "amplitude_decrement_pct": 5.9,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.1,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 63 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260914-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 71,
        "averageFrequencyHz": 3.54,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.089,
        "amplitudeDecayRatio": 0.059,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260914-AM-POST-R",
    "measurement_id": "DEMO-001-20260914-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-14T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260914-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-14T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 66,
    "tap_frequency_hz": 3.44,
    "tap_count": 69,
    "rhythm_cv_pct": 11.1,
    "amplitude_decrement_pct": 7,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.1,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 66 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260914-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 69,
        "averageFrequencyHz": 3.44,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.111,
        "amplitudeDecayRatio": 0.07,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260915-AM-PRE-R",
    "measurement_id": "DEMO-001-20260915-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-15T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260915-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-15T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.78,
    "tap_count": 55,
    "rhythm_cv_pct": 18.4,
    "amplitude_decrement_pct": 13.9,
    "interruption_count": 3,
    "tracking_quality": {
      "valid_frame_ratio": 0.97,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.94
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.9,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260915-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 55,
        "averageFrequencyHz": 2.78,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.184,
        "amplitudeDecayRatio": 0.139,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 582,
        "effectiveTrackingRatio": 0.97,
        "timeGapsCount": 0,
        "trackingLostCount": 3,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260915-AM-PRE-L",
    "measurement_id": "DEMO-001-20260915-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-15T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260915-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-15T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.25,
    "tap_count": 65,
    "rhythm_cv_pct": 12,
    "amplitude_decrement_pct": 8.7,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.9,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260915-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 65,
        "averageFrequencyHz": 3.25,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.12,
        "amplitudeDecayRatio": 0.087,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260915-AM-POST-L",
    "measurement_id": "DEMO-001-20260915-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-15T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260915-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-15T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 65,
    "tap_frequency_hz": 3.49,
    "tap_count": 70,
    "rhythm_cv_pct": 9.3,
    "amplitude_decrement_pct": 6.1,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.9,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 65 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260915-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 70,
        "averageFrequencyHz": 3.49,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.093,
        "amplitudeDecayRatio": 0.061,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260915-AM-POST-R",
    "measurement_id": "DEMO-001-20260915-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-15T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260915-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-15T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 69,
    "tap_frequency_hz": 3.38,
    "tap_count": 67,
    "rhythm_cv_pct": 11.8,
    "amplitude_decrement_pct": 7.6,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 6.9,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 69 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260915-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 67,
        "averageFrequencyHz": 3.38,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.118,
        "amplitudeDecayRatio": 0.076,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260916-AM-PRE-R",
    "measurement_id": "DEMO-001-20260916-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-16T07:35:00+08:00",
    "session": {
      "id": "DEMO-001-20260916-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-16T07:35:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.85,
    "tap_count": 57,
    "rhythm_cv_pct": 17.1,
    "amplitude_decrement_pct": 12.9,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.4,
      "fatigue": 1,
      "stress": 0,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260916-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 57,
        "averageFrequencyHz": 2.85,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.171,
        "amplitudeDecayRatio": 0.129,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260916-AM-PRE-L",
    "measurement_id": "DEMO-001-20260916-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-16T07:48:00+08:00",
    "session": {
      "id": "DEMO-001-20260916-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-16T07:48:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.36,
    "tap_count": 67,
    "rhythm_cv_pct": 10.6,
    "amplitude_decrement_pct": 7.6,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.4,
      "fatigue": 1,
      "stress": 0,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260916-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 67,
        "averageFrequencyHz": 3.36,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.106,
        "amplitudeDecayRatio": 0.076,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260916-AM-POST-L",
    "measurement_id": "DEMO-001-20260916-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-16T08:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260916-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-16T08:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 67,
    "tap_frequency_hz": 3.62,
    "tap_count": 72,
    "rhythm_cv_pct": 8.3,
    "amplitude_decrement_pct": 5.4,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 1,
      "lighting": "good",
      "confidence": 0.98
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.4,
      "fatigue": 0,
      "stress": 0,
      "note": "服藥後約 67 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260916-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 72,
        "averageFrequencyHz": 3.62,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.083,
        "amplitudeDecayRatio": 0.054,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260916-AM-POST-R",
    "measurement_id": "DEMO-001-20260916-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-16T09:05:00+08:00",
    "session": {
      "id": "DEMO-001-20260916-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-16T09:05:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 70,
    "tap_frequency_hz": 3.5,
    "tap_count": 70,
    "rhythm_cv_pct": 10.6,
    "amplitude_decrement_pct": 6.6,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7.4,
      "fatigue": 0,
      "stress": 0,
      "note": "服藥後約 70 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260916-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 70,
        "averageFrequencyHz": 3.5,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.106,
        "amplitudeDecayRatio": 0.066,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260917-AM-PRE-R",
    "measurement_id": "DEMO-001-20260917-AM-PRE-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-17T07:40:00+08:00",
    "session": {
      "id": "DEMO-001-20260917-AM-PRE-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-17T07:40:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 2.83,
    "tap_count": 56,
    "rhythm_cv_pct": 17.6,
    "amplitude_decrement_pct": 13.1,
    "interruption_count": 2,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.98,
      "lighting": "adequate",
      "confidence": 0.95
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260917-AM-PRE-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 56,
        "averageFrequencyHz": 2.83,
        "averageOpeningAmplitudeNorm": 0.82,
        "intervalVariabilityCv": 0.176,
        "amplitudeDecayRatio": 0.131,
        "speedDecayRatio": 0.08
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 2,
        "reasons": []
      }
    }
  },
  {
    "id": "DEMO-001-20260917-AM-PRE-L",
    "measurement_id": "DEMO-001-20260917-AM-PRE-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-17T07:52:00+08:00",
    "session": {
      "id": "DEMO-001-20260917-AM-PRE-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-17T07:52:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "pre",
    "tap_frequency_hz": 3.31,
    "tap_count": 66,
    "rhythm_cv_pct": 11.1,
    "amplitude_decrement_pct": 8.2,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "adequate",
      "confidence": 0.96
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 1,
      "stress": 1,
      "note": "晨起常規量測（服藥前）"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260917-AM-PRE-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 66,
        "averageFrequencyHz": 3.31,
        "averageOpeningAmplitudeNorm": 0.85,
        "intervalVariabilityCv": 0.111,
        "amplitudeDecayRatio": 0.082,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  },
  {
    "id": "DEMO-001-20260917-AM-POST-L",
    "measurement_id": "DEMO-001-20260917-AM-POST-L",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-17T08:58:00+08:00",
    "session": {
      "id": "DEMO-001-20260917-AM-POST-L",
      "ownerUserId": "DEMO-001",
      "handSide": "LEFT",
      "status": "COMPLETED",
      "createdAt": "2026-09-17T08:58:00+08:00"
    },
    "hand": "left",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 64,
    "tap_frequency_hz": 3.58,
    "tap_count": 71,
    "rhythm_cv_pct": 8.6,
    "amplitude_decrement_pct": 5.6,
    "interruption_count": 0,
    "tracking_quality": {
      "valid_frame_ratio": 0.99,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 64 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260917-AM-POST-L",
      "handSide": "LEFT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 71,
        "averageFrequencyHz": 3.58,
        "averageOpeningAmplitudeNorm": 0.88,
        "intervalVariabilityCv": 0.086,
        "amplitudeDecayRatio": 0.056,
        "speedDecayRatio": 0.04
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 594,
        "effectiveTrackingRatio": 0.99,
        "timeGapsCount": 0,
        "trackingLostCount": 0
      }
    }
  },
  {
    "id": "DEMO-001-20260917-AM-POST-R",
    "measurement_id": "DEMO-001-20260917-AM-POST-R",
    "ownerUserId": "DEMO-001",
    "profile_id": "DEMO-001",
    "measured_at": "2026-09-17T09:08:00+08:00",
    "session": {
      "id": "DEMO-001-20260917-AM-POST-R",
      "ownerUserId": "DEMO-001",
      "handSide": "RIGHT",
      "status": "COMPLETED",
      "createdAt": "2026-09-17T09:08:00+08:00"
    },
    "hand": "right",
    "task": "finger_tapping",
    "duration_sec": 20,
    "medication_phase": "post",
    "minutes_from_medication": 68,
    "tap_frequency_hz": 3.48,
    "tap_count": 69,
    "rhythm_cv_pct": 10.8,
    "amplitude_decrement_pct": 6.2,
    "interruption_count": 1,
    "tracking_quality": {
      "valid_frame_ratio": 0.98,
      "hand_visibility": 0.99,
      "lighting": "good",
      "confidence": 0.97
    },
    "quality_gate": "PASS",
    "context": {
      "sleep_hours": 7,
      "fatigue": 0,
      "stress": 1,
      "note": "服藥後約 68 分鐘追蹤"
    },
    "source": "synthetic_demo",
    "demo_version": "KBPD-DEMO-001-V1",
    "is_demo": true,
    "analysis": {
      "sessionId": "DEMO-001-20260917-AM-POST-R",
      "handSide": "RIGHT",
      "algorithmVersion": "KBPD-FT-1.0",
      "metrics": {
        "validTapCount": 69,
        "averageFrequencyHz": 3.48,
        "averageOpeningAmplitudeNorm": 0.86,
        "intervalVariabilityCv": 0.108,
        "amplitudeDecayRatio": 0.062,
        "speedDecayRatio": 0.05
      },
      "quality": {
        "status": "QUALIFIED",
        "totalFrames": 600,
        "trackedFrames": 588,
        "effectiveTrackingRatio": 0.98,
        "timeGapsCount": 0,
        "trackingLostCount": 1
      }
    }
  }
]
