import React, { useState } from 'react'
import { ArrowLeft, Activity, ShieldCheck, Sparkles, Layers } from 'lucide-react'
import { ArciWordmark } from './ArciWordmark'
import { ArciCoreVisual } from './ArciCoreVisual'
import { ArciPipelineDetail, type ArciNodeId } from './ArciPipelineDetail'
import { ArciComparisonSlider } from './ArciComparisonSlider'
import { ArciKineBalanceBridge } from './ArciKineBalanceBridge'
import { ArciDecisionTraceDemo } from './ArciDecisionTraceDemo'
import { ArciLimitsSection } from './ArciLimitsSection'
import { ArciEvidenceSection } from './ArciEvidenceSection'
import { ArciArchitectureStack } from './ArciArchitectureStack'
import { MotionSection } from '../motion/MotionSection'

interface ArciTechnologyPageProps {
  onNavigateToMeasure: () => void
  onNavigateToHome: () => void
}

export const ArciTechnologyPage: React.FC<ArciTechnologyPageProps> = ({
  onNavigateToMeasure,
  onNavigateToHome,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<ArciNodeId>('evidence')

  return (
    <div className="arci-tech-page-root" style={{ paddingBottom: 80 }}>
      {/* Top Breadcrumb / Back Button */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="kb-btn kb-btn-secondary kb-btn-sm"
          onClick={onNavigateToHome}
          style={{ borderRadius: 20 }}
        >
          <ArrowLeft size={14} />
          <span>返回首頁</span>
        </button>
        <span style={{ fontSize: 13, color: 'var(--arci-teal-soft)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arci-teal-dark)' }}>
          ARCI Technology
        </span>
      </div>

      {/* Hero Editorial Header */}
      <MotionSection className="kb-page-header" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--arci-teal)',
                textTransform: 'uppercase',
              }}
            >
              Technology & Foundations
            </span>
            <h1
              style={{
                fontSize: 'clamp(28px, 3.4vw, 44px)',
                fontWeight: 700,
                color: 'var(--arci-teal-dark)',
                lineHeight: 1.25,
                marginTop: 6,
                marginBottom: 12,
              }}
            >
              ARCI：受限制決策與證據處理核心
            </h1>
            <p
              style={{
                fontSize: 16,
                color: 'var(--arci-text-muted)',
                maxWidth: 680,
                lineHeight: 1.6,
              }}
            >
              KineBalance 看起來是一套帕金森氏症動作量測工具，但真正負責整理證據、限制推論範圍、留下判斷過程並協助產生解讀的，是底層的 ARCI。
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid var(--arci-border-subtle)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <ArciWordmark />
          </div>
        </div>

        {/* Big Tagline Banner */}
        <div
          style={{
            marginTop: 28,
            padding: '20px 24px',
            borderRadius: 14,
            background: 'linear-gradient(90deg, #EBF1EC 0%, #FAF9F5 100%)',
            border: '1px solid var(--arci-border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--arci-teal-dark)' }}>
              「先確認有什麼資料，再決定能說什麼。」
            </div>
            <div style={{ fontSize: 13, color: 'var(--arci-teal-soft)', marginTop: 2 }}>
              Evidence before inference · 避免幻覺、杜絕未經授權診斷的架構保證
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="kb-btn kb-btn-primary kb-btn-sm"
              onClick={onNavigateToMeasure}
            >
              <Activity size={14} />
              <span>體驗動作量測</span>
            </button>
          </div>
        </div>
      </MotionSection>

      {/* 1. Interactive 6-Node Core Visual & Pipeline Detail */}
      <MotionSection delay={0.1} className="arci-section-root">
        <ArciCoreVisual
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => setSelectedNodeId(id)}
        />
        <ArciPipelineDetail
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => setSelectedNodeId(id)}
        />
      </MotionSection>

      {/* 2. Before ARCI vs With ARCI Comparison Slider */}
      <MotionSection delay={0.15}>
        <ArciComparisonSlider />
      </MotionSection>

      {/* 3. How ARCI Works Inside KineBalance */}
      <MotionSection delay={0.2} style={{ marginTop: 40 }}>
        <ArciKineBalanceBridge />
      </MotionSection>

      {/* 4. Decision Trace Demo */}
      <MotionSection delay={0.25} style={{ marginTop: 40 }}>
        <ArciDecisionTraceDemo />
      </MotionSection>

      {/* 5. Built to Know Its Limits */}
      <MotionSection delay={0.3} style={{ marginTop: 40 }}>
        <ArciLimitsSection />
      </MotionSection>

      {/* 6. Medical Evidence & Provenance */}
      <MotionSection delay={0.35} style={{ marginTop: 40 }}>
        <ArciEvidenceSection />
      </MotionSection>

      {/* 7. Interactive 6-Layer Architecture Stack */}
      <MotionSection delay={0.4} style={{ marginTop: 40 }}>
        <ArciArchitectureStack />
      </MotionSection>

      {/* Bottom Final Action Box */}
      <MotionSection delay={0.45} style={{ marginTop: 50 }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--arci-border-strong)',
            borderRadius: 20,
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--arci-teal-light)',
              color: 'var(--arci-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <ShieldCheck size={24} />
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--arci-teal-dark)', marginBottom: 8 }}>
            讓每一次量測，都有一條清楚且可檢查的依據
          </h3>
          <p
            style={{
              fontSize: 14,
              color: 'var(--arci-text-muted)',
              maxWidth: 580,
              margin: '0 auto 24px auto',
              lineHeight: 1.6,
            }}
          >
            ARCI 不只是工程架構，更是我們對醫療嚴謹性與資料透明度的承諾。現在就開始使用 KineBalance 進行手指開合量測。
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="kb-btn kb-btn-secondary"
              onClick={onNavigateToHome}
            >
              <span>查看首頁總覽</span>
            </button>
            <button
              type="button"
              className="kb-btn kb-btn-primary"
              onClick={onNavigateToMeasure}
            >
              <Activity size={16} />
              <span>開始手指開合量測</span>
            </button>
          </div>
        </div>
      </MotionSection>
    </div>
  )
}
export default ArciTechnologyPage
