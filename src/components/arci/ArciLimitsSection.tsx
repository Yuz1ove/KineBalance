import React from 'react'
import { Stethoscope, FileSearch, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react'

export const ArciLimitsSection: React.FC = () => {
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
          Safety & Boundaries
        </span>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--arci-teal-dark)',
            marginTop: 4,
          }}
        >
          BUILT TO KNOW ITS LIMITS
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--arci-text-muted)',
            maxWidth: 620,
            margin: '6px auto 0 auto',
          }}
        >
          ARCI 最核心的價值不是回答更多問題，而是在目前的數據與證據下，清楚辨識「哪些事情可以被說出來，哪些事情還不能」。
        </p>
      </div>

      {/* 3 Core Limits Cards */}
      <div className="arci-limits-grid">
        {/* Card 1 */}
        <div className="arci-limit-card">
          <div className="arci-limit-icon-box">
            <Stethoscope size={22} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)', marginBottom: 8 }}>
            Not a diagnosis engine
          </h4>
          <p style={{ fontSize: 13, color: 'var(--arci-text-muted)', lineHeight: 1.6 }}>
            <strong>不自行宣稱醫療診斷</strong>。不替醫師做出「帕金森氏症確診」或「分期判定」的結論，嚴格遵守客觀運動學觀測的角色，不取代 MDS-UPDRS 正式臨床量表。
          </p>
        </div>

        {/* Card 2 */}
        <div className="arci-limit-card">
          <div className="arci-limit-icon-box">
            <FileSearch size={22} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)', marginBottom: 8 }}>
            Doesn't invent missing evidence
          </h4>
          <p style={{ fontSize: 13, color: 'var(--arci-text-muted)', lineHeight: 1.6 }}>
            <strong>資料不存在時，不自行補完</strong>。當視訊鏡頭掉幀、光線過暗或手指移出畫面時，絕不利用機器學習猜測手指開合軌跡，而是忠實標記追蹤丟失與數據缺口。
          </p>
        </div>

        {/* Card 3 */}
        <div className="arci-limit-card">
          <div className="arci-limit-icon-box">
            <ShieldCheck size={22} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)', marginBottom: 8 }}>
            Can refuse unsupported conclusions
          </h4>
          <p style={{ fontSize: 13, color: 'var(--arci-text-muted)', lineHeight: 1.6 }}>
            <strong>當證據不足時，允許結果保持 UNKNOWN</strong>。拒絕強迫輸出答案。UNKNOWN 並非系統異常，而是 ARCI 經由嚴密驗收後的受控安全狀態。
          </p>
        </div>
      </div>

      {/* Formal System State Indicators */}
      <div className="arci-state-indicators-row">
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--arci-teal-dark)', marginRight: 6 }}>
          ARCI 正式系統狀態 (Formal System States)：
        </span>

        <span className="arci-state-tag supported">
          <CheckCircle2 size={13} />
          <span>SUPPORTED · 證據充分</span>
        </span>

        <span className="arci-state-tag partial">
          <AlertTriangle size={13} />
          <span>PARTIAL · 部分支持 (無歷史基線)</span>
        </span>

        <span className="arci-state-tag unknown">
          <HelpCircle size={13} />
          <span>UNKNOWN · 資料不足 (拒絕臆測)</span>
        </span>

        <span className="arci-state-tag rejected">
          <XCircle size={13} />
          <span>REJECTED · 超出系統邊界 (禁止事項)</span>
        </span>
      </div>
    </div>
  )
}
export default ArciLimitsSection
