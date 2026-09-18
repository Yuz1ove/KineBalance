import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

interface MetricGlassCardProps {
  label: string
  value: number | string | null
  unit?: string
  subtext?: string
  icon?: LucideIcon
  status?: 'normal' | 'success' | 'warning' | 'accent'
  delay?: number
}

export const MetricGlassCard: React.FC<MetricGlassCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  status = 'normal',
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState<number | string | null>(
    typeof value === 'number' && !shouldReduceMotion ? 0 : value
  )

  useEffect(() => {
    if (typeof value !== 'number' || shouldReduceMotion) {
      setDisplayValue(value)
      return
    }

    const duration = 800
    const steps = 24
    const intervalTime = duration / steps
    const stepValue = value / steps
    let current = 0
    let stepCount = 0

    const timer = setInterval(() => {
      stepCount++
      current += stepValue
      if (stepCount >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(
          Number.isInteger(value) ? Math.round(current) : Number(current.toFixed(1))
        )
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [value, shouldReduceMotion])

  const statusClass = {
    normal: 'kb-metric-normal',
    success: 'kb-metric-success',
    warning: 'kb-metric-warning',
    accent: 'kb-metric-accent',
  }[status]

  return (
    <motion.div
      className={`kb-metric-glass-card ${statusClass}`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={shouldReduceMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
    >
      <div className="kb-metric-header">
        <span className="kb-metric-label">{label}</span>
        {Icon && (
          <div className="kb-metric-icon-wrap">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="kb-metric-value-row">
        <span className="kb-metric-number">
          {displayValue !== null ? displayValue : '--'}
        </span>
        {unit && <span className="kb-metric-unit">{unit}</span>}
      </div>

      {subtext && <div className="kb-metric-subtext">{subtext}</div>}
    </motion.div>
  )
}
