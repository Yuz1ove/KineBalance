import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, type LucideIcon } from 'lucide-react'

interface QuickActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  badge?: string
  actionLabel?: string
  onClick: () => void
  accentColor?: 'primary' | 'accent' | 'neutral'
  delay?: number
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  actionLabel = '前往查看',
  onClick,
  accentColor = 'primary',
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion()

  const accentClasses = {
    primary: 'kb-action-primary',
    accent: 'kb-action-accent',
    neutral: 'kb-action-neutral',
  }[accentColor]

  return (
    <motion.div
      className={`kb-quick-action-card ${accentClasses}`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={shouldReduceMotion ? undefined : { y: -4, transition: { duration: 0.25 } }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="kb-action-top">
        <div className="kb-action-icon-wrap">
          <Icon size={22} />
        </div>
        {badge && <span className="kb-action-badge">{badge}</span>}
      </div>

      <div className="kb-action-content">
        <h3 className="kb-action-title">{title}</h3>
        <p className="kb-action-desc">{description}</p>
      </div>

      <div className="kb-action-footer">
        <span className="kb-action-link-text">{actionLabel}</span>
        <motion.div
          className="kb-action-arrow"
          whileHover={shouldReduceMotion ? undefined : { x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight size={16} />
        </motion.div>
      </div>
    </motion.div>
  )
}
