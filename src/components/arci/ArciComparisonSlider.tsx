import React, { useState } from 'react'
import { Check, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'

export const ArciComparisonSlider: React.FC = () => {
  // sliderPosition: 0 (Without ARCI) to 100 (With ARCI), default 75
  const [sliderPosition, setSliderPosition] = useState<number>(75)

  const isWithArciDominant = sliderPosition >= 50

  return (
    <div className="arci-comparison-wrapper">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--arci-teal)',
            textTransform: 'uppercase',
          }}
        >
          Architectural Divergence
        </span>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--arci-teal-dark)',
            marginTop: 4,
          }}
        >
          架構對比：直接生成 vs. 受控推論管線
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--arci-text-muted)',
            maxWidth: 600,
            margin: '6px auto 0 auto',
          }}
        >
          拖曳滑桿或點擊切換，觀察一般語言模型直接生成與 ARCI 受控決策管線在醫療動作量測中的根本差異。
        </p>
      </div>

      {/* Slider Control Bar */}
      <div className="arci-slider-control-bar">
        <button
          type="button"
          className={`arci-slider-pill-btn ${!isWithArciDominant ? 'active' : ''}`}
          onClick={() => setSliderPosition(15)}
        >
          Without ARCI
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={sliderPosition}
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          className="arci-slider-input"
          aria-label="切換 Without ARCI 與 With ARCI 架構對比"
        />

        <button
          type="button"
          className={`arci-slider-pill-btn ${isWithArciDominant ? 'active' : ''}`}
          onClick={() => setSliderPosition(85)}
        >
          With ARCI (Controlled)
        </button>
      </div>

      {/* Comparison Panels Grid */}
      <div className="arci-comparison-panels-grid">
        {/* Left Panel: Without ARCI */}
        <div
          className={`arci-compare-card ${!isWithArciDominant ? 'focused' : ''}`}
          style={{
            opacity: isWithArciDominant ? 0.7 : 1,
          }}
        >
          <div className="arci-compare-card-title" style={{ color: 'var(--arci-text-muted)' }}>
            <span>WITHOUT ARCI</span>
          </div>
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#EAEAEA',
              color: '#555555',
              marginBottom: 12,
            }}
          >
            Direct generation (直接生成)
          </div>
          <p style={{ fontSize: 13, color: 'var(--arci-text-muted)', lineHeight: 1.5 }}>
            將未經標準化之原始描述直接交給大型語言模型進行預測，容易出現因無對照基準而產生的幻覺推論。
          </p>

          <div className="arci-compare-flow-list">
            <div className="arci-flow-node-item">
              <span>01. User Data (使用者輸入)</span>
              <small>非結構自述</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item">
              <span>02. LLM / Black Box (黑盒模型)</span>
              <small>機率性補完</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item">
              <span>03. Answer (文字回答)</span>
              <small>缺乏限制邊界</small>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: '#F5F5F3',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--arci-text-muted)',
              lineHeight: 1.5,
              border: '1px dashed #D0D0CA',
            }}
          >
            <strong>特徵</strong>：速度快但難以驗證；當資料不足時易強行拼湊答案，無法回溯具體依據與推論前提。
          </div>
        </div>

        {/* Right Panel: With ARCI */}
        <div
          className={`arci-compare-card ${isWithArciDominant ? 'focused' : ''}`}
          style={{
            opacity: !isWithArciDominant ? 0.7 : 1,
          }}
        >
          <div className="arci-compare-card-title" style={{ color: 'var(--arci-teal)' }}>
            <Sparkles size={16} />
            <span>WITH ARCI</span>
          </div>
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--arci-teal-light)',
              color: 'var(--arci-teal-dark)',
              marginBottom: 12,
            }}
          >
            Controlled reasoning pipeline (受控推論管線)
          </div>
          <p style={{ fontSize: 13, color: 'var(--arci-text-muted)', lineHeight: 1.5 }}>
            嚴格執行「證據先於推論」。原始訊號需依序通過身分確認、文獻檢索、邊界過濾與品質限制，才准予輸出。
          </p>

          <div className="arci-compare-flow-list">
            <div className="arci-flow-node-item highlighted">
              <span>01. User Data</span>
              <small>21 點運動學</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item highlighted">
              <span>02. Evidence Retrieval</span>
              <small>同儕審查文獻</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item highlighted">
              <span>03. Validation</span>
              <small>追蹤品質門檻</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item highlighted">
              <span>04. Constraints</span>
              <small>禁止診斷/調藥</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item highlighted">
              <span>05. Bounded Reasoning</span>
              <small>結構化比對</small>
            </div>
            <div className="arci-flow-arrow">↓</div>
            <div className="arci-flow-node-item highlighted">
              <span>06. Output + Immutable Trace</span>
              <small>五段報告 + SHA-256</small>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'var(--arci-teal-light)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--arci-teal-dark)',
              lineHeight: 1.5,
              border: '1px solid var(--arci-border-strong)',
            }}
          >
            <strong>特徵</strong>：當證據不足時主動拒絕無效推論（保留 UNKNOWN 狀態）；每一個結論均具備完整審計回溯鏈。
          </div>
        </div>
      </div>
    </div>
  )
}
export default ArciComparisonSlider
