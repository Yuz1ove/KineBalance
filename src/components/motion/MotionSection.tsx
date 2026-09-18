import React from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface MotionSectionProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
  style?: React.CSSProperties
  id?: string
}

export const MotionSection: React.FC<MotionSectionProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
  style,
  id,
}) => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <div id={id} className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.section
      id={id}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  )
}
