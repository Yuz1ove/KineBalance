import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

interface InsightPanelProps {
  sectionNumber: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  badge?: string
  children: React.ReactNode
  variant?: 'default' | 'highlight' | 'warning' | 'evidence'
  delay?: number
  id?: string
}

export const InsightPanel: React.FC<InsightPanelProps> = ({
  sectionNumber,
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  variant = 'default',
  delay = 0,
  id,
}) => {
  const shouldReduceMotion = useReducedMotion()

  const variantClass = {
    default: 'kb-insight-default',
    highlight: 'kb-insight-highlight',
    warning: 'kb-insight-warning',
    evidence: 'kb-insight-evidence',
  }[variant]

  return (
    <motion.article
      id={id}
      className={`kb-insight-panel ${variantClass}`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="kb-insight-header">
        <div className="kb-insight-title-group">
          <span className="kb-insight-number">{sectionNumber}</span>
          <div>
            <h3 className="kb-insight-title">{title}</h3>
            {subtitle && <p className="kb-insight-subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="kb-insight-header-actions">
          {badge && <span className="kb-insight-badge">{badge}</span>}
          {Icon && (
            <div className="kb-insight-icon-wrap">
              <Icon size={18} />
            </div>
          )}
        </div>
      </header>

      <div className="kb-insight-body">{children}</div>
    </motion.article>
  )
}
