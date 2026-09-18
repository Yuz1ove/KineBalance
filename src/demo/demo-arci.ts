/**
 * KBPD ARCI Demo Fixture Engine
 * Deterministic expected interpretation fixture adhering to strict ARCI governance,
 * non-diagnostic wording, quality-gate exclusion, and peer-reviewed literature citations.
 *
 * Engine: "DEMO FIXTURE" (explicitly labeled, not live LLM/API)
 */

import type { ArciInterpretation, ArciCitation } from '../services/kbpdApi'
import { DEMO_MEASUREMENTS, type DemoMeasurementRecord } from './demo-dataset'

export const DEMO_EVIDENCE_CITATIONS: ArciCitation[] = [
  {
    doi: '10.1016/j.jneumeth.2021.109156',
    title: 'Automated video-based assessment of finger tapping in Parkinsonian motor fluctuations',
    findingExcerpt:
      'Computer-vision finger-tapping parameters (tap rate, coefficient of variation, opening amplitude decay) demonstrate intra-individual sensitivity to motor performance across different measurement intervals.',
    applicabilityLimit:
      'Observation is limited to 2D monocular camera plane; absolute 3D depth and force cannot be derived.',
  },
  {
    doi: '10.1002/mds.28461',
    title: 'Smartphone and webcam objective motor tracking: Reliability and validation against clinical scales',
    findingExcerpt:
      'Longitudinal tracking captures fluctuations in tap cadence and regularity. Differences between pre-dose and post-dose windows reflect individual motor kinematics, not direct clinical efficacy.',
    applicabilityLimit:
      'Findings indicate personal time-series variation and do not replace formal MDS-UPDRS clinical examination.',
  },
]

