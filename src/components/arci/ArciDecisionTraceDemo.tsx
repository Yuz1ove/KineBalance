import React, { useState } from 'react'
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  BookOpen,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'

export const ArciDecisionTraceDemo: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)

  const steps = [
    { id: 'step-1', label: '1. Input received', desc: '接收 600 幀 30fps 手部關節序列與時序戳記' },
    { id: 'step-2', label: '2. Identity matched', desc: '驗證本機匿名身分權杖，核對資料擁有權' },
    { id: 'step-3', label: '3. Measurement validated', desc: '有效追蹤率達 97.5%，無重大時間缺口 (>400ms)' },
    { id: 'step-4', label: '4. Evidence retrieved', desc: '檢索 Frontiers 2021 (DOI: 10.3389/fneur.2021.742654) Webcam 基準' },
    { id: 'step-5', label: '5. Constraint checked', desc: '啟動邊界防禦：攔截自動確診與調藥建議，鎖定研究觀察' },
    { id: 'step-6', label: '6. Interpretation generated', desc: '生成五段式受限解讀，對比同服藥時間歷史基線' },
    { id: 'step-7', label: '7. Trace saved', desc: '封存不可篡改之 SHA-256 驗證收據與執行審計鏈' },
  ]

  const handleStartInspection = () => {
    if (isRunning) return
    setIsRunning(true)
    setIsCompleted(false)
    setCurrentStepIndex(0)

    let step = 0
    const interval = setInterval(() => {
      step += 1
      if (step < steps.length) {
        setCurrentStepIndex(step)
      } else {
        clearInterval(interval)
        setIsRunning(false)
        setIsCompleted(true)
      }
    }, 450)
  }

  const handleReset = () => {
    setIsRunning(false)
    setCurrentStepIndex(-1)
    setIsCompleted(false)
  }

  return (
    <div className="arci-trace-demo-container" id="decision-trace-demo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--arci-teal)',
              textTransform: 'uppercase',
            }}
          >
            Interactive Decision Trace Demo
          </span>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--arci-teal-dark)',
              marginTop: 4,
            }}
          >
            SEE HOW A DECISION IS MADE
          </h3>
          <p style={{ fontSize: 14, color: 'var(--arci-text-muted)', marginTop: 4 }}>
            觀察 ARCI 如何在嚴格的證據與限制下，一步步完成決策並產出不可篡改的五段解讀報告。
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {isCompleted && (
            <button
              type="button"
              className="kb-btn kb-btn-secondary kb-btn-sm"
              onClick={handleReset}
            >
              <RotateCcw size={14} />
              <span>重新檢驗</span>
            </button>
          )}
          <button
            type="button"
            className="kb-btn kb-btn-primary kb-btn-sm"
            onClick={handleStartInspection}
            disabled={isRunning}
          >
            <Play size={14} />
            <span>{isRunning ? 'ARCI 檢驗中...' : 'Inspect with ARCI'}</span>
          </button>
        </div>
      </div>

      {/* Demo Measurement Data Card */}
      <div className="arci-demo-params-grid">
        <div className="arci-demo-param-card">
          <small>量測項目 (Test)</small>
          <div className="value" style={{ fontSize: 16 }}>Finger Tapping</div>
          <span style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>單手快速指尖開合</span>
        </div>
        <div className="arci-demo-param-card">
          <small>有效次數 (Taps)</small>
          <div className="value">42 <span style={{ fontSize: 13, fontWeight: 500 }}>次</span></div>
          <span style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>20 秒連續量測</span>
        </div>
        <div className="arci-demo-param-card">
          <small>間隔變異度 (Interval CV)</small>
          <div className="value">18.4 <span style={{ fontSize: 13, fontWeight: 500 }}>%</span></div>
          <span style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>節奏穩定係數</span>
        </div>
        <div className="arci-demo-param-card">
          <small>疲勞指數 (Fatigue Index)</small>
          <div className="value">0.21</div>
          <span style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>後段振幅衰減比率</span>
        </div>
        <div className="arci-demo-param-card">
          <small>服藥時段 (Medication)</small>
          <div className="value" style={{ fontSize: 15 }}>+73 min</div>
          <span style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>藥效作用期 (On)</span>
        </div>
      </div>

      {/* 7-Step Sequence Runner */}
      <div className="arci-steps-runner" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={0} aria-valuemax={7}>
        {steps.map((step, idx) => {
          const isDone = isCompleted || currentStepIndex > idx
          const isCurrent = isRunning && currentStepIndex === idx
          return (
            <div
              key={step.id}
              className={`arci-step-badge ${isCurrent ? 'running' : ''} ${isDone ? 'done' : ''}`}
              style={{
                opacity: currentStepIndex >= idx || isCompleted ? 1 : 0.45,
              }}
            >
              <div className="arci-step-icon-circle">
                {isDone ? <CheckCircle2 size={13} /> : idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--arci-teal-dark)', fontSize: 13 }}>{step.label}</strong>
                <span style={{ fontSize: 12, color: 'var(--arci-text-muted)', marginLeft: 8 }}>
                  {step.desc}
                </span>
              </div>
              {isDone && (
                <span style={{ fontSize: 11, color: 'var(--arci-teal)', fontWeight: 600 }}>
                  PASSED
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Final 5-Section Breakdown Result (Visible after run) */}
      {(isCompleted || currentStepIndex >= 5) && (
        <div className="arci-output-breakdown">
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--arci-teal-light)',
              borderRadius: 8,
              border: '1px solid var(--arci-border-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--arci-teal)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--arci-teal-dark)' }}>
              ARCI 審計驗收完成：產出結構化五分區決策報告
            </span>
          </div>

          {/* Section 1: Result */}
          <div className="arci-output-card highlight">
            <div className="arci-output-card-header">
              <span className="arci-output-card-title">01 · Result (客觀觀察結果)</span>
              <span className="kb-badge kb-badge-primary" style={{ fontSize: 11 }}>運動學摘要</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--arci-text-dark)', lineHeight: 1.6 }}>
              受試者於服藥後 73 分鐘完成 20 秒右手指尖敲擊測驗，有效次數 42 次，平均頻率 2.10 Hz，週期變異度 (CV) 為 18.4%，後段振幅相較前段衰減 21%（疲勞指數 0.21）。
            </p>
          </div>

          {/* Section 2: Evidence */}
          <div className="arci-output-card">
            <div className="arci-output-card-header">
              <span className="arci-output-card-title">02 · Evidence (文獻與歷史基準)</span>
              <span className="kb-badge kb-badge-accent" style={{ fontSize: 11 }}>
                <BookOpen size={11} /> DOI 索引已錨定
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--arci-text-dark)', lineHeight: 1.5 }}>
              • <strong>文獻依據</strong>：Zhang et al., Frontiers in Neurology 2021 (DOI: 10.3389/fneur.2021.742654)。Webcam 30fps 影像中，敲擊速率變異度與振幅衰減可客觀表徵指尖動作對稱性與節律。<br />
              • <strong>個人基準</strong>：比對前次量測（3 天前同一服藥時段，CV 17.9%），節奏穩定性無顯著偏移。
            </p>
          </div>

          {/* Section 3: Constraints */}
          <div className="arci-output-card">
            <div className="arci-output-card-header">
              <span className="arci-output-card-title">03 · Constraints (安全與限制邊界)</span>
              <span className="kb-badge kb-badge-warning" style={{ fontSize: 11 }}>
                <ShieldAlert size={11} /> 嚴格邊界生效
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--arci-text-dark)', lineHeight: 1.5 }}>
              • <strong>環境約束</strong>：環境照度需穩定，鏡頭不得低於 25fps，手部需完全置於視野中央。<br />
              • <strong>禁止事項</strong>：本系統嚴格禁止取代 MDS-UPDRS Part III 臨床量表評分，禁止推估診斷或建議調整左旋多巴用藥劑量。
            </p>
          </div>

          {/* Section 4: Confidence / Uncertainty */}
          <div className="arci-output-card">
            <div className="arci-output-card-header">
              <span className="arci-output-card-title">04 · Confidence / Uncertainty (狀態評估)</span>
              <span className="arci-state-tag supported" style={{ fontSize: 11, padding: '2px 8px' }}>
                STATUS: SUPPORTED
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--arci-text-dark)', lineHeight: 1.5 }}>
              • <strong>數據品質認證</strong>：有效幀追蹤率 97.5%，無追蹤丟失區段，判定為合格觀測。<br />
              • <strong>不確定性宣告</strong>：單次 20 秒測驗受當日作息影響，其波動不得直接推論為疾病進展，須持續累積至少 3 次可比較紀錄。
            </p>
          </div>

          {/* Section 5: Trace */}
          <div className="arci-output-card">
            <div className="arci-output-card-header">
              <span className="arci-output-card-title">05 · Trace (可追溯紀錄憑證)</span>
              <span style={{ fontFamily: 'var(--kb-font-mono)', fontSize: 11, color: 'var(--arci-text-muted)' }}>
                SHA-256 SEALED
              </span>
            </div>
            <div
              style={{
                background: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: 6,
                fontFamily: 'var(--kb-font-mono)',
                fontSize: 12,
                color: 'var(--arci-teal-dark)',
                border: '1px solid var(--arci-border-subtle)',
                wordBreak: 'break-all',
              }}
            >
              receipt_sha256: 73284a3d89bc21e405f6e87a9c12480bf139ec42b91834df90211a76c8d193e2<br />
              decision_path: INGEST_OK → IDENTITY_VALIDATED → EVIDENCE_MATCHED → BOUNDS_VERIFIED → EMITTED
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default ArciDecisionTraceDemo
