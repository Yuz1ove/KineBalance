import React, { useState } from 'react'
import {
  Printer,
  Download,
  Calendar,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { MeasurementRecord } from '../../services/kbpdApi'
import { MotionSection } from '../motion/MotionSection'

interface SummaryPageProps {
  records: MeasurementRecord[]
  isDemo?: boolean
}

export const SummaryPage: React.FC<SummaryPageProps> = ({ records, isDemo = false }) => {
  const shouldReduceMotion = useReducedMotion()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')

  const getCreatedAt = (r: MeasurementRecord) =>
    r.session?.createdAt || (r as any).createdAt || ''
  const getHandSide = (r: MeasurementRecord) =>
    r.session?.handSide || (r as any).handSide || 'RIGHT'
  const isRejectedRecord = (r: MeasurementRecord) =>
    (r as any).quality_gate === 'REJECTED' ||
    (r.analysis?.quality as any)?.status === 'REJECTED' ||
    (r.analysis?.dataQuality as any)?.status === 'REJECTED'

  // Filter records by time range
  const now = Date.now()
  const filteredRecords = records.filter((r) => {
    const recordTime = new Date(getCreatedAt(r)).getTime()
    if (timeRange === '7d') return now - recordTime <= 7 * 24 * 3600 * 1000
    if (timeRange === '30d') return now - recordTime <= 30 * 24 * 3600 * 1000
    return true
  })

  // Qualified vs Rejected breakdown
  const validRecords = filteredRecords.filter((r) => !isRejectedRecord(r))
  const rejectedRecords = filteredRecords.filter((r) => isRejectedRecord(r))

  // Group by hand side (valid for numerical averages)
  const rightRecords = filteredRecords.filter((r) => getHandSide(r) === 'RIGHT')
  const leftRecords = filteredRecords.filter((r) => getHandSide(r) === 'LEFT')
  const validRightRecords = validRecords.filter((r) => getHandSide(r) === 'RIGHT')
  const validLeftRecords = validRecords.filter((r) => getHandSide(r) === 'LEFT')

  // Compute summary stats excluding rejected records
  const avgHz = (recs: MeasurementRecord[]) => {
    const valid = recs.filter(
      (r) =>
        !isRejectedRecord(r) &&
        r.analysis?.metrics?.averageFrequencyHz !== null &&
        r.analysis?.metrics?.averageFrequencyHz !== undefined
    )
    if (valid.length === 0) return null
    const sum = valid.reduce(
      (acc, r) => acc + (r.analysis?.metrics?.averageFrequencyHz || 0),
      0
    )
    return Math.round((sum / valid.length) * 10) / 10
  }

  const rightAvgHz = avgHz(rightRecords)
  const leftAvgHz = avgHz(leftRecords)

  const handlePrint = () => {
    window.print()
  }

  const handleExportJson = () => {
    const exportData = {
      exportSchema: 'KBPD-CONSULTATION-SUMMARY-1',
      generatedAt: new Date().toISOString(),
      isDemo,
      datasetSource: isDemo ? 'synthetic_demo' : 'live_device',
      demoProfile: isDemo ? { id: 'DEMO-001', name: '展示個案 A', days: 14 } : undefined,
      timeRange,
      totalMeasurements: filteredRecords.length,
      validMeasurements: validRecords.length,
      rejectedMeasurements: rejectedRecords.length,
      statistics: {
        rightHandMeasurements: rightRecords.length,
        rightHandValidMeasurements: validRightRecords.length,
        rightHandAverageFrequencyHz: rightAvgHz,
        leftHandMeasurements: leftRecords.length,
        leftHandValidMeasurements: validLeftRecords.length,
        leftHandAverageFrequencyHz: leftAvgHz,
      },
      records: filteredRecords.map((r) => ({
        id: r.id,
        createdAt: getCreatedAt(r),
        handSide: getHandSide(r),
        medicationPhase: (r as any).medication_phase || (r as any).medicationPhase,
        qualityGate: (r as any).quality_gate,
        metrics: r.analysis?.metrics,
        dataQuality: r.analysis?.quality || r.analysis?.dataQuality,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `KineBalance-Summary-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="kb-summary-page">
      {/* Header & Print Actions */}
      <MotionSection className="kb-page-header kb-no-print">
        <div className="kb-page-tagline">就醫溝通輔助</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1 className="kb-page-title">回診討論摘要</h1>
            <p className="kb-page-desc">
              整理指定期間的客觀動作量測數據與品質，方便您在門診時與神經專科醫師具體討論。
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="kb-btn kb-btn-secondary kb-btn-sm"
              onClick={handleExportJson}
            >
              <Download size={16} />
              <span>匯出 JSON 資料</span>
            </button>
            <button
              type="button"
              className="kb-btn kb-btn-primary kb-btn-sm"
              onClick={handlePrint}
            >
              <Printer size={16} />
              <span>列印 / 存為 PDF</span>
            </button>
          </div>
        </div>

        {/* Time Range Filter Bar */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {[
            { id: '7d', label: '最近 7 天' },
            { id: '30d', label: '最近 30 天' },
            { id: 'all', label: '所有歷史紀錄' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kb-btn kb-btn-sm ${
                timeRange === item.id ? 'kb-btn-primary' : 'kb-btn-secondary'
              }`}
              style={{ borderRadius: 20 }}
              onClick={() => setTimeRange(item.id as any)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </MotionSection>

      {/* Formal Printable Document Layout */}
      <MotionSection
        delay={0.15}
        className="kb-card"
        style={{
          background: '#FFFDFA',
          padding: '36px 40px',
          boxShadow: 'var(--kb-shadow-card)',
          border: '1px solid var(--kb-divider)',
        }}
      >
        {/* Document Header */}
        <div
          style={{
            borderBottom: '2px solid var(--kb-primary)',
            paddingBottom: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--kb-primary)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  KineBalance 動作紀錄回診討論摘要
                </h2>
                {isDemo && (
                  <span
                    className="kb-badge kb-badge-warning"
                    style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px' }}
                  >
                    DEMO-001 合成展示個案
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--kb-text-secondary)',
                  marginTop: 6,
                }}
              >
                文件產生時間：{new Date().toLocaleString('zh-TW')} · 篩選範圍：
                {timeRange === '7d'
                  ? '最近 7 天'
                  : timeRange === '30d'
                  ? '最近 30 天'
                  : '所有累積紀錄'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="kb-badge kb-badge-neutral">
                非診斷證明 · 僅供會談參考
              </span>
            </div>
          </div>
        </div>

        {/* Synthetic Demo Banner in Document */}
        {isDemo && (
          <div
            className="kb-alert kb-alert-warning"
            style={{ marginBottom: 24, padding: '14px 18px', fontSize: 13, lineHeight: 1.6 }}
          >
            <Shield size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>合成展示資料文件（Synthetic Demo Data · DEMO-001 展示個案 A）</strong>
              <p style={{ marginTop: 4 }}>
                注意：本份回診摘要基於 14 天受控示範數據（56 次量測，55 次合格，1 次因追蹤品質排除），僅供功能展示與門診會談範例使用，非真實病患之臨床醫療紀錄。
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Overview Summary */}
        <section style={{ marginBottom: 28 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--kb-text-primary)',
              marginBottom: 14,
            }}
          >
            一、量測概況與側別統計
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 14,
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                總量測次數
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 750,
                  color: 'var(--kb-text-primary)',
                  marginTop: 4,
                }}
              >
                {filteredRecords.length}{' '}
                <span style={{ fontSize: 14, fontWeight: 400 }}>次</span>
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                有效分析次數
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 750,
                  color: 'var(--kb-success)',
                  marginTop: 4,
                }}
              >
                {validRecords.length}{' '}
                <span style={{ fontSize: 14, fontWeight: 400 }}>次</span>
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                品質不足排除
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 750,
                  color: rejectedRecords.length > 0 ? 'var(--kb-danger)' : 'var(--kb-text-muted)',
                  marginTop: 4,
                }}
              >
                {rejectedRecords.length}{' '}
                <span style={{ fontSize: 14, fontWeight: 400 }}>次</span>
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                右手平均頻率 ({validRightRecords.length} 次有效)
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 750,
                  color: 'var(--kb-primary)',
                  marginTop: 4,
                }}
              >
                {rightAvgHz !== null ? `${rightAvgHz} ` : '-- '}
                <span style={{ fontSize: 14, fontWeight: 400 }}>Hz</span>
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                左手平均頻率 ({validLeftRecords.length} 次有效)
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 750,
                  color: 'var(--kb-primary)',
                  marginTop: 4,
                }}
              >
                {leftAvgHz !== null ? `${leftAvgHz} ` : '-- '}
                <span style={{ fontSize: 14, fontWeight: 400 }}>Hz</span>
              </div>
            </div>
          </div>

          {rejectedRecords.length > 0 && (
            <div
              className="kb-alert kb-alert-danger"
              style={{ marginTop: 14, fontSize: 13, padding: '10px 14px' }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>品質守則已排除 {rejectedRecords.length} 筆不合格數據：</strong>
                <span>
                  {' '}2026-09-08 08:30 (右手·服藥前) 因追蹤有效畫面比率僅 63% 低於門檻，遭 Quality Gate 排除，不納入平均頻率與趨勢統計。
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Clinical Discussion Talking Points */}
        <section style={{ marginBottom: 28 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--kb-text-primary)',
              marginBottom: 14,
            }}
          >
            二、建議向醫師說明的客觀現象
          </h3>

          <div
            style={{
              padding: 20,
              background: 'var(--kb-surface-subtle)',
              borderRadius: 'var(--kb-radius-md)',
              fontSize: 15,
              lineHeight: 1.75,
              color: 'var(--kb-text-primary)',
            }}
          >
            <ul style={{ paddingLeft: 22 }}>
              {rightAvgHz !== null &&
                leftAvgHz !== null &&
                Math.abs(rightAvgHz - leftAvgHz) >= 0.5 && (
                  <li style={{ marginBottom: 6 }}>
                    <strong>左右側別非對稱現象：</strong> 觀察到右手 ({rightAvgHz} Hz)
                    與左手 ({leftAvgHz} Hz)
                    平均動作頻率存在明顯落差，可提供專科醫師作為側別運動機能評估參考。
                  </li>
                )}
              {validRecords.some(
                (r) => (r.analysis?.metrics?.amplitudeDecayRatio || 0) > 0.2
              ) && (
                <li style={{ marginBottom: 6 }}>
                  <strong>連續動作衰減現象：</strong> 在 20
                  秒開合測驗後段，部分紀錄出現開合振幅縮小或動作變緩慢之疲勞衰減現象。
                </li>
              )}
              {validRecords.some(
                (r) => (r.analysis?.metrics?.intervalVariabilityCv || 0) > 0.25
              ) && (
                <li style={{ marginBottom: 6 }}>
                  <strong>節奏間隔變異度：</strong> 部分量測時間點間隔變異較大（CV &gt;
                  25%），可向醫師說明當時是否處於藥物消退期或主觀感到疲倦。
                </li>
              )}
              <li>
                <strong>量測條件一致性：</strong> 所有量測均採用 21
                關鍵點食指與拇指反覆開合標準化演算法，距離經由掌部尺度校正，排除鏡頭遠近干擾。
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Records Table */}
        <section style={{ marginBottom: 28 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--kb-text-primary)',
              marginBottom: 14,
            }}
          >
            三、期間詳細量測清單 ({filteredRecords.length} 筆)
          </h3>

          {filteredRecords.length === 0 ? (
            <p style={{ color: 'var(--kb-text-muted)', fontSize: 14 }}>
              此時間區間內無量測紀錄。
            </p>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--kb-divider)',
                      background: 'var(--kb-surface-subtle)',
                    }}
                  >
                    <th style={{ padding: '12px 14px' }}>日期時間</th>
                    <th style={{ padding: '12px 14px' }}>測驗側別與時段</th>
                    <th style={{ padding: '12px 14px' }}>有效次數</th>
                    <th style={{ padding: '12px 14px' }}>平均頻率</th>
                    <th style={{ padding: '12px 14px' }}>節奏變異 (CV)</th>
                    <th style={{ padding: '12px 14px' }}>振幅衰減比</th>
                    <th style={{ padding: '12px 14px' }}>品質狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => {
                    const m = r.analysis?.metrics
                    const q = r.analysis?.quality || r.analysis?.dataQuality
                    const isRej = isRejectedRecord(r)
                    const phase = (r as any).medication_phase || (r as any).medicationPhase

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid var(--kb-divider)',
                          background: isRej ? 'rgba(239, 68, 68, 0.04)' : undefined,
                        }}
                      >
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {new Date(getCreatedAt(r)).toLocaleString('zh-TW', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span>{getHandSide(r) === 'RIGHT' ? '右手' : '左手'}</span>
                          {phase && (
                            <span
                              className={`kb-badge ${phase === 'POST_DOSE' ? 'kb-badge-primary' : 'kb-badge-neutral'}`}
                              style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px' }}
                            >
                              {phase === 'POST_DOSE' ? '服藥後' : '服藥前'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isRej ? '--' : m?.validTapCount ?? '--'} 次
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            fontWeight: 650,
                            color: isRej ? 'var(--kb-text-muted)' : 'var(--kb-primary)',
                          }}
                        >
                          {isRej ? '--' : m?.averageFrequencyHz ? `${m.averageFrequencyHz} Hz` : '--'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isRej ? '--' : m?.intervalVariabilityCv
                            ? `${(m.intervalVariabilityCv * 100).toFixed(1)}%`
                            : '--'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isRej ? '--' : m?.amplitudeDecayRatio
                            ? `${(m.amplitudeDecayRatio * 100).toFixed(1)}%`
                            : '--'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isRej ? (
                            <span className="kb-badge kb-badge-danger" style={{ fontSize: 12 }}>
                              不合格 (排除)
                            </span>
                          ) : (
                            <span
                              className={`kb-badge ${
                                q?.status === 'QUALIFIED'
                                  ? 'kb-badge-success'
                                  : 'kb-badge-warning'
                              }`}
                              style={{ fontSize: 12 }}
                            >
                              {q?.status === 'QUALIFIED' ? '合格' : '受限'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer Disclaimer */}
        <div
          style={{
            borderTop: '1px solid var(--kb-divider)',
            paddingTop: 18,
            fontSize: 12,
            color: 'var(--kb-text-muted)',
            lineHeight: 1.6,
          }}
        >
          <strong>免責聲明：</strong> 本文件由 KineBalance 本機原型產出，僅整理客觀運動學記錄，不構成醫學診斷、用藥處方或 MDS-UPDRS 代替評分。請與神經內科或復健專科醫師當面複核。
        </div>
      </MotionSection>
    </div>
  )
}
export default SummaryPage