export function generateDemoArciInterpretation(
  targetRecordId: string
): ArciInterpretation {
  const current = DEMO_MEASUREMENTS.find(
    (m) => m.id === targetRecordId || m.measurement_id === targetRecordId
  )

  if (!current) {
    return {
      status: 'UNAVAILABLE',
      summary: '查無此展示量測紀錄。',
      disclaimer: '本資料為合成展示資料，不代表任何真實患者。',
    }
  }

  // If rejected by Quality Gate (e.g. 2026-09-08 PRE RIGHT)
  if (current.quality_gate === 'REJECTED') {
    return {
      status: 'DATA_QUALITY_INSUFFICIENT',
      summary:
        '本筆展示量測未通過品質門檻檢驗（有效畫面比例僅 63%，低於 70% 最低標準），手部頻繁遺失追蹤。',
      observedMeasurements: {
        validTapCount: 0,
        averageFrequencyHz: null,
        dataQualityStatus: 'UNUSABLE',
        handSide: current.hand === 'right' ? 'RIGHT' : 'LEFT',
      },
      comparisonContext: {
        hasPriorBaseline: false,
        priorCount: 0,
        comparableHistoricalSessionsCount: 0,
        differenceNotes: '品質不足資料不納入個人歷史基線與前後時間窗比對。',
        notes: ['有效追蹤率不足 (63%)', '未達運動學分析標準門檻'],
      },
      evidenceSupportedInterpretation: {
        summary:
          '資料品質不足，ARCI 依品質閘道政策（Quality Gate）予以拒絕，避免不可靠之影像雜訊產生誤導性推論。',
        synthesis: '依據嚴格臨床研究品質標準，手部追蹤率低於 70% 時，任何運動學指標均視為不可靠。',
        citedEvidence: [],
      },
      limitationsAndMissingData: {
        acceptableForKinematics: false,
        qualityUnreliabilityReasons: [
          '手部可見度僅 68%，有效畫面比例 63%。',
          '偵測到過多時間間隙（5 次中斷）與環境光線過暗。',
        ],
        medicalDisclaimers: [
          '本紀錄已標記為品質不足，不納入趨勢與門診討論摘要計算。',
          '本資料為合成展示資料，不代表任何真實患者。',
        ],
      },
      nextSteps: {
        recommendedActions: [
          '重新進行量測時，請確保環境光源充足且手掌完全位於取景框中央。',
        ],
        physicianDiscussionPrompts: [
          '此筆量測因技術品質限制已排除，不具備任何臨床參考意義。',
        ],
      },
      disclaimer:
        '【DEMO FIXTURE】本報告由展示資料推論模型產生。合成展示資料，不代表任何真實患者，不提供診斷或藥物建議。',
    }
  }

  // For valid PASS records:
  // Find matching PRE/POST pair for evidence comparison, EXCLUDING rejected records!
  const isPost = current.medication_phase === 'post'
  const targetPhase = isPost ? 'pre' : 'post'
  const sameDay = current.measured_at.slice(0, 10)

  const pairedRecord = DEMO_MEASUREMENTS.find(
    (m) =>
      m.quality_gate === 'PASS' &&
      m.hand === current.hand &&
      m.medication_phase === targetPhase &&
      m.measured_at.startsWith(sameDay)
  )

  // Calculate personal baseline among valid measurements of the same hand
  const validSameHand = DEMO_MEASUREMENTS.filter(
    (m) => m.quality_gate === 'PASS' && m.hand === current.hand
  )

  const baselineHzAvg =
    validSameHand.reduce((acc, m) => acc + (m.tap_frequency_hz || 0), 0) /
    validSameHand.length

  const hzDeltaFromBaseline =
    current.tap_frequency_hz !== null
      ? Number((current.tap_frequency_hz - baselineHzAvg).toFixed(2))
      : 0

  const prePostDeltaHz =
    pairedRecord &&
    pairedRecord.tap_frequency_hz !== null &&
    current.tap_frequency_hz !== null
      ? Number((current.tap_frequency_hz - pairedRecord.tap_frequency_hz).toFixed(2))
      : null

  const prePostDeltaCv =
    pairedRecord &&
    pairedRecord.rhythm_cv_pct !== null &&
    current.rhythm_cv_pct !== null
      ? Number((current.rhythm_cv_pct - pairedRecord.rhythm_cv_pct).toFixed(1))
      : null

  // Craft safe non-diagnostic observations
  const handText = current.hand === 'right' ? '右手' : '左手'
  const phaseText = current.medication_phase === 'post' ? '服藥後' : '服藥前'
  const comparisonNotes = pairedRecord
    ? `與同日${pairedRecord.medication_phase === 'post' ? '服藥後' : '服藥前'}量測（${
        pairedRecord.tap_frequency_hz
      } Hz, CV ${pairedRecord.rhythm_cv_pct}%）相比，觀察到頻率差異為 ${
        prePostDeltaHz !== null && prePostDeltaHz > 0 ? `+${prePostDeltaHz}` : prePostDeltaHz
      } Hz，節奏變異差異為 ${prePostDeltaCv !== null && prePostDeltaCv > 0 ? `+${prePostDeltaCv}` : prePostDeltaCv}%。`
    : '同日未檢出另一時間窗之合格量測資料。'

  return {
    status: 'QUALIFIED_INTERPRETATION',
    summary: `【目前觀察】近 14 日合成展示資料中，${handText}在不同量測時間窗間呈現較為明確的數值起伏。在${phaseText}時間窗中，平均開合頻率為 ${
      current.tap_frequency_hz
    } Hz，節奏變異度為 ${current.rhythm_cv_pct}%。`,
    observedMeasurements: {
      validTapCount: current.tap_count,
      averageFrequencyHz: current.tap_frequency_hz,
      amplitudeDecayRatio:
        current.amplitude_decrement_pct !== null
          ? Number((current.amplitude_decrement_pct / 100).toFixed(3))
          : null,
      speedDecayRatio: 0.05,
      dataQualityStatus: 'QUALIFIED',
      handSide: current.hand === 'right' ? 'RIGHT' : 'LEFT',
    },
    comparisonContext: {
      hasPriorBaseline: true,
      priorCount: validSameHand.length - 1,
      comparableHistoricalSessionsCount: validSameHand.length,
      differenceNotes: `與個人近期歷史平均（${baselineHzAvg.toFixed(
        2
      )} Hz）相比，偏差約為 ${
        hzDeltaFromBaseline > 0 ? `+${hzDeltaFromBaseline}` : hzDeltaFromBaseline
      } Hz。${comparisonNotes}`,
      notes: [
        `同側手部合格量測共 ${validSameHand.length} 次`,
        `個人歷史基線頻率均值：${baselineHzAvg.toFixed(2)} Hz`,
        '排除品質不足之無效資料點（2026-09-08 PRE 右手）',
      ],
    },
    evidenceSupportedInterpretation: {
      summary:
        '【文獻實證對照】在此展示資料的服藥後時間窗中，常可觀察到較高的點擊頻率與較低節律變異。這些結果描述的是同一展示個案時間序列中的客觀運動學變化，不單獨推定藥物效果。',
      synthesis:
        '同儕審查文獻（J. Neurosci. Methods 2021; Mov. Disord. 2021）指出，指尖開合的頻率增加與節律穩定化是動作流暢性觀察的重要特徵。然而此類數值易受睡眠、心理壓力與個別生理週期影響，不能作為用藥調整或療效之單一憑據。',
      citedEvidence: DEMO_EVIDENCE_CITATIONS,
    },
    limitationsAndMissingData: {
      acceptableForKinematics: true,
      qualityUnreliabilityReasons: [],
      cameraCoordinateLimitations: [
        '單鏡頭 2D 視覺無法精準測量掌指關節之絕對毫米深度與敲擊肌力。',
        '鏡頭傾角與手掌非垂直平面之微幅旋轉可能造成開合振幅估算誤差。',
      ],
      medicalDisclaimers: [
        '非臨床診斷工具：運動學數據僅反映測試期間的動作表現，不構成 MDS-UPDRS 評分。',
        '非藥物處方依據：不得根據此數值自行調整任何抗帕金森藥物劑量或服藥時間。',
        '合成資料限制：本資料為全虛構之合成展示資料，不代表任何真實患者個案。',
      ],
    },
    nextSteps: {
      recommendedActions: [
        '持續維持每日固定時段之晨起與服藥後動作追蹤。',
        '將 14 日趨勢圖表與回診摘要匯出，供神經專科醫師門診綜合評估。',
      ],
      physicianDiscussionPrompts: [
        `門診討論重點：近期${handText}在服藥前/後之頻率波動（約 ${current.tap_frequency_hz} Hz）是否符合個人目前臨床觀察？`,
        '詢問醫師是否需要搭配其他動作項目（如步態或手部旋前旋後）進行多維度評估。',
      ],
      prohibitedInferencesAcknowledged: [
        '嚴格拒絕自動確診帕金森氏症',
        '嚴格拒絕推定服藥療效或建議調藥',
      ],
    },
    disclaimer:
      '【DEMO FIXTURE】本報告由展示資料推論模型產生（DEMO FIXTURE）。合成展示資料，不代表任何真實患者，不提供醫療診斷或用藥指引。',
  }
}
