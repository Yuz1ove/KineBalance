import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Activity, ArrowRight, Calendar, Sparkles, CheckCircle2, Shield } from 'lucide-react'
import { FloatingInfoCard } from './FloatingInfoCard'

interface HeroSectionProps {
  onStartMeasure: () => void
  onViewRecords: () => void
  latestRecordSummary?: {
    handSide: string
    frequencyHz: number | null
    validTaps: number
    dateText: string
  } | null
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartMeasure,
  onViewRecords,
  latestRecordSummary,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (shouldReduceMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX / innerWidth - 0.5) * 16
      const y = (e.clientY / innerHeight - 0.5) * 16
      setMousePos({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [shouldReduceMotion])

  return (
    <div className="kb-hero-cinematic">
      {/* Dynamic Ambient Background Glow & Floating Orbs */}
      <div className="kb-hero-ambient-layer" aria-hidden="true">
        <motion.div
          className="kb-ambient-glow-primary"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: mousePos.x * 1.5,
                  y: mousePos.y * 1.5,
                  scale: [1, 1.05, 1],
                }
          }
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="kb-ambient-glow-accent"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: -mousePos.x * 1.2,
                  y: -mousePos.y * 1.2,
                  scale: [1.05, 1, 1.05],
                }
          }
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="kb-hero-grid">
        {/* Left Column: Editorial Branding & Action */}
        <motion.div
          className="kb-hero-text-col"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="kb-hero-badge-row">
            <span className="kb-badge kb-badge-primary">
              <Sparkles size={13} style={{ marginRight: 4 }} />
              KineBalance 動作健康記錄
            </span>
            <span className="kb-badge kb-badge-subtle">
              <Shield size={12} style={{ marginRight: 4 }} />
              本機隱私保護
            </span>
          </div>

          <h1 className="kb-hero-title kb-page-title">
            讓每一次動作量測，都有清楚的脈絡
          </h1>

          <p className="kb-hero-subtitle">
            記錄手指敲擊、變化趨勢與 ARCI 結構化解讀，協助回診與日常觀察。在客觀、穩定、安心的環境中，為神經動作健康建立可信的長期歷程。
          </p>

          <div className="kb-hero-cta-group">
            <motion.button
              type="button"
              className="kb-btn kb-btn-primary kb-btn-lg"
              onClick={onStartMeasure}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            >
              <Activity size={20} />
              <span>開始量測</span>
              <ArrowRight size={18} />
            </motion.button>

            <motion.button
              type="button"
              className="kb-btn kb-btn-secondary kb-btn-lg"
              onClick={onViewRecords}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            >
              <Calendar size={18} />
              <span>查看紀錄</span>
            </motion.button>
          </div>

          <div className="kb-hero-meta-strip">
            <div className="kb-meta-item">
              <span className="kb-meta-dot" />
              <span>20 秒手指開合測驗</span>
            </div>
            <div className="kb-meta-item">
              <span className="kb-meta-dot" />
              <span>MediaPipe 視覺運動學</span>
            </div>
            <div className="kb-meta-item">
              <span className="kb-meta-dot" />
              <span>ARCI 同行審查文獻對照</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: VisionOS Layered Floating Glass Cards */}
        <div className="kb-hero-visual-col">
          <motion.div
            className="kb-hero-visual-stack"
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    x: -mousePos.x * 0.8,
                    y: -mousePos.y * 0.8,
                  }
            }
            transition={{ type: 'spring', stiffness: 75, damping: 20 }}
          >
            {/* Main Spatial Card */}
            <FloatingInfoCard isFloating delay={0.15} className="kb-hero-card-main">
              <div className="kb-glass-card-header">
                <div className="kb-glass-status-tag">
                  <CheckCircle2 size={14} className="text-success" />
                  <span>{latestRecordSummary ? '最近量測已紀錄' : '系統就緒待測'}</span>
                </div>
                <span className="kb-glass-time">
                  {latestRecordSummary?.dateText || '建議每日定時'}
                </span>
              </div>

              <div className="kb-glass-metric-hero">
                <div className="kb-glass-metric-side">
                  <span className="kb-glass-metric-label">動作側別</span>
                  <span className="kb-glass-metric-title">
                    {latestRecordSummary?.handSide || '右手指尖開合'}
                  </span>
                </div>
                <div className="kb-glass-metric-value-box">
                  <span className="kb-glass-big-num">
                    {latestRecordSummary?.frequencyHz !== null && latestRecordSummary?.frequencyHz !== undefined
                      ? latestRecordSummary.frequencyHz
                      : '3.2'}
                  </span>
                  <span className="kb-glass-unit">Hz 平均頻率</span>
                </div>
              </div>

              {/* Dynamic Wave Ribbon Simulation */}
              <div className="kb-glass-wave-preview" aria-hidden="true">
                <svg viewBox="0 0 280 44" fill="none" className="kb-wave-svg">
                  <path
                    d="M 0 24 C 20 8, 40 40, 60 20 C 80 4, 100 36, 120 18 C 140 2, 160 38, 180 22 C 200 6, 220 34, 240 16 C 260 4, 270 28, 280 20"
                    stroke="var(--kb-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="kb-wave-tags">
                  <span>敲擊波形穩定</span>
                  <span>追蹤率 98%</span>
                </div>
              </div>
            </FloatingInfoCard>

            {/* Satellite Floating Badge Card 1 */}
            <FloatingInfoCard
              isFloating
              delay={0.3}
              className="kb-hero-card-sub kb-hero-card-sub1"
            >
              <div className="kb-satellite-content">
                <div className="kb-satellite-icon kb-satellite-accent">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="kb-satellite-title">ARCI 結構化解讀</div>
                  <div className="kb-satellite-desc">同齡對照與限制提示</div>
                </div>
              </div>
            </FloatingInfoCard>

            {/* Satellite Floating Badge Card 2 */}
            <FloatingInfoCard
              isFloating
              delay={0.45}
              className="kb-hero-card-sub kb-hero-card-sub2"
            >
              <div className="kb-satellite-content">
                <div className="kb-satellite-icon kb-satellite-primary">
                  <Activity size={16} />
                </div>
                <div>
                  <div className="kb-satellite-title">20 秒快速紀錄</div>
                  <div className="kb-satellite-desc">遲滯回差防抖濾波</div>
                </div>
              </div>
            </FloatingInfoCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
