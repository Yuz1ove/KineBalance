import React from 'react'

interface ArciWordmarkProps {
  showTagline?: boolean
  className?: string
}

export const ArciWordmark: React.FC<ArciWordmarkProps> = ({
  showTagline = true,
  className = '',
}) => {
  return (
    <div className={`arci-wordmark ${className}`}>
      <div className="arci-wordmark-title-row">
        <span className="arci-wordmark-brand">ARCI</span>
        <div className="arci-continuity-line" aria-hidden="true">
          <span className="arci-continuity-dot active" />
          <span className="arci-continuity-dot" />
          <span className="arci-continuity-dot" />
          <span className="arci-continuity-dot" />
          <span className="arci-continuity-dot" />
          <span className="arci-continuity-dot active" />
          <span className="arci-continuity-bar" />
        </div>
      </div>
      <div className="arci-wordmark-sub">Autonomous Resilient Cognitive Infrastructure</div>
      {showTagline && (
        <div className="arci-wordmark-tagline">
          證據先於推論・Evidence before inference
        </div>
      )}
    </div>
  )
}
export default ArciWordmark
