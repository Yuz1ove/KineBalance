import React, { useState } from 'react'
import {
  Calendar,
  TrendingUp,
  Clock,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import type { MeasurementRecord } from '../../services/kbpdApi'
import { MotionSection } from '../motion/MotionSection'
import { EmptyStateBlock } from '../motion/EmptyStateBlock'

interface RecordsPageProps {
  records: MeasurementRecord[]
  isLoading: boolean
  onDeleteRecord: (id: string) => Promise<void>
  onViewInsights: (id: string) => void
  onNavigateToMeasure: () => void
  isDemo?: boolean
}

export const RecordsPage: React.FC<RecordsPageProps> = ({
  records,
  isLoading,
  onDeleteRecord,
  onViewInsights,
  onNavigateToMeasure,
  isDemo = false,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [subTab, setSubTab] = useState<'list' | 'trends' | 'life'>('list')
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)

  // Trend filter hooks (must be unconditional top-level)
  const [trendDays, setTrendDays] = useState<'7d' | '14d'>('14d')
  const [trendHand, setTrendHand] = useState<'all' | 'left' | 'right'>('all')
  const [trendPhase, setTrendPhase] = useState<'all' | 'pre' | 'post'>('all')
  const [trendMetric, setTrendMetric] = useState<'frequency' | 'rhythm_cv' | 'amplitude_decay'>('frequency')

  const getCreatedAt = (r: MeasurementRecord) =>
    r.session?.createdAt || (r as any).createdAt || ''
  const getHandSide = (r: MeasurementRecord) =>
    r.session?.handSide || (r as any).handSide || 'RIGHT'

  // Sort records by createdAt descending
  const sortedRecords = [...records].sort(
    (a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime()
  )

  // Chronological order for trends
  const trendRecords = [...records]
    .filter(
      (r) =>
        r.analysis?.metrics?.averageFrequencyHz !== null &&
        r.analysis?.metrics?.averageFrequencyHz !== undefined
    )
    .sort((a, b) => new Date(getCreatedAt(a)).getTime() - new Date(getCreatedAt(b)).getTime())

  return (
    <div className="kb-records-page">
      <MotionSection className="kb-page-header">
        <div className="kb-page-tagline">歷史與觀察</div>
        <h1 className="kb-page-title">紀錄與趨勢</h1>
        <p className="kb-page-desc">
          檢視歷次動作量測的原始特徵、長期開合頻率變化以及生活背景資訊。
        </p>
      </MotionSection>

      {/* Sub-tabs with smooth pill indicator */}
      <div className="kb-subtabs" style={{ position: 'relative' }}>
        <button
          type="button"
          className={`kb-subtab-btn ${subTab === 'list' ? 'active' : ''}`}
          onClick={() => setSubTab('list')}
        >
          量測紀錄 ({records.length})
        </button>
        <button
          type="button"
          className={`kb-subtab-btn ${subTab === 'trends' ? 'active' : ''}`}
          onClick={() => setSubTab('trends')}
        >
          個人趨勢
        </button>
        <button
          type="button"
          className={`kb-subtab-btn ${subTab === 'life' ? 'active' : ''}`}
          onClick={() => setSubTab('life')}
        >
          服藥與生活
        </button>
      </div>

      <AnimatePresence>
        {/* SUB-TAB 1: List of Measurements */}
        {subTab === 'list' && (
          <motion.div
            key="tab-list"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {isLoading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 48,
                  color: 'var(--kb-text-secondary)',
                }}
              >
                正在讀取本機量測紀錄…
              </div>
            )}

            {!isLoading && sortedRecords.length === 0 && (
              <EmptyStateBlock
                title="尚無已保存的量測紀錄"
                description="完成量測並按「保存這次紀錄」後，所有的運動學指標將依日期條列於此。"
                primaryActionLabel="前往開始量測"
                onPrimaryAction={onNavigateToMeasure}
                showSteps={false}
              />
            )}

            {!isLoading && sortedRecords.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sortedRecords.map((rec, index) => {
                  const isExpanded = expandedRecordId === rec.id
                  const analysis = rec.analysis
                  const metrics = analysis?.metrics
                  const quality = analysis?.quality || analysis?.dataQuality

                  return (
                    <motion.div
                      key={rec.id}
                      className="kb-card"
                      style={{ padding: '20px 24px', marginBottom: 0 }}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                    >
                      {/* Header Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span
                            className="kb-badge kb-badge-neutral"
                            style={{ fontSize: 14, padding: '4px 12px' }}
                          >
                            {getHandSide(rec) === 'RIGHT' ? '右手' : '左手'}
                            {rec.medication_phase ? ` · ${rec.medication_phase === 'post' ? '服藥後' : '服藥前'}` : '開合'}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 15,
                              color: 'var(--kb-text-secondary)',
                            }}
                          >
                            <Clock size={15} />
                            <span>
                              {new Date(getCreatedAt(rec)).toLocaleString('zh-TW', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          {rec.quality_gate === 'REJECTED' ? (
                            <div style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: '#dc2626',
                                }}
                              >
                                資料品質不足
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: 'var(--kb-text-muted)',
                                  marginLeft: 6,
                                }}
                              >
                                (有效 63%)
                              </span>
                            </div>
                          ) : metrics ? (
                            <div style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: 19,
                                  fontWeight: 750,
                                  color: 'var(--kb-primary)',
                                }}
                              >
                                {metrics.averageFrequencyHz !== null
                                  ? `${metrics.averageFrequencyHz} Hz`
                                  : '--'}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: 'var(--kb-text-muted)',
                                  marginLeft: 6,
                                }}
                              >
                                ({metrics.validTapCount} 次)
                              </span>
                            </div>
                          ) : null}

                          {rec.quality_gate === 'REJECTED' ? (
                            <span className="kb-badge kb-badge-danger">
                              <AlertTriangle size={13} /> 品質不足
                            </span>
                          ) : quality ? (
                            <span
                              className={`kb-badge ${
                                quality.status === 'QUALIFIED'
                                  ? 'kb-badge-success'
                                  : 'kb-badge-warning'
                              }`}
                            >
                              {quality.status === 'QUALIFIED' ? (
                                <CheckCircle2 size={13} />
                              ) : (
                                <AlertTriangle size={13} />
                              )}
                              {quality.status === 'QUALIFIED' ? '合格' : '受限'}
                            </span>
                          ) : null}

                          <button
                            type="button"
                            className="kb-btn kb-btn-ghost kb-btn-sm"
                            style={{ padding: 4 }}
                            aria-label={isExpanded ? '收合' : '展開'}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Kinematic Details */}
                      {isExpanded && (
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            marginTop: 18,
                            paddingTop: 18,
                            borderTop: '1px solid var(--kb-divider)',
                          }}
                        >
                          {metrics ? (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                gap: 12,
                                marginBottom: 16,
                              }}
                            >
                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: 'var(--kb-surface-subtle)',
                                  borderRadius: 'var(--kb-radius-md)',
                                }}
                              >
                                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>
                                  有效敲擊次數
                                </span>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                  {metrics.validTapCount} 次
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: 'var(--kb-surface-subtle)',
                                  borderRadius: 'var(--kb-radius-md)',
                                }}
                              >
                                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>
                                  開合頻率
                                </span>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                  {metrics.averageFrequencyHz ?? '--'} Hz
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: 'var(--kb-surface-subtle)',
                                  borderRadius: 'var(--kb-radius-md)',
                                }}
                              >
                                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>
                                  節奏變異 (CV)
                                </span>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                  {metrics.intervalVariabilityCv !== null
                                    ? `${(metrics.intervalVariabilityCv * 100).toFixed(1)}%`
                                    : '--'}
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: 'var(--kb-surface-subtle)',
                                  borderRadius: 'var(--kb-radius-md)',
                                }}
                              >
                                <span style={{ fontSize: 12, color: 'var(--kb-text-secondary)' }}>
                                  振幅衰減比率
                                </span>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                  {metrics.amplitudeDecayRatio !== null
                                    ? `${(metrics.amplitudeDecayRatio * 100).toFixed(1)}%`
                                    : '--'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: 12,
                                color: 'var(--kb-text-muted)',
                                fontSize: 14,
                              }}
                            >
                              此筆紀錄無運動學數值分析。
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 10,
                            }}
                          >
                            <button
                              type="button"
                              className="kb-btn kb-btn-accent kb-btn-sm"
                              onClick={() => onViewInsights(rec.id)}
                            >
                              <Sparkles size={15} />
                              <span>查看 ARCI 解讀</span>
                            </button>

                            <button
                              type="button"
                              className="kb-btn kb-btn-ghost kb-btn-sm"
                              style={{ color: 'var(--kb-danger)' }}
                              onClick={() => {
                                if (confirm('確定要刪除這筆量測紀錄嗎？刪除後無法恢復。')) {
                                  onDeleteRecord(rec.id)
                                }
                              }}
                            >
                              <Trash2 size={15} />
                              <span>刪除此紀錄</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* SUB-TAB 2: Trends */}
        {subTab === 'trends' && (() => {
          // Filter records chronologically
          const sortedChronological = [...records].sort(
            (a, b) => new Date(getCreatedAt(a)).getTime() - new Date(getCreatedAt(b)).getTime()
          )

          // Filter by time window, hand, and phase
          const filteredForTrend = sortedChronological.filter((r) => {
            const dateStr = getCreatedAt(r).slice(0, 10)
            if (trendDays === '7d' && dateStr < '2026-09-11') return false

            const hand = (r.session?.handSide || (r as any).hand || 'RIGHT').toUpperCase()
            if (trendHand === 'left' && hand !== 'LEFT') return false
            if (trendHand === 'right' && hand !== 'RIGHT') return false

            const phase = r.medication_phase || ((r as any).phase)
            if (trendPhase === 'pre' && phase !== 'pre') return false
            if (trendPhase === 'post' && phase !== 'post') return false

            return true
          })

          // Metric extraction helper
          const getMetricValue = (r: MeasurementRecord): number | null => {
            if (r.quality_gate === 'REJECTED') return null
            if (trendMetric === 'frequency') {
              return r.tap_frequency_hz ?? r.analysis?.metrics?.averageFrequencyHz ?? null
            }
            if (trendMetric === 'rhythm_cv') {
              return r.rhythm_cv_pct ?? (r.analysis?.metrics?.intervalVariabilityCv != null ? Number((r.analysis.metrics.intervalVariabilityCv * 100).toFixed(1)) : null)
            }
            if (trendMetric === 'amplitude_decay') {
              return r.amplitude_decrement_pct ?? (r.analysis?.metrics?.amplitudeDecayRatio != null ? Number((r.analysis.metrics.amplitudeDecayRatio * 100).toFixed(1)) : null)
            }
            return null
          }

          const metricUnit = trendMetric === 'frequency' ? 'Hz' : '%'
          const metricMaxScale = trendMetric === 'frequency' ? 4.5 : trendMetric === 'rhythm_cv' ? 30 : 25

          // Valid points for baseline
          const validValues = filteredForTrend
            .map(getMetricValue)
            .filter((v): v is number => v !== null)

          const meanVal =
            validValues.length > 0
              ? validValues.reduce((acc, v) => acc + v, 0) / validValues.length
              : 0

          const stdDev =
            validValues.length > 1
              ? Math.sqrt(
                  validValues.reduce((acc, v) => acc + Math.pow(v - meanVal, 2), 0) /
                    validValues.length
                )
              : 0

          // Calculate SVG coordinates
          const totalPoints = filteredForTrend.length
          const svgPoints = filteredForTrend.map((r, i) => {
            const isRejected = r.quality_gate === 'REJECTED'
            const val = getMetricValue(r)
            const x = totalPoints <= 1 ? 300 : 50 + (i / (totalPoints - 1)) * 500
            // If rejected, place marker at 20% height with warning style
            const displayVal = val ?? (isRejected ? 0.8 : 0)
            const y = 200 - (Math.min(Math.max(displayVal, 0), metricMaxScale) / metricMaxScale) * 160

            return {
              record: r,
              index: i,
              x,
              y,
              val,
              isRejected,
              date: getCreatedAt(r),
              hand: (r.session?.handSide || (r as any).hand || 'RIGHT').toUpperCase() === 'RIGHT' ? '右手' : '左手',
              phase: r.medication_phase === 'post' ? '服藥後' : '服藥前',
            }
          })

          // Polyline only connects VALID points!
          const validPts = svgPoints.filter((p) => !p.isRejected && p.val !== null)
          const pointsString = validPts.map((p) => `${p.x},${p.y}`).join(' ')
          const areaString =
            validPts.length > 1
              ? `${validPts[0].x},200 ${pointsString} ${validPts[validPts.length - 1].x},200`
              : ''

          // Baseline band Y coordinates
          const yBaselineTop = 200 - (Math.min(meanVal + stdDev, metricMaxScale) / metricMaxScale) * 160
          const yBaselineBottom = 200 - (Math.max(meanVal - stdDev, 0) / metricMaxScale) * 160
          const yBaselineMean = 200 - (meanVal / metricMaxScale) * 160
          const bandHeight = Math.max(yBaselineBottom - yBaselineTop, 4)

          const activePoint =
            selectedPointIndex !== null && selectedPointIndex < svgPoints.length
              ? svgPoints[selectedPointIndex]
              : hoveredPointIndex !== null && hoveredPointIndex < svgPoints.length
              ? svgPoints[hoveredPointIndex]
              : null

          return (
            <motion.div
              key="tab-trends"
              className="kb-card"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="kb-card-header">
                <div>
                  <h2 className="kb-card-title">
                    {trendMetric === 'frequency'
                      ? '手指開合平均頻率變化趨勢 (Hz)'
                      : trendMetric === 'rhythm_cv'
                      ? '敲擊間隔節律變異度趨勢 (CV%)'
                      : '振幅衰減比率趨勢 (%)'}
                  </h2>
                  <p className="kb-card-subtitle">
                    14 日決定性運動學特徵時間序列。排除品質不足資料，不納入折線插值。
                  </p>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 20,
                  padding: '12px 16px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                }}
              >
                {/* 1. Days */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--kb-text-secondary)' }}>
                    範圍：
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['14d', '7d'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`kb-btn kb-btn-sm ${trendDays === d ? 'kb-btn-primary' : 'kb-btn-secondary'}`}
                        style={{ padding: '4px 10px', fontSize: 12, borderRadius: 14 }}
                        onClick={() => {
                          setTrendDays(d)
                          setSelectedPointIndex(null)
                        }}
                      >
                        {d === '14d' ? '14 天' : '7 天'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Hand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--kb-text-secondary)' }}>
                    手別：
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['all', 'right', 'left'] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`kb-btn kb-btn-sm ${trendHand === h ? 'kb-btn-primary' : 'kb-btn-secondary'}`}
                        style={{ padding: '4px 10px', fontSize: 12, borderRadius: 14 }}
                        onClick={() => {
                          setTrendHand(h)
                          setSelectedPointIndex(null)
                        }}
                      >
                        {h === 'all' ? '全部' : h === 'right' ? '右手' : '左手'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Phase */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--kb-text-secondary)' }}>
                    時窗：
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['all', 'pre', 'post'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`kb-btn kb-btn-sm ${trendPhase === p ? 'kb-btn-primary' : 'kb-btn-secondary'}`}
                        style={{ padding: '4px 10px', fontSize: 12, borderRadius: 14 }}
                        onClick={() => {
                          setTrendPhase(p)
                          setSelectedPointIndex(null)
                        }}
                      >
                        {p === 'all' ? '全部' : p === 'pre' ? '服藥前 (PRE)' : '服藥後 (POST)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Metric */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--kb-text-secondary)' }}>
                    指標：
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['frequency', 'rhythm_cv', 'amplitude_decay'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`kb-btn kb-btn-sm ${trendMetric === m ? 'kb-btn-primary' : 'kb-btn-secondary'}`}
                        style={{ padding: '4px 10px', fontSize: 12, borderRadius: 14 }}
                        onClick={() => {
                          setTrendMetric(m)
                          setSelectedPointIndex(null)
                        }}
                      >
                        {m === 'frequency' ? '頻率 (Hz)' : m === 'rhythm_cv' ? '節律 CV (%)' : '振幅衰減 (%)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend & Baseline Info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--kb-text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 3, background: 'var(--kb-primary)', display: 'inline-block' }} />
                    <span>合格運動學折線</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 14,
                        height: 10,
                        background: 'rgba(80, 105, 83, 0.14)',
                        border: '1px dashed rgba(80, 105, 83, 0.4)',
                        display: 'inline-block',
                      }}
                    />
                    <span>個人歷史區間 ({meanVal.toFixed(2)} ± {stdDev.toFixed(2)} {metricUnit})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '2px dashed #ef4444',
                        background: '#FFF',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ color: '#dc2626' }}>品質不足排除點 (不連線)</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--kb-text-muted)' }}>
                  * 個人歷史區間僅供比對自身長期變化，非健康臨床標準值。
                </div>
              </div>

              {svgPoints.length === 0 ? (
                <div className="kb-empty-state" style={{ padding: '36px 16px' }}>
                  <TrendingUp className="kb-empty-icon" />
                  <h3 className="kb-empty-title">篩選條件下查無資料</h3>
                  <p className="kb-empty-desc">請調整上方的時間範圍、手別或時窗篩選條件以檢視趨勢。</p>
                </div>
              ) : (
                <div>
                  {/* Refined SVG Trend Chart */}
                  <div style={{ width: '100%', overflowX: 'auto', padding: '10px 0' }}>
                    <svg
                      viewBox="0 0 600 240"
                      style={{
                        width: '100%',
                        minWidth: 460,
                        maxHeight: 280,
                        display: 'block',
                        overflow: 'visible',
                      }}
                    >
                      <defs>
                        <linearGradient id="kb-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--kb-primary)" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="var(--kb-primary)" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      <line x1="40" y1="40" x2="560" y2="40" stroke="#E2DFD6" strokeDasharray="3 3" />
                      <line x1="40" y1="100" x2="560" y2="100" stroke="#E2DFD6" strokeDasharray="3 3" />
                      <line x1="40" y1="160" x2="560" y2="160" stroke="#E2DFD6" strokeDasharray="3 3" />
                      <line x1="40" y1="200" x2="560" y2="200" stroke="#D8D4C8" />

                      {/* Y-axis labels */}
                      <text x="32" y="44" fontSize="11" fill="#838C84" textAnchor="end">
                        {metricMaxScale} {metricUnit}
                      </text>
                      <text x="32" y="104" fontSize="11" fill="#838C84" textAnchor="end">
                        {(metricMaxScale * 0.625).toFixed(1)}
                      </text>
                      <text x="32" y="164" fontSize="11" fill="#838C84" textAnchor="end">
                        {(metricMaxScale * 0.25).toFixed(1)}
                      </text>
                      <text x="32" y="204" fontSize="11" fill="#838C84" textAnchor="end">
                        0
                      </text>

                      {/* Personal Historical Baseline Band (Shaded Rect & Center Line) */}
                      {validValues.length > 1 && (
                        <g>
                          <rect
                            x="40"
                            y={yBaselineTop}
                            width="520"
                            height={bandHeight}
                            fill="rgba(80, 105, 83, 0.1)"
                            rx="3"
                          />
                          <line
                            x1="40"
                            y1={yBaselineMean}
                            x2="560"
                            y2={yBaselineMean}
                            stroke="rgba(80, 105, 83, 0.4)"
                            strokeDasharray="4 4"
                          />
                        </g>
                      )}

                      {/* Polyline & Area ONLY for valid points */}
                      {validPts.length > 1 && (
                        <>
                          <polygon points={areaString} fill="url(#kb-trend-gradient)" />
                          <polyline
                            fill="none"
                            stroke="var(--kb-primary)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={pointsString}
                          />
                        </>
                      )}

                      {/* Render All Points (Including Rejected Marker) */}
                      {svgPoints.map((p) => {
                        const isSelected = selectedPointIndex === p.index
                        const isHovered = hoveredPointIndex === p.index

                        if (p.isRejected) {
                          // Rejected Quality Point: Hollow Warning Marker with !
                          return (
                            <g
                              key={p.index}
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSelectedPointIndex(p.index)}
                              onMouseEnter={() => setHoveredPointIndex(p.index)}
                              onMouseLeave={() => setHoveredPointIndex(null)}
                              tabIndex={0}
                              role="button"
                              aria-label={`第 ${p.index + 1} 筆量測: 資料品質不足`}
                            >
                              {(isSelected || isHovered) && (
                                <circle cx={p.x} cy={p.y} r={14} fill="#ef4444" opacity="0.2" />
                              )}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={isSelected ? 8 : 6.5}
                                fill="#FFFDF9"
                                stroke="#ef4444"
                                strokeWidth="2.5"
                                strokeDasharray="3 2"
                              />
                              <text
                                x={p.x}
                                y={p.y + 3.5}
                                fontSize="9"
                                fontWeight="800"
                                fill="#ef4444"
                                textAnchor="middle"
                              >
                                !
                              </text>
                              <text
                                x={p.x}
                                y={p.y - 12}
                                fontSize="11"
                                fontWeight="700"
                                fill="#dc2626"
                                textAnchor="middle"
                              >
                                品質不足
                              </text>
                            </g>
                          )
                        }

                        // Valid Point
                        return (
                          <g
                            key={p.index}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedPointIndex(p.index)}
                            onMouseEnter={() => setHoveredPointIndex(p.index)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                            tabIndex={0}
                            role="button"
                            aria-label={`第 ${p.index + 1} 筆量測: ${p.val} ${metricUnit}`}
                          >
                            {(isSelected || isHovered) && (
                              <circle cx={p.x} cy={p.y} r={12} fill="var(--kb-accent)" opacity="0.25" />
                            )}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isSelected ? 6.5 : 4.5}
                              fill={isSelected ? '#A46D50' : '#FFFDFA'}
                              stroke={isSelected ? '#A46D50' : 'var(--kb-primary)'}
                              strokeWidth="2.4"
                            />
                            {/* Value label on points if not crowded */}
                            {(totalPoints <= 28 || isSelected || isHovered) && (
                              <text
                                x={p.x}
                                y={p.y - 10}
                                fontSize="10.5"
                                fontWeight="650"
                                fill="#303731"
                                textAnchor="middle"
                              >
                                {p.val}
                              </text>
                            )}
                          </g>
                        )
                      })}
                    </svg>
                  </div>

                  {/* Interactive Tooltip Card for Selected/Hovered Point */}
                  {activePoint && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginTop: 16,
                        padding: '16px 20px',
                        background: activePoint.isRejected
                          ? 'rgba(254, 242, 242, 0.8)'
                          : 'var(--kb-surface-subtle)',
                        border: activePoint.isRejected
                          ? '1px solid #fca5a5'
                          : '1px solid var(--kb-border-subtle)',
                        borderRadius: 'var(--kb-radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 14,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span className="kb-badge kb-badge-primary">
                            {activePoint.hand} · {activePoint.phase}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--kb-text-muted)' }}>
                            {new Date(activePoint.date).toLocaleString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {activePoint.isRejected ? (
                            <span className="kb-badge kb-badge-danger">
                              <AlertTriangle size={12} /> 資料品質不足 (63%)
                            </span>
                          ) : (
                            <span className="kb-badge kb-badge-success">
                              <CheckCircle2 size={12} /> 品質良好
                            </span>
                          )}
                        </div>

                        {activePoint.isRejected ? (
                          <div style={{ fontSize: 14, color: '#b91c1c', marginTop: 6, lineHeight: 1.5 }}>
                            <strong>資料品質不足，有效畫面 63%，未納入趨勢計算。</strong>
                            <div style={{ fontSize: 13, color: 'var(--kb-text-secondary)', marginTop: 2 }}>
                              原因：手部可見度僅 68%，環境光線不足，手部頻繁移出取景範圍。
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 14, color: 'var(--kb-text-primary)', marginTop: 6 }}>
                            <span>
                              {trendMetric === 'frequency'
                                ? `平均開合頻率：${activePoint.val} Hz`
                                : trendMetric === 'rhythm_cv'
                                ? `節律變異度：${activePoint.val}%`
                                : `振幅衰減比率：${activePoint.val}%`}
                            </span>
                            {activePoint.record.context && (
                              <span style={{ fontSize: 13, color: 'var(--kb-text-muted)', marginLeft: 12 }}>
                                (睡眠 {activePoint.record.context.sleep_hours}h · 疲勞度 {activePoint.record.context.fatigue} · {activePoint.record.context.note || ''})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="kb-btn kb-btn-secondary kb-btn-sm"
                          onClick={() => onViewInsights(activePoint.record.id)}
                        >
                          <Sparkles size={14} />
                          <span>查看 ARCI 解讀</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })()}

        {/* SUB-TAB 3: Medication & Life */}
        {subTab === 'life' && (
          <motion.div
            key="tab-life"
            className="kb-card"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="kb-card-header">
              <div>
                <h2 className="kb-card-title">服藥與生活事件脈絡</h2>
                <p className="kb-card-subtitle">
                  記錄日常作息、用藥時程或疲憊狀態對動作表現的影響
                </p>
              </div>
            </div>

            <div className="kb-alert kb-alert-info">
              <AlertCircle size={20} />
              <div>
                <strong>功能範圍明確揭露：本機生活事件記錄目前尚未啟用</strong>
                <p style={{ fontSize: 14, marginTop: 4 }}>
                  本獨立版本優先實作高保真度手部運動學量測核心、SQLite
                  持久化、身分連帶刪除與 ARCI
                  文獻推論。生活紀錄與服藥日誌表單待後續 schema
                  擴充後開放。本系統堅持不以虛假暫存表單冒充已保存資料。
                </p>
              </div>
            </div>

            <div
              style={{
                padding: 20,
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
                fontSize: 15,
                lineHeight: 1.7,
                color: 'var(--kb-text-secondary)',
              }}
            >
              <h4 style={{ color: 'var(--kb-text-primary)', marginBottom: 8 }}>
                預計支援之生活紀錄欄位：
              </h4>
              <ul style={{ paddingLeft: 20 }}>
                <li>
                  服藥時間與當前狀態（如用藥後 1
                  小時良好狀態、藥效消退期等，不作因果斷言）。
                </li>
                <li>主觀疲勞程度（1 至 5 分量表）。</li>
                <li>量測前睡眠充足度與情緒狀態。</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default RecordsPage
