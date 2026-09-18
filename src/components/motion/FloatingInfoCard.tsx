import React from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface FloatingInfoCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  delay?: number
  isFloating?: boolean
  onClick?: () => void
}

export const FloatingInfoCard: React.FC<FloatingInfoCardProps> = ({
  children,
  className = '',
  style,
  delay = 0,
  isFloating = false,
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={`kb-floating-glass-card ${isFloating && !shouldReduceMotion ? 'kb-float-anim' : ''} ${className}`}
      style={style}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={shouldReduceMotion ? undefined : { y: -4, transition: { duration: 0.25 } }}
      onClick={onClick}
    >
      <div className="kb-glass-card-specular" />
      <div className="kb-glass-card-content">{children}</div>
    </motion.div>
  )
}
