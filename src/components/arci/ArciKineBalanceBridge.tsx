import React, { useState } from 'react'
import {
  User,
  Activity,
  Cpu,
  BarChart3,
  Layers,
  BookOpen,
  ShieldCheck,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pill,
} from 'lucide-react'

export const ArciKineBalanceBridge: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(4)

  const pipelineSteps = [
    { num: '01', title: 'Patient', label: '個案受試', icon: User },
    { num: '02', title: 'Motion Test', label: '20s 快速敲擊', icon: Activity },
    { num: '03', title: 'Measurement Engine', label: '運動學引擎', icon: Cpu },
    { num: '04', title: 'Structured Metrics', label: '結構化指標', icon: BarChart3 },
    { num: '05', title: 'ARCI Ingest', label: '進入 ARCI 核心', icon: Layers },
    { num: '06', title: 'Evidence Retrieval', label: '文獻基線比對', icon: BookOpen },
    { num: '07', title: 'Constraint Check', label: '安全邊界檢驗', icon: ShieldCheck },
    { num: '08', title: 'Interpretation', label: '五段式解讀', icon: FileText },
    { num: '09', title: 'Trend / Report', label: '回診客觀摘要', icon: TrendingUp },
  ]

  return (
    <div className="arci-bridge-card">
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--arci-teal)',
            textTransform: 'uppercase',
          }}
        >
          Clinical Integration Flow
        </span>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--arci-teal-dark)',
            marginTop: 4,
          }}
        >
          HOW ARCI WORKS INSIDE KINEBALANCE
        </h3>
        <p style={{ fontSize: 14, color: 'var(--arci-text-muted)', marginTop: 4 }}>
          KineBalance 負責取得運動學數據；底層的 ARCI 負責在量測、證據、限制與解讀之間建立一條嚴格受控的推論路徑。
        </p>
      </div>

      {/* Interactive Horizontal/Vertical Pipeline Track */}
      <div className="arci-bridge-pipeline-track" role="tablist" aria-label="KineBalance 與 ARCI 整合管線">
        {pipelineSteps.map((step, idx) => {
          const Icon = step.icon
          const isActive = idx <= activeStep
          const isCurrent = idx === activeStep
          return (
            <div
              key={step.num}
              className={`arci-bridge-node ${isCurrent ? 'active' : ''}`}
              onClick={() => setActiveStep(idx)}
              style={{
                cursor: 'pointer',
                borderWidth: isCurrent ? 2 : 1,
                borderColor: isCurrent
                  ? 'var(--arci-teal)'
                  : isActive
                  ? 'var(--arci-border-strong)'
                  : 'var(--arci-border-subtle)',
                opacity: isActive ? 1 : 0.6,
              }}
              role="tab"
              aria-selected={isCurrent}
              tabIndex={0}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isCurrent ? 'var(--arci-teal)' : '#FFFFFF',
                  color: isCurrent ? '#FFFFFF' : 'var(--arci-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px auto',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Icon size={14} />
              </div>
              <small>{step.num}</small>
              <strong>{step.title}</strong>
              <span style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Practical Case Study: Finger Tapping Test */}
      <div className="arci-bridge-example-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Activity size={18} style={{ color: 'var(--arci-teal)' }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)', margin: 0 }}>
            實例展示：指尖開合測驗 (Finger Tapping Test) 的受控推論流程
          </h4>
        </div>

        <div className="arci-bridge-two-column">
          {/* Column 1: Input & Context Ingestion */}
          <div className="arci-bridge-box-inner">
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--arci-teal-soft)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Step A · 運動學輸入與背景檢索
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #EDEDED' }}>
                <span>有效開合間隔 (Tap Interval)</span>
                <strong>285 ms (CV 18.4%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #EDEDED' }}>
                <span>有效開合次數 (Tap Count)</span>
                <strong>42 次 / 20 秒</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #EDEDED' }}>
                <span>振幅衰減指數 (Fatigue Pattern)</span>
                <strong>0.21 (後段衰減 21%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #EDEDED' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Pill size={12} /> 服藥時間戳記 (Medication)
                </span>
                <strong>服藥後 73 分鐘 (On-Phase)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> 歷史可比對基線
                </span>
                <strong>前次量測（3 天前同一服藥時段）</strong>
              </div>
            </div>
          </div>

          {/* Column 2: Bounded Output Differentiation */}
          <div className="arci-bridge-box-inner" style={{ background: '#FFFFFF' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--arci-accent)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Step B · ARCI 限制推論差異化輸出
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Prohibited conclusion block */}
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: '#FDF3F2',
                  border: '1px solid #F5C6CB',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A13E39', fontWeight: 600 }}>
                  <AlertTriangle size={14} /> 一般 AI 可能產生之未經證實結論：
                </div>
                <div style={{ color: '#666666', marginTop: 4 }}>
                  「本次敲擊疲勞指數上升至 0.21，顯示<strong>病情明顯惡化</strong>，建議將左旋多巴劑量調高。」
                </div>
              </div>

              {/* ARCI Controlled output block */}
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: 'var(--arci-teal-light)',
                  border: '1px solid var(--arci-border-strong)',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--arci-teal-dark)', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> ARCI 受限推論產出（客觀事實）：
                </div>
                <div style={{ color: 'var(--arci-text-dark)', marginTop: 4 }}>
                  「本次測驗相較 3 天前同一服藥時段，後段振幅衰減比率增加 6.2%，但平均敲擊頻率維持穩定（3.4 Hz）。由於單次波動不足以推論長期神經學病程進展，系統標記為<strong>常態運動學浮動</strong>，建議保留此數據供回診與醫師討論。」
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ArciKineBalanceBridge
