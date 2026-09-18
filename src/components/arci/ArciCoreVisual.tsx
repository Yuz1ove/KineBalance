import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ARCI_NODES_DATA, type ArciNodeId } from './ArciPipelineDetail'

interface ArciCoreVisualProps {
  selectedNodeId: ArciNodeId
  onSelectNode: (id: ArciNodeId) => void
}

export const ArciCoreVisual: React.FC<ArciCoreVisualProps> = ({
  selectedNodeId,
  onSelectNode,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [pulseTick, setPulseTick] = useState(0)

  // Subtle ticker to animate signal coordinates if needed
  useEffect(() => {
    if (shouldReduceMotion) return
    const timer = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 6)
    }, 1800)
    return () => clearInterval(timer)
  }, [shouldReduceMotion])

  // Precise layout coordinates for 800x460 canvas
  const nodes = [
    { id: 'input' as ArciNodeId, cx: 130, cy: 110, align: 'start' },
    { id: 'identity' as ArciNodeId, cx: 400, cy: 60, align: 'middle' },
    { id: 'evidence' as ArciNodeId, cx: 670, cy: 110, align: 'end' },
    { id: 'constraint' as ArciNodeId, cx: 670, cy: 350, align: 'end' },
    { id: 'decision' as ArciNodeId, cx: 400, cy: 400, align: 'middle' },
    { id: 'trace' as ArciNodeId, cx: 130, cy: 350, align: 'start' },
  ]

  const centerCore = { cx: 400, cy: 230 }

  return (
    <div className="arci-core-visual-wrapper">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--arci-teal)',
              textTransform: 'uppercase',
            }}
          >
            Autonomous Resilient Cognitive Infrastructure
          </span>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--arci-teal-dark)',
              margin: '2px 0 0 0',
            }}
          >
            ARCI 受限決策與證據處理核心
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--arci-teal)',
            }}
            className={shouldReduceMotion ? '' : 'arci-continuity-dot active'}
          />
          <span style={{ fontSize: 13, color: 'var(--arci-text-muted)' }}>
            點擊任一節點檢視運作原理
          </span>
        </div>
      </div>

      <svg
        className="arci-core-canvas"
        viewBox="0 0 800 460"
        role="img"
        aria-label="ARCI 6 節點互動管線：Input, Identity, Evidence, Constraint, Decision, Trace"
      >
        <defs>
          {/* Subtle gradients */}
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#EBF1EC" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#DDE7E1" stopOpacity="0.1" />
          </radialGradient>

          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#506953" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#72877B" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#506953" stopOpacity="0.7" />
          </linearGradient>

          {/* Filter for frosted glass node */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#25352F" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* 1. Underlying Static Connection Geometry */}
        <g stroke="var(--arci-border-subtle)" strokeWidth="1.5" fill="none">
          {/* Spoke lines from core to 6 nodes */}
          {nodes.map((node) => (
            <line
              key={`spoke-${node.id}`}
              x1={centerCore.cx}
              y1={centerCore.cy}
              x2={node.cx}
              y2={node.cy}
              strokeDasharray="2 4"
            />
          ))}

          {/* Perimeter pipeline track: 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 01 */}
          <path
            d="M 130 110 L 400 60 L 670 110 L 670 350 L 400 400 L 130 350 Z"
            stroke="var(--arci-border-strong)"
            strokeWidth="1.2"
          />
        </g>

        {/* 2. Animated Signal Pulse Paths */}
        {!shouldReduceMotion && (
          <g fill="none">
            {/* Clockwise flow */}
            <path
              d="M 130 110 L 400 60 L 670 110 L 670 350 L 400 400 L 130 350 Z"
              stroke="url(#pathGradient)"
              strokeWidth="2.5"
              className="arci-signal-pulse"
            />

            {/* Radial pulses from core */}
            <line
              x1={centerCore.cx}
              y1={centerCore.cy}
              x2={nodes[pulseTick].cx}
              y2={nodes[pulseTick].cy}
              stroke="var(--arci-teal)"
              strokeWidth="2"
              className="arci-signal-pulse"
            />
          </g>
        )}

        {/* 3. Central ARCI Core Node */}
        <g className="arci-center-core-group" style={{ cursor: 'default' }}>
          {/* Breathing outer halo */}
          <circle
            cx={centerCore.cx}
            cy={centerCore.cy}
            r="82"
            fill="url(#coreGlow)"
            className={shouldReduceMotion ? '' : 'arci-center-core-pulse'}
          />

          {/* Core Body */}
          <circle
            cx={centerCore.cx}
            cy={centerCore.cy}
            r="60"
            className="arci-center-core-bg"
          />

          {/* Concentric rings */}
          <circle
            cx={centerCore.cx}
            cy={centerCore.cy}
            r="48"
            fill="none"
            stroke="var(--arci-teal)"
            strokeWidth="1"
            strokeOpacity="0.4"
            strokeDasharray="3 3"
          />

          {/* Central Typography */}
          <text
            x={centerCore.cx}
            y={centerCore.cy - 10}
            textAnchor="middle"
            fill="var(--arci-teal-dark)"
            fontSize="16"
            fontWeight="700"
            letterSpacing="0.1em"
          >
            ARCI CORE
          </text>
          <text
            x={centerCore.cx}
            y={centerCore.cy + 10}
            textAnchor="middle"
            fill="var(--arci-teal-soft)"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.05em"
          >
            DECISION ENGINE
          </text>
          <text
            x={centerCore.cx}
            y={centerCore.cy + 26}
            textAnchor="middle"
            fill="var(--arci-text-muted)"
            fontSize="9"
          >
            受限認知架構
          </text>
        </g>

        {/* 4. Six Interactive Peripheral Nodes */}
        {nodes.map((node) => {
          const info = ARCI_NODES_DATA[node.id]
          const isSelected = selectedNodeId === node.id

          return (
            <g
              key={node.id}
              className={`arci-node-group ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectNode(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectNode(node.id)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${info.number} ${info.title} (${info.titleZh})`}
              aria-pressed={isSelected}
            >
              {/* Outer touch target and highlight */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r="36"
                className="arci-node-circle"
                filter="url(#softShadow)"
              />

              {/* Node Number */}
              <text
                x={node.cx}
                y={node.cy - 12}
                textAnchor="middle"
                className="arci-node-label-num"
              >
                {info.number}
              </text>

              {/* Node Main Title */}
              <text
                x={node.cx}
                y={node.cy + 4}
                textAnchor="middle"
                className="arci-node-label-title"
              >
                {info.title}
              </text>

              {/* Node Chinese Title */}
              <text
                x={node.cx}
                y={node.cy + 18}
                textAnchor="middle"
                className="arci-node-label-sub"
              >
                {info.titleZh.replace('層', '')}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
export default ArciCoreVisual
