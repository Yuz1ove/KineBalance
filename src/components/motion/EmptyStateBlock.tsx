import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Activity, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'

interface EmptyStateBlockProps {
  title?: string
  description?: string
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  showSteps?: boolean
}

export const EmptyStateBlock: React.FC<EmptyStateBlockProps> = ({
  title = '還沒有量測紀錄',
  description = '完成第一次指尖開合量測後，就能在這裡查看動作頻率、變化分析與資料品質。',
  primaryActionLabel = '開始第一次量測',
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  showSteps = true,
}) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="kb-empty-state-block">
      {/* Calm Breathing Ambient Illustration */}
      <div className="kb-empty-visual-wrap">
        <motion.div
          className="kb-empty-ambient-halo"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1, 1.08, 1],
                  opacity: [0.6, 0.85, 0.6],
                }
          }
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="kb-empty-center-icon"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -4, 0],
                }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Activity size={32} />
        </motion.div>
      </div>

      <h3 className="kb-empty-title">{title}</h3>
      <p className="kb-empty-desc">{description}</p>

      {/* Reassuring Steps */}
      {showSteps && (
        <div className="kb-empty-steps-grid">
          <div className="kb-empty-step-item">
            <span className="kb-step-num">1</span>
            <div>
              <strong>穩定姿勢與光線</strong>
              <p>坐在鏡頭前約 50 公分，光線均勻照亮手部</p>
            </div>
          </div>
          <div className="kb-empty-step-item">
            <span className="kb-step-num">2</span>
            <div>
              <strong>20 秒規律開合</strong>
              <p>以自然最大幅度，拇指與食指快速規律敲擊</p>
            </div>
          </div>
          <div className="kb-empty-step-item">
            <span className="kb-step-num">3</span>
            <div>
              <strong>即時產出客觀報告</strong>
              <p>取得平均頻率、節奏變異與 ARCI 文獻對照</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="kb-empty-actions">
        {onPrimaryAction && (
          <button
            type="button"
            className="kb-btn kb-btn-primary"
            onClick={onPrimaryAction}
          >
            <Sparkles size={18} />
            <span>{primaryActionLabel}</span>
            <ArrowRight size={16} />
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            className="kb-btn kb-btn-secondary"
            onClick={onSecondaryAction}
          >
            <ShieldCheck size={18} />
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}
