import React from 'react'
import {
  ArrowRight,
  Activity,
  Calendar,
  Sparkles,
  ShieldCheck,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Settings,
  Shield,
  Fingerprint
} from 'lucide-react'
import { getQuality, type MeasurementRecord } from '../../services/kbpdApi'
import { HeroSection } from '../motion/HeroSection'
import { MetricGlassCard } from '../motion/MetricGlassCard'
import { QuickActionCard } from '../motion/QuickActionCard'
import { EmptyStateBlock } from '../motion/EmptyStateBlock'
import { MotionSection } from '../motion/MotionSection'
import { ArciRevealSection } from '../arci/ArciRevealSection'

interface HomePageProps {
  latestRecord: MeasurementRecord | null
  hasIdentity: boolean
  isDemo?: boolean
  onNavigate: (tab: 'home' | 'measure' | 'records' | 'insights' | 'summary' | 'settings' | 'arci') => void
  onQuickRegister: () => void
  onLoadDemo?: () => void
}

export const HomePage: React.FC<HomePageProps> = ({
  latestRecord,
  hasIdentity,
  isDemo = false,
  onNavigate,
  onQuickRegister,
  onLoadDemo,
}) => {
  const [showDemoConfirm, setShowDemoConfirm] = React.useState(false)

  // Extract latest record summary for Hero visual
  const heroSummary = latestRecord?.analysis
    ? {
        handSide:
          latestRecord.medication_phase
            ? `${(latestRecord.session?.handSide || (latestRecord as any).handSide) === 'RIGHT' ? '右手' : '左手'}・${latestRecord.medication_phase === 'post' ? '服藥後' : '服藥前'}`
            : (latestRecord.session?.handSide || (latestRecord as any).handSide) === 'RIGHT'
            ? '右手指尖開合'
            : '左手指尖開合',
        frequencyHz: latestRecord.tap_frequency_hz ?? latestRecord.analysis.metrics.averageFrequencyHz,
        validTaps: latestRecord.tap_count ?? latestRecord.analysis.metrics.validTapCount,
        dateText: new Date(
          latestRecord.measured_at || latestRecord.session?.createdAt || (latestRecord as any).createdAt || Date.now()
        ).toLocaleString('zh-TW', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
    : null

  return (
    <div className="kb-home-root">
      {/* 1. Cinematic Editorial Hero Section */}
      <HeroSection
        onStartMeasure={() => onNavigate('measure')}
        onViewRecords={() => onNavigate('records')}
        latestRecordSummary={heroSummary}
      />

      {/* 2. Identity Status Banner (Warm & Reassuring if not registered and not demo) */}
      {!hasIdentity && !isDemo && (
        <MotionSection delay={0.1} className="kb-alert kb-alert-info" style={{ marginBottom: 32 }}>
          <Key size={22} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 16 }}>尚未建立本機個人紀錄身分</strong>
            <p style={{ fontSize: 14, marginTop: 4, color: 'var(--kb-text-secondary)' }}>
              建立身分可確保您的量測數據只儲存於本機受控空間，並能在更換裝置或日後隨時使用憑證恢復。
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="kb-btn kb-btn-primary kb-btn-sm"
                onClick={onQuickRegister}
              >
                <Fingerprint size={15} />
                <span>建立我的紀錄</span>
              </button>
              <button
                type="button"
                className="kb-btn kb-btn-secondary kb-btn-sm"
                onClick={() => onNavigate('settings')}
              >
                <span>輸入既有憑證恢復</span>
              </button>
            </div>
          </div>
        </MotionSection>
      )}

      {/* Demo Banner */}
      {isDemo && (
        <MotionSection delay={0.1} className="kb-alert kb-alert-info" style={{ marginBottom: 24 }}>
          <Sparkles size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--kb-accent)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 15 }}>合成展示資料 / Synthetic Demo Data</strong>
              <span className="kb-badge kb-badge-accent" style={{ fontSize: 11, padding: '2px 8px' }}>
                DEMO-001 · 展示個案 A
              </span>
            </div>
            <p style={{ fontSize: 13, marginTop: 4, color: 'var(--kb-text-secondary)' }}>
              目前處於展示模式，載入 14 天時間序列（共 56 筆量測，含 55 筆合格與 1 筆故意設定之手部追蹤不足拒絕案例）。本資料為全虛構示範，不代表真實患者，不提供任何醫療診斷或用藥判定。
            </p>
          </div>
        </MotionSection>
      )}

      {/* 3. Quick Status & Latest Record Card Section */}
      <MotionSection delay={0.2} style={{ marginTop: 16, marginBottom: 40 }}>
        <div className="kb-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="kb-card-title">最近一次紀錄</h2>
            {isDemo && (
              <span className="kb-badge kb-badge-accent" style={{ fontSize: 11, padding: '2px 8px' }}>
                <Sparkles size={11} /> 展示模式
              </span>
            )}
          </div>
          {latestRecord && (
            <button
              type="button"
              className="kb-btn kb-btn-ghost kb-btn-sm"
              onClick={() => onNavigate('records')}
            >
              <span>查看完整紀錄</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {latestRecord && latestRecord.analysis ? (
          <div className="kb-card" style={{ padding: '28px 32px' }}>
            {/* Record Status Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                borderBottom: '1px solid var(--kb-divider)',
                paddingBottom: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="kb-badge kb-badge-primary">
                  {latestRecord.medication_phase
                    ? `${(latestRecord.session?.handSide || (latestRecord as any).handSide) === 'RIGHT' ? '右手' : '左手'}・${latestRecord.medication_phase === 'post' ? '服藥後' : '服藥前'}`
                    : (latestRecord.session?.handSide || (latestRecord as any).handSide) === 'RIGHT'
                    ? '右手指尖開合'
                    : '左手指尖開合'}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--kb-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Clock size={14} />
                  最近量測 {new Date(
                    latestRecord.measured_at || latestRecord.session?.createdAt || (latestRecord as any).createdAt || Date.now()
                  ).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div>
                {(() => {
                  const quality = getQuality(latestRecord.analysis)
                  const vfr = latestRecord.tracking_quality?.valid_frame_ratio ?? quality.effectiveTrackingRatio
                  return (latestRecord.quality_gate === 'PASS' || quality.status === 'QUALIFIED') ? (
                    <span className="kb-badge kb-badge-success">
                      <CheckCircle2 size={13} /> 品質 {Math.round(vfr * 100)}%
                    </span>
                  ) : (
                    <span className="kb-badge kb-badge-danger">
                      <AlertTriangle size={13} />
                      資料品質不足 ({Math.round(vfr * 100)}%)
                    </span>
                  )
                })()}
              </div>
            </div>

            {/* Metrics Glass Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <MetricGlassCard
                label="有效開合次數"
                value={latestRecord.tap_count ?? latestRecord.analysis.metrics.validTapCount}
                unit="次"
                subtext="20 秒連續量測"
                icon={Activity}
                status="normal"
                delay={0.05}
              />
              <MetricGlassCard
                label="平均動作頻率"
                value={latestRecord.tap_frequency_hz ?? latestRecord.analysis.metrics.averageFrequencyHz}
                unit="Hz"
                subtext="每秒指尖敲擊開合數"
                icon={Clock}
                status="success"
                delay={0.1}
              />
              <MetricGlassCard
                label="節奏變異度 (CV)"
                value={
                  latestRecord.rhythm_cv_pct !== null && latestRecord.rhythm_cv_pct !== undefined
                    ? latestRecord.rhythm_cv_pct
                    : latestRecord.analysis.metrics.intervalVariabilityCv !== null
                    ? Number((latestRecord.analysis.metrics.intervalVariabilityCv * 100).toFixed(1))
                    : null
                }
                unit="%"
                subtext="間隔時間穩定係數"
                icon={Sparkles}
                status="accent"
                delay={0.15}
              />
              <MetricGlassCard
                label="振幅衰減比率"
                value={
                  latestRecord.amplitude_decrement_pct !== null && latestRecord.amplitude_decrement_pct !== undefined
                    ? latestRecord.amplitude_decrement_pct
                    : latestRecord.analysis.metrics.amplitudeDecayRatio !== null
                    ? Number((latestRecord.analysis.metrics.amplitudeDecayRatio * 100).toFixed(1))
                    : null
                }
                unit="%"
                subtext="後段相較前段開合幅度變化"
                icon={Calendar}
                status="normal"
                delay={0.2}
              />
            </div>

            {/* Actions for this record */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="kb-btn kb-btn-secondary kb-btn-sm"
                onClick={() => onNavigate('records')}
              >
                <Calendar size={15} />
                <span>查看完整紀錄</span>
              </button>
              <button
                type="button"
                className="kb-btn kb-btn-accent kb-btn-sm"
                onClick={() => onNavigate('insights')}
              >
                <Sparkles size={15} />
                <span>ARCI 解讀</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <EmptyStateBlock
              title="還沒有量測紀錄"
              description="完成第一次指尖開合量測後，就能在這裡查看動作頻率、變化分析與資料品質。"
              primaryActionLabel="開始第一次量測"
              onPrimaryAction={() => onNavigate('measure')}
              secondaryActionLabel="查看回診摘要導覽"
              onSecondaryAction={() => onNavigate('summary')}
              showSteps={true}
            />
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button
                type="button"
                className="kb-btn kb-btn-secondary kb-btn-sm"
                style={{ color: 'var(--kb-text-secondary)', borderRadius: 20 }}
                onClick={() => setShowDemoConfirm(true)}
              >
                <Sparkles size={14} />
                <span>查看展示資料</span>
              </button>
            </div>
          </div>
        )}
      </MotionSection>

      {/* Confirmation Modal for Loading Demo Data */}
      {showDemoConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-confirm-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(20, 28, 22, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="kb-card"
            style={{
              maxWidth: 460,
              width: '100%',
              padding: '28px 32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              background: '#FFFDF9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Sparkles size={22} style={{ color: 'var(--kb-accent)' }} />
              <h3 id="demo-confirm-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                載入合成展示資料
              </h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--kb-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              即將載入虛構的合成展示資料（DEMO-001，共 56 筆 14 天連續量測、個人趨勢與 ARCI 結構化解讀）。
            </p>
            <div
              className="kb-alert kb-alert-info"
              style={{ fontSize: 13, marginBottom: 20, padding: '10px 14px' }}
            >
              <strong>不會覆寫正式紀錄</strong>：展示資料完全隔離於本機展示快取，可隨時於設定頁一鍵清除並還原為空白狀態。
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="kb-btn kb-btn-secondary kb-btn-sm"
                onClick={() => setShowDemoConfirm(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="kb-btn kb-btn-primary kb-btn-sm"
                onClick={() => {
                  setShowDemoConfirm(false)
                  onLoadDemo?.()
                }}
              >
                確認載入展示資料
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Feature Navigation Cards Grid (6 Modules Portal) */}
      <MotionSection delay={0.3} style={{ marginTop: 24, marginBottom: 40 }}>
        <div className="kb-card-header">
          <div>
            <h2 className="kb-card-title">功能導覽與日常工具</h2>
            <p className="kb-card-subtitle">
              完整銜接動作量測、歷史追蹤、文獻解讀與門診溝通的輔助模組
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          <QuickActionCard
            title="開始量測"
            description="20 秒手指開合測驗，透過視訊鏡頭或標準重放，精準擷取運動學特徵。"
            icon={Activity}
            badge="核心測驗"
            actionLabel="進行量測"
            accentColor="primary"
            onClick={() => onNavigate('measure')}
            delay={0.05}
          />

          <QuickActionCard
            title="紀錄與趨勢"
            description="互動式 SVG 趨勢折線圖與歷史卡片，觀察頻率、振幅衰減與穩定度推移。"
            icon={Calendar}
            badge="長期追蹤"
            actionLabel="檢視圖表"
            accentColor="primary"
            onClick={() => onNavigate('records')}
            delay={0.1}
          />

          <QuickActionCard
            title="ARCI 解讀"
            description="嚴謹五區塊結構化解讀報告，對照同齡健康文獻區間並清楚標註研究邊界。"
            icon={Sparkles}
            badge="文獻對照"
            actionLabel="閱讀報告"
            accentColor="accent"
            onClick={() => onNavigate('insights')}
            delay={0.15}
          />

          <QuickActionCard
            title="回診摘要"
            description="門診專用摘要格式，支援 7 天 / 30 天過濾、一鍵 JSON 匯出與列印友善設計。"
            icon={FileText}
            badge="門診溝通"
            actionLabel="整理摘要"
            accentColor="primary"
            onClick={() => onNavigate('summary')}
            delay={0.2}
          />

          <QuickActionCard
            title="設定與隱私"
            description="管理本機紀錄身分憑證、檢視 SQLite 配額，支援全資料可驗證串聯抹除。"
            icon={Settings}
            badge="本地防護"
            actionLabel="隱私設定"
            accentColor="neutral"
            onClick={() => onNavigate('settings')}
            delay={0.25}
          />

          <QuickActionCard
            title="ARCI 核心架構"
            description="受限制決策與證據處理核心，堅持「證據先於推論」，探索 6 節點管線。"
            icon={Sparkles}
            badge="底層技術"
            actionLabel="探索 ARCI"
            accentColor="accent"
            onClick={() => onNavigate('arci')}
            delay={0.3}
          />
        </div>
      </MotionSection>

      {/* 5. ARCI Reveal Section: Behind KineBalance */}
      <MotionSection delay={0.35}>
        <ArciRevealSection onExploreArci={() => onNavigate('arci')} />
      </MotionSection>

      {/* 6. Trust & Limitation Statement Card */}
      <MotionSection delay={0.4}>
        <div className="kb-trust-card">
          <div className="kb-trust-icon-box">
            <ShieldCheck size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="kb-trust-title">專業信任、隱私安全與臨床邊界聲明</h3>
            <p className="kb-trust-text">
              <strong>研究與工程原型，用於動作紀錄與變化觀察，不提供診斷或用藥建議。</strong>{' '}
              本系統之影像運算均於您的本機端即時進行，原始影像不作未經授權之上傳；所有結構化數據保存於本機受控資料庫。若您觀察到持續之動作障礙或生活困擾，請攜帶本系統之「回診摘要」諮詢專業神經科專科醫師。
            </p>
          </div>
        </div>
      </MotionSection>
    </div>
  )
}
export default HomePage
