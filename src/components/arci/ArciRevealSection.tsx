import React, { useState } from 'react'
import { ArrowRight, Sparkles, Shield, Layers, CheckCircle2 } from 'lucide-react'
import { ArciWordmark } from './ArciWordmark'
import { ArciCoreVisual } from './ArciCoreVisual'
import { ArciPipelineDetail, type ArciNodeId } from './ArciPipelineDetail'

interface ArciRevealSectionProps {
  onExploreArci: () => void
}

export const ArciRevealSection: React.FC<ArciRevealSectionProps> = ({ onExploreArci }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<ArciNodeId>('evidence')
  const [activeNarrativeStep, setActiveNarrativeStep] = useState<number>(3)

  const narrativeSteps = [
    {
      num: '01',
      title: '量測只是第一步。',
      desc: '藉由視訊鏡頭取得每秒 30 幀的食指與拇指開合座標，僅僅是客觀記錄了手部的物理移動。',
    },
    {
      num: '02',
      title: '真正困難的是：系統如何知道哪些資訊可以被使用？',
      desc: '若環境照度不均、手部部分遮擋或缺少基準線，任何模型生成的數值都可能失去醫療可比性。',
    },
    {
      num: '03',
      title: '以及哪些結論不應該被產生。',
      desc: '當證據不足時，系統必須懂得拒絕推論，絕不在沒有充分多重會話佐證下妄下「病情惡化」的斷言。',
    },
    {
      num: '04',
      title: 'ARCI：證據先於推論。',
      desc: '「先確認有什麼資料，再決定能說什麼。」這是 KineBalance 守護每一次量測判讀的核心底層。',
    },
  ]

  return (
    <section className="arci-section-root" id="arci-reveal" aria-label="Behind KineBalance / ARCI 核心揭露">
      <div className="arci-reveal-container">
        {/* Header Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="arci-reveal-eyebrow">Behind KineBalance · Powered by ARCI</div>
            <h2 className="arci-reveal-headline">
              看見量測背後的<br />受限制決策與證據核心。
            </h2>
          </div>
          <ArciWordmark showTagline={false} />
        </div>

        {/* Narrative Progression Stepper */}
        <div className="arci-reveal-stepper">
          {narrativeSteps.map((step, idx) => (
            <div
              key={step.num}
              className={`arci-reveal-step-item ${activeNarrativeStep >= idx ? 'active' : ''}`}
              onClick={() => setActiveNarrativeStep(idx)}
              style={{ cursor: 'pointer' }}
            >
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Core Tagline Box */}
        <div className="arci-reveal-quote-box">
          <div className="arci-reveal-quote-text">
            「先確認有什麼資料，再決定能說什麼。」
          </div>
          <div className="arci-reveal-quote-sub">
            Evidence before inference · KineBalance 系統底層原則
          </div>
        </div>

        {/* Interactive 6-Node Core Preview */}
        <div style={{ marginTop: 36, marginBottom: 24 }}>
          <ArciCoreVisual
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
          />
          <ArciPipelineDetail
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
          />
        </div>

        {/* Call To Action: Transition to Full Dedicated ARCI Page */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid var(--arci-border-subtle)',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} style={{ color: 'var(--arci-teal)' }} />
            <span style={{ fontSize: 14, color: 'var(--arci-text-dark)', fontWeight: 600 }}>
              深入探索推論管線對比、決策追溯 Demo 與同儕審查文獻對接
            </span>
          </div>

          <button
            type="button"
            className="kb-btn kb-btn-primary"
            onClick={onExploreArci}
            style={{
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 30,
              boxShadow: '0 4px 14px rgba(80, 105, 83, 0.2)',
            }}
          >
            <span>探索完整 ARCI 架構 (Explore ARCI)</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
export default ArciRevealSection
