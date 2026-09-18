import React, { useState } from 'react'
import { Camera, Binary, BookOpen, Cpu, FileText, Monitor, ChevronRight } from 'lucide-react'

export const ArciArchitectureStack: React.FC = () => {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<number>(3) // Default to Layer 04 (ARCI Decision Core)

  const layers = [
    {
      num: 'Layer 01',
      name: 'Sensing',
      titleZh: '感測層 · 動作訊號捕捉',
      subtitle: 'Motion measurement',
      icon: Camera,
      detail:
        '常規 RGB 視訊鏡頭 (30fps) 配合手部關鍵點模型，擷取食指與拇指 21 個 3D 空間座標。具備時間缺口 (>400ms) 與掉幀偵測。',
      tech: 'MediaPipe Hands / Monotonic Timestamp Clock',
    },
    {
      num: 'Layer 02',
      name: 'Normalization',
      titleZh: '正規化層 · 結構化指標',
      subtitle: 'Structured metrics',
      icon: Binary,
      detail:
        '以掌部長度 (Landmark 0 到 9) 消除拍攝距離與手掌大小差異，遲滯門檻過濾微小震顫，產出頻率 (Hz)、變異度 (CV) 與衰減比率。',
      tech: 'Hysteresis Cycle Detection / Scale Invariance',
    },
    {
      num: 'Layer 03',
      name: 'Evidence',
      titleZh: '證據層 · 醫學常模與歷程',
      subtitle: 'Medical / patient context',
      icon: BookOpen,
      detail:
        '檢索 peer-reviewed 文獻常模與個案長期服藥時序（On/Off Phase）。確保後續推論皆具備具體文獻 DOI 與個案基線錨點。',
      tech: 'Frontiers 2021 Corpus / mPower Dataset / SQLite Baseline Store',
    },
    {
      num: 'Layer 04',
      name: 'ARCI Decision Core',
      titleZh: '決策核心 · 受限認知架構',
      subtitle: 'Autonomous Resilient Cognitive Infrastructure',
      icon: Cpu,
      detail:
        '檢驗邊界限制：攔截自動確診、阻絕未授權推論；在品質不充分時允許狀態保持 UNKNOWN，產出具備 SHA-256 驗證收據之受限判斷。',
      tech: 'Cryptographic Reader Bindings / Policy Boundary Engine',
    },
    {
      num: 'Layer 05',
      name: 'Interpretation',
      titleZh: '解讀層 · 結構化報告生成',
      subtitle: 'Structured interpretation',
      icon: FileText,
      detail:
        '嚴格遵循五大分區（觀測、基線、文獻支持、限制說明、就醫引導），禁止模糊診斷，以客觀、量化之語言描述變化趨勢。',
      tech: '5-Section Canonical Schema (KBPD-ARCI-INTERPRET-1)',
    },
    {
      num: 'Layer 06',
      name: 'Interface',
      titleZh: '介面層 · KineBalance 工作站',
      subtitle: 'KineBalance Clinical UI',
      icon: Monitor,
      detail:
        '呈現動作量測、歷史折線圖、門診溝通摘要與本地身分管理。全資料保存在使用者本機受控空間，支援一鍵完整串聯抹除。',
      tech: 'React 18 / Motion Engine / SQLite Local Storage / Cascade Erasure',
    },
  ]

  const activeLayerIndex = hoveredLayer !== null ? hoveredLayer : selectedLayer
  const currentDetail = layers[activeLayerIndex]

  return (
    <div className="arci-section-root">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--arci-teal)',
            textTransform: 'uppercase',
          }}
        >
          System Architecture
        </span>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--arci-teal-dark)',
            marginTop: 4,
          }}
        >
          ARCI × KINEBALANCE 六層系統架構
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--arci-text-muted)',
            maxWidth: 600,
            margin: '6px auto 0 auto',
          }}
        >
          將滑鼠懸停或點擊任一層級，深入檢視由感測端直達決策核心的資料流與安全屏障。
        </p>
      </div>

      {/* Layer Stack */}
      <div className={`arci-arch-stack ${hoveredLayer !== null ? 'has-hovered' : ''}`}>
        {layers.map((layer, idx) => {
          const Icon = layer.icon
          const isHovered = hoveredLayer === idx
          const isSelected = selectedLayer === idx && hoveredLayer === null
          const isHighlighted = isHovered || isSelected

          return (
            <div
              key={layer.num}
              className={`arci-arch-layer-card ${isHighlighted ? 'is-hovered' : ''}`}
              onMouseEnter={() => setHoveredLayer(idx)}
              onMouseLeave={() => setHoveredLayer(null)}
              onClick={() => setSelectedLayer(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedLayer(idx)
                }
              }}
              aria-label={`${layer.num}: ${layer.name}`}
            >
              <div className="arci-arch-layer-left">
                <span className="arci-arch-layer-num">{layer.num}</span>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isHighlighted ? 'var(--arci-teal)' : 'var(--arci-teal-light)',
                    color: isHighlighted ? '#FFFFFF' : 'var(--arci-teal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div className="arci-arch-layer-name">{layer.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--arci-teal-soft)', fontWeight: 500 }}>
                    {layer.titleZh}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="arci-arch-layer-desc" style={{ display: 'none' /* hidden on mobile, shown in detail */ }}>
                  {layer.subtitle}
                </span>
                <ChevronRight
                  size={16}
                  style={{
                    color: isHighlighted ? 'var(--arci-teal)' : 'var(--arci-border-strong)',
                    transform: isHighlighted ? 'translateX(4px)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Expanded Layer Detail Inspector */}
      {currentDetail && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--arci-teal)',
            borderRadius: 14,
            padding: 22,
            boxShadow: '0 4px 20px rgba(80, 105, 83, 0.08)',
            marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className="arci-pipeline-badge">
              {currentDetail.num} · {currentDetail.name}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)' }}>
              {currentDetail.titleZh}
            </span>
          </div>

          <p style={{ fontSize: 14, color: 'var(--arci-text-dark)', lineHeight: 1.6, marginBottom: 12 }}>
            {currentDetail.detail}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--arci-text-muted)',
              background: '#FAF9F5',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--arci-border-subtle)',
            }}
          >
            <strong style={{ color: 'var(--arci-teal-dark)' }}>底層核心規格：</strong>
            <span style={{ fontFamily: 'var(--kb-font-mono)' }}>{currentDetail.tech}</span>
          </div>
        </div>
      )}
    </div>
  )
}
export default ArciArchitectureStack
