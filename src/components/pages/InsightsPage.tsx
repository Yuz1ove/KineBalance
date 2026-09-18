import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  BookOpen,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  ShieldAlert,
  Compass,
  CheckCircle2,
  Bookmark
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import {
  kbpdApi,
  type MeasurementRecord,
  type ArciInterpretation,
  type ArciCitation,
} from '../../services/kbpdApi'
import { MotionSection } from '../motion/MotionSection'
import { InsightPanel } from '../motion/InsightPanel'
import { EmptyStateBlock } from '../motion/EmptyStateBlock'

interface InsightsPageProps {
  records: MeasurementRecord[]
  selectedRecordId: string | null
  onSelectRecordId: (id: string) => void
  onNavigateToMeasure: () => void
  isDemo?: boolean
}

export const InsightsPage: React.FC<InsightsPageProps> = ({
  records,
  selectedRecordId,
  onSelectRecordId,
  onNavigateToMeasure,
  isDemo = false,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [activeRecordId, setActiveRecordId] = useState<string>(
    selectedRecordId || (records.length > 0 ? records[0].id : '')
  )
  const [interpretation, setInterpretation] = useState<ArciInterpretation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRationale, setShowRationale] = useState(true)
  const [showCitations, setShowCitations] = useState(true)

  // Update active record if prop changes
  useEffect(() => {
    if (selectedRecordId) {
      setActiveRecordId(selectedRecordId)
    } else if (records.length > 0 && !activeRecordId) {
      setActiveRecordId(records[0].id)
    }
  }, [selectedRecordId, records])

  // Fetch real ARCI interpretation from backend
  useEffect(() => {
    if (!activeRecordId) return

    let cancelled = false
    const fetchInterpretation = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await kbpdApi.interpret(activeRecordId)
        if (!cancelled) {
          setInterpretation(result)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '無法取得 ARCI 解讀，請檢查伺服器狀態。')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchInterpretation()
    return () => {
      cancelled = true
    }
  }, [activeRecordId])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="kb-insights-page">
      <MotionSection className="kb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <div className="kb-page-tagline" style={{ margin: 0 }}>ARCI 受限醫學文獻推論</div>
          {isDemo && (
            <span
              className="kb-badge kb-badge-warning"
              style={{ fontSize: 11, padding: '2px 8px', letterSpacing: '0.04em', fontWeight: 700 }}
            >
              DEMO FIXTURE · 展示資料受限推論模型
            </span>
          )}
        </div>
        <h1 className="kb-page-title">ARCI 動作解讀</h1>
        <p className="kb-page-desc">
          結合同儕審查醫學研究文獻，針對單手手指敲擊特徵提供有依據、有邊界的結構化客觀解讀。
        </p>
        {isDemo && (
          <div
            className="kb-alert kb-alert-info"
            style={{ marginTop: 14, padding: '10px 14px', fontSize: 13, background: 'rgba(56, 114, 224, 0.06)' }}
          >
            <Sparkles size={16} style={{ flexShrink: 0, color: 'var(--kb-primary)' }} />
            <div>
              <strong>展示資料模式說明：</strong> 本頁解讀由受控展示推論引擎（DEMO FIXTURE）即時生成，嚴格遵守醫學研究邊界與文獻比對，文獻引用包含 DOI 實證支持。負向案例將觸發 Quality Gate 拒絕推論。
            </div>
          </div>
        )}
      </MotionSection>

      {/* Record Selector Card */}
      {records.length > 0 ? (
        <MotionSection
          className="kb-card"
          style={{ padding: '18px 24px', marginBottom: 24 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <label
              style={{ fontSize: 15, fontWeight: 650, color: 'var(--kb-text-primary)' }}
            >
              選擇要解讀的量測紀錄：
            </label>
            <select
              className="kb-select"
              style={{ maxWidth: 460, height: 44 }}
              value={activeRecordId}
              onChange={(e) => {
                setActiveRecordId(e.target.value)
                onSelectRecordId(e.target.value)
              }}
            >
              {records.map((r) => {
                const createdAt =
                  r.session?.createdAt || (r as any).createdAt || new Date().toISOString()
                const handSide = r.session?.handSide || (r as any).handSide || 'RIGHT'
                const phase = (r as any).medication_phase || (r as any).medicationPhase
                const isRejected = (r as any).quality_gate === 'REJECTED'
                const freq = r.analysis?.metrics?.averageFrequencyHz
                const phaseLabel = phase === 'POST_DOSE' ? '服藥後' : phase === 'PRE_DOSE' ? '服藥前' : ''

                return (
                  <option key={r.id} value={r.id}>
                    {new Date(createdAt).toLocaleDateString('zh-TW')} ·{' '}
                    {handSide === 'RIGHT' ? '右手' : '左手'}
                    {phaseLabel ? ` · ${phaseLabel}` : ''}
                    {isRejected
                      ? ' ⚠️ [品質未達標·REJECTED]'
                      : freq
                      ? ` (${freq} Hz)`
                      : ' (未計算)'}
                  </option>
                )
              })}
            </select>
          </div>
        </MotionSection>
      ) : (
        <EmptyStateBlock
          title="尚無可供 ARCI 解讀的紀錄"
          description="ARCI 需要至少一筆真實保存的手指開合量測特徵作為輸入。請先完成一次量測。"
          primaryActionLabel="前往量測"
          onPrimaryAction={onNavigateToMeasure}
          showSteps={false}
        />
      )}

      {/* Reading Navigation Guide */}
      {interpretation && !loading && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 24,
          }}
        >
          {[
            { id: 'section-summary', label: '1. 本次摘要' },
            { id: 'section-context', label: '2. 脈絡與輸入' },
            { id: 'section-rationale', label: '3. 推論依據' },
            { id: 'section-citations', label: '4. 文獻實證' },
            { id: 'section-limitations', label: '5. 限制與指引' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className="kb-btn kb-btn-secondary kb-btn-sm"
              style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20 }}
              onClick={() => scrollToSection(item.id)}
            >
              <Compass size={13} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: 'var(--kb-text-secondary)',
          }}
        >
          <Sparkles
            className="kb-empty-icon"
            style={{ animation: 'spin 2s linear infinite', color: 'var(--kb-primary)' }}
          />
          <p style={{ marginTop: 12, fontSize: 15 }}>
            正在由 ARCI 核心讀取有界文獻並推論解讀…
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="kb-alert kb-alert-danger">
          <AlertCircle size={20} />
          <div>
            <strong>解讀服務暫時無法取得</strong>
            <p style={{ fontSize: 14, marginTop: 4 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Interpretation Content */}
      {interpretation && !loading && (() => {
        const summaryText =
          interpretation.evidenceSupportedInterpretation?.summary ||
          interpretation.summary ||
          '已完成動作特徵結構化解讀。'

        const validTapsCount =
          interpretation.observedMeasurements?.validTapCount ??
          interpretation.observedMeasurements?.validTaps ??
          '--'

        const frequencyHz =
          interpretation.observedMeasurements?.averageFrequencyHz ??
          interpretation.observedMeasurements?.frequencyHz ??
          null

        const dataQualityStatus =
          interpretation.observedMeasurements?.dataQualityStatus || 'QUALIFIED'

        const hasPriorBaseline =
          interpretation.comparisonContext?.hasPriorBaseline ?? false
        const priorSessionsCount =
          interpretation.comparisonContext?.comparableHistoricalSessionsCount ??
          interpretation.comparisonContext?.priorCount ??
          0
        const baselineDiffNotes =
          interpretation.comparisonContext?.differenceNotes ||
          (interpretation.comparisonContext?.notes
            ? interpretation.comparisonContext.notes.join('；')
            : '')

        const synthesisText =
          interpretation.evidenceSupportedInterpretation?.synthesis ||
          interpretation.evidenceSupportedInterpretation?.summary ||
          'ARCI 依據已註冊之雙盲同儕審查文獻，針對單手手指敲擊特徵進行結構化比對。'

        const citationsList: ArciCitation[] =
          interpretation.evidenceSupportedInterpretation?.citedEvidence ||
          interpretation.evidenceSupportedInterpretation?.citations ||
          []

        const limitationsList: string[] = (() => {
          if (!interpretation.limitationsAndMissingData) return []
          if (Array.isArray(interpretation.limitationsAndMissingData)) {
            return interpretation.limitationsAndMissingData
          }
          const lim = interpretation.limitationsAndMissingData
          const items: string[] = []
          if (lim.qualityUnreliabilityReasons && Array.isArray(lim.qualityUnreliabilityReasons)) {
            items.push(...lim.qualityUnreliabilityReasons)
          }
          if (lim.cameraCoordinateLimitations && Array.isArray(lim.cameraCoordinateLimitations)) {
            items.push(...lim.cameraCoordinateLimitations)
          }
          if (lim.medicalDisclaimers && Array.isArray(lim.medicalDisclaimers)) {
            items.push(...lim.medicalDisclaimers)
          }
          return items.length > 0
            ? items
            : ['單鏡頭 2D 視覺無法精準測量絕對物理深度或關節扭力。']
        })()

        const nextStepsList: string[] = (() => {
          if (!interpretation.nextSteps) return []
          if (Array.isArray(interpretation.nextSteps)) {
            return interpretation.nextSteps
          }
          const ns = interpretation.nextSteps
          const items: string[] = []
          if (ns.recommendedActions && Array.isArray(ns.recommendedActions)) {
            items.push(...ns.recommendedActions)
          }
          if (ns.physicianDiscussionPrompts && Array.isArray(ns.physicianDiscussionPrompts)) {
            items.push(...ns.physicianDiscussionPrompts)
          }
          if (
            ns.prohibitedInferencesAcknowledged &&
            Array.isArray(ns.prohibitedInferencesAcknowledged)
          ) {
            items.push(...ns.prohibitedInferencesAcknowledged)
          }
          return items.length > 0
            ? items
            : ['持續在相同固定光線與坐姿條件下記錄長期數據。']
        })()

        const disclaimerText =
          interpretation.disclaimer ||
          '研究與工程原型，用於動作紀錄與變化觀察，不提供診斷或用藥建議。'

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Section 1: Summary Card */}
            <InsightPanel
              id="section-summary"
              sectionNumber="1"
              title="本次量測結果摘要"
              subtitle="階段一 · 核心運動學特徵觀察"
              badge={
                dataQualityStatus === 'REJECTED'
                  ? '品質未達標 · 拒絕推論 (REJECTED)'
                  : interpretation.status === 'QUALIFIED_INTERPRETATION'
                  ? '合格完整解讀'
                  : '受限研究解讀 (非臨床)'
              }
              variant={dataQualityStatus === 'REJECTED' ? 'warning' : 'highlight'}
            >
              {dataQualityStatus === 'REJECTED' && (
                <div
                  className="kb-alert kb-alert-danger"
                  style={{ marginBottom: 18 }}
                >
                  <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>品質守則拒絕（Quality Gate: REJECTED）</strong>
                    <p style={{ marginTop: 4, fontSize: 14 }}>
                      此筆量測因影像追蹤品質不足（有效畫面比例過低，環境光線過暗），已被品質閘門判定為不合格。依安全原則，系統不對不穩定骨架進行任何運動學推論，亦已自個人歷史基線中排除。
                    </p>
                  </div>
                </div>
              )}

              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.75,
                  color: 'var(--kb-text-primary)',
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                {summaryText}
              </p>

              {/* Quick Metrics Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                  padding: 16,
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                }}
              >
                <div>
                  <span style={{ fontSize: 13, color: 'var(--kb-text-muted)' }}>
                    有效開合次數：
                  </span>
                  <strong
                    style={{
                      marginLeft: 4,
                      fontSize: 16,
                      color: 'var(--kb-text-primary)',
                    }}
                  >
                    {validTapsCount} 次
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--kb-text-muted)' }}>
                    平均頻率：
                  </span>
                  <strong
                    style={{
                      marginLeft: 4,
                      fontSize: 16,
                      color: dataQualityStatus === 'REJECTED' ? 'var(--kb-text-muted)' : 'var(--kb-primary)',
                    }}
                  >
                    {dataQualityStatus === 'REJECTED' ? '不予計算 (品質不足)' : frequencyHz !== null ? `${frequencyHz} Hz` : '樣本不足'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--kb-text-muted)' }}>
                    資料品質：
                  </span>
                  <strong
                    style={{
                      marginLeft: 4,
                      fontSize: 16,
                      color:
                        dataQualityStatus === 'QUALIFIED'
                          ? 'var(--kb-success)'
                          : 'var(--kb-danger)',
                    }}
                  >
                    {dataQualityStatus === 'REJECTED' ? 'REJECTED (已排除)' : dataQualityStatus}
                  </strong>
                </div>
              </div>
            </InsightPanel>

            {/* Section 2: Input & Context */}
            <InsightPanel
              id="section-context"
              sectionNumber="2"
              title="使用了哪些量測與紀錄"
              subtitle="階段二 · 資料來源與脈絡"
              variant="default"
            >
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: 'var(--kb-text-secondary)',
                }}
              >
                <p>
                  <strong style={{ color: 'var(--kb-text-primary)' }}>
                    歷史比較脈絡：
                  </strong>{' '}
                  {hasPriorBaseline
                    ? `本系統已比對您過去 ${priorSessionsCount} 筆相同側別之歷史紀錄。${baselineDiffNotes}`
                    : '這是您此側別的初次量測，目前尚無歷史基線 (Baseline)。ARCI 將其視為單點觀察，不妄作趨勢結論。'}
                </p>
              </div>
            </InsightPanel>

            {/* Section 3: Reasoning & Derivation */}
            <InsightPanel
              id="section-rationale"
              sectionNumber="3"
              title="如何得到這個解讀？"
              subtitle="階段三 · 判斷依據與運動學推論公式"
              variant="default"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginBottom: showRationale ? 16 : 0,
                }}
                onClick={() => setShowRationale(!showRationale)}
              >
                <p
                  style={{
                    fontSize: 15,
                    color: 'var(--kb-text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {synthesisText}
                </p>
                <button
                  type="button"
                  className="kb-btn kb-btn-ghost kb-btn-sm"
                  style={{ flexShrink: 0, marginLeft: 12 }}
                >
                  <span>{showRationale ? '收合公式細節' : '展開公式細節'}</span>
                  {showRationale ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showRationale && (
                <div
                  style={{
                    padding: 16,
                    background: 'var(--kb-surface-subtle)',
                    borderRadius: 'var(--kb-radius-md)',
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'var(--kb-text-secondary)',
                  }}
                >
                  <strong style={{ color: 'var(--kb-text-primary)' }}>
                    運動學公式依據：
                  </strong>
                  <div style={{ marginTop: 6 }}>
                    • 開合距離尺度標準化：食指與拇指尖歐氏距離除以掌長 (Landmark 0 到
                    9)。
                    <br />
                    • 開合週期判定：遲滯上下限 (Hysteresis Peak-Valley) 門檻過濾微抖動。
                    <br />
                    • 疲勞衰減比率：後段開合振幅與前段開合振幅之比值。
                  </div>
                </div>
              )}
            </InsightPanel>

            {/* Section 4: Evidence & Citations */}
            <InsightPanel
              id="section-citations"
              sectionNumber="4"
              title={`研究文獻來源與限制 (${citationsList.length} 篇)`}
              subtitle="階段四 · 雙盲同行審查醫學研究比對"
              variant="evidence"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginBottom: showCitations ? 16 : 0,
                }}
                onClick={() => setShowCitations(!showCitations)}
              >
                <p style={{ fontSize: 14, color: 'var(--kb-text-muted)' }}>
                  ARCI
                  僅能引用已向受限推論核心註冊之文獻DOI，不得產生未經實證之自由聯想。
                </p>
                <button
                  type="button"
                  className="kb-btn kb-btn-ghost kb-btn-sm"
                  style={{ flexShrink: 0, marginLeft: 12 }}
                >
                  <span>{showCitations ? '收合文獻來源' : '檢視文獻清單'}</span>
                  {showCitations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showCitations && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {citationsList.length === 0 ? (
                    <p style={{ fontSize: 14, color: 'var(--kb-text-muted)' }}>
                      無引用文獻
                    </p>
                  ) : (
                    citationsList.map((cite, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 18,
                          background: 'var(--kb-surface)',
                          border: '1px solid var(--kb-divider)',
                          borderRadius: 'var(--kb-radius-md)',
                          boxShadow: 'var(--kb-shadow-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div
                            style={{
                              padding: 8,
                              background: 'var(--kb-primary-light)',
                              color: 'var(--kb-primary)',
                              borderRadius: 8,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            <BookOpen size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: 'var(--kb-text-primary)',
                              }}
                            >
                              {cite.title}
                            </h4>
                            <div
                              style={{
                                fontSize: 13,
                                color: 'var(--kb-primary)',
                                fontWeight: 600,
                                marginTop: 3,
                              }}
                            >
                              DOI: {cite.doi}
                            </div>
                            <p
                              style={{
                                fontSize: 14,
                                color: 'var(--kb-text-secondary)',
                                marginTop: 8,
                                lineHeight: 1.6,
                              }}
                            >
                              <strong>文獻實證支持：</strong> {cite.findingExcerpt}
                            </p>
                            <p
                              style={{
                                fontSize: 14,
                                color: 'var(--kb-warning)',
                                marginTop: 4,
                                lineHeight: 1.6,
                              }}
                            >
                              <strong>適用限制：</strong> {cite.applicabilityLimit}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </InsightPanel>

            {/* Section 5: Limitations & Next Steps */}
            <InsightPanel
              id="section-limitations"
              sectionNumber="5"
              title="研究限制與就醫討論指引"
              subtitle="階段五 · 限制邊界與門診回診建議"
              variant="warning"
            >
              <div style={{ fontSize: 15, lineHeight: 1.75 }}>
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ color: 'var(--kb-text-primary)' }}>
                    當前已知限制：
                  </strong>
                  <ul
                    style={{
                      paddingLeft: 20,
                      marginTop: 6,
                      color: 'var(--kb-text-secondary)',
                    }}
                  >
                    {limitationsList.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong style={{ color: 'var(--kb-primary)' }}>
                    建議就醫溝通方式：
                  </strong>
                  <ul
                    style={{
                      paddingLeft: 20,
                      marginTop: 6,
                      color: 'var(--kb-text-secondary)',
                    }}
                  >
                    {nextStepsList.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </InsightPanel>

            {/* Mandatory Boundary Declaration */}
            <div className="kb-alert kb-alert-warning" style={{ fontSize: 14 }}>
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>嚴格界限宣告：</strong> {disclaimerText}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
export default InsightsPage
