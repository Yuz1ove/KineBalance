import {
  AlertTriangle,
  Check,
  CircleDot,
  Clock3,
  LoaderCircle,
  ShieldCheck
} from 'lucide-react'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'teal' | 'amber' | 'blue' | 'danger'

const icons = {
  scheduled: <Clock3 aria-hidden="true" />,
  success: <Check aria-hidden="true" />,
  review: <CircleDot aria-hidden="true" />,
  loading: <LoaderCircle className="spin" aria-hidden="true" />,
  safe: <ShieldCheck aria-hidden="true" />,
  alert: <AlertTriangle aria-hidden="true" />
}

interface StatusPillProps {
  children: ReactNode
  tone?: Tone
  icon?: keyof typeof icons
}

export function StatusPill({ children, tone = 'neutral', icon }: StatusPillProps) {
  return (
    <span className={`status-pill status-${tone}`}>
      {icon ? icons[icon] : null}
      {children}
    </span>
  )
}
