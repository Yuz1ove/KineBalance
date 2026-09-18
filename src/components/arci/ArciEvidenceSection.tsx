import React from 'react'
import { FileText, Database, Activity, User, ArrowDown, ExternalLink, ShieldCheck, Link2 } from 'lucide-react'

export const ArciEvidenceSection: React.FC = () => {
  // Official Evidence from evidence/evidence-registry.json
  const officialDocuments = [
    {
      id: 'CAM-EV-01',
      doi: '10.3389/fneur.2021.742654',
      title: "Remote Evaluation of Parkinson's Disease Using a Conventional Webcam and Artificial Intelligence",
      journal: 'Frontiers in Neurology, 2021 (Vol 12: 742654)',
      authors: 'Zhang, T., Pang, W., Li, B. et al.',
      url: 'https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2021.742654/full',
      cohort: 'PD (n=120) & Healthy Controls (n=120), 15s Finger Tapping on 30fps webcam',
      findings: '標準 RGB Webcam 抽取之頻率、振幅衰減與節律變異度與臨床 MDS-UPDRS 評分具相關性 (r=0.72-0.81)。',
      limitations: '需穩定光源與 ≥25fps；僅供客觀研究量測，不具獨立自動診斷能力。',
      status: 'Production Verified (正式登錄文獻)',
    },
    {
      id: 'CAM-EV-02',
      doi: '10.1038/s41746-020-00305-8',
      title: "Smartphone-based remote assessment of motor symptoms in Parkinson's disease (mPower)",
      journal: 'npj Digital Medicine, 2020 (Vol 3: 102)',
      authors: 'Bot, B. M., Suver, C., Neto, E. C. et al.',
      url: 'https://www.nature.com/articles/s41746-020-00305-8',
      cohort: 'Community cohort (n=9,542), 20s Alternate Tapping',
      findings: '敲擊間隔變異性與衰減能靈敏反映服藥週期與日夜動作起伏。',
      limitations: '觸控螢幕介面；提供時間間隔指標前例，但感測模態與視訊相異。',
      status: 'Production Verified (正式登錄文獻)',
    },
  ]

  const informationSources = [
    { name: 'Peer-Reviewed Paper', label: '同儕審查文獻', icon: FileText, desc: '已驗證常模與演算法限制' },
    { name: 'Clinical Database', label: '標準評估庫', icon: Database, desc: 'MDS-UPDRS 相關性研究' },
    { name: 'Webcam Measurement', label: '即時運動學', icon: Activity, desc: '20 秒 30fps 掌長正規化特徵' },
    { name: 'Patient History', label: '個人連續歷程', icon: User, desc: '服藥時程與歷史可比較基線' },
  ]

  const retainedMetadata = [
    { label: 'Source DOI', desc: '文獻識別碼' },
    { label: 'Timestamp', desc: '微秒級時序' },
    { label: 'Raw Metrics', desc: '原始掌長正規化值' },
    { label: 'Constraints', desc: '生效的安全過濾器' },
    { label: 'Decision Path', desc: '不可竄改之審計鏈' },
  ]

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
          Medical Evidence & Provenance
        </span>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--arci-teal-dark)',
            marginTop: 4,
          }}
        >
          EVIDENCE DOESN'T DISAPPEAR AFTER GENERATION
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--arci-text-muted)',
            maxWidth: 620,
            margin: '6px auto 0 auto',
          }}
        >
          一般生成式 AI 在輸出後即斷開推論前提；ARCI 確保產出的每一項解讀，隨時都能回到最初的文獻來源、量測數據與限制條件。
        </p>
      </div>

      {/* Information Inflow Visual Box */}
      <div
        style={{
          background: '#FAF9F5',
          border: '1px solid var(--arci-border-subtle)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--arci-teal-soft)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          四方客觀資訊匯流 → ARCI 決策核心 → 完整保留可追溯中繼資料
        </span>

        {/* 4 Inflow Sources */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          {informationSources.map((source) => {
            const Icon = source.icon
            return (
              <div
                key={source.name}
                style={{
                  background: '#FFFFFF',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--arci-border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--arci-teal-light)',
                    color: 'var(--arci-teal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px auto',
                  }}
                >
                  <Icon size={16} />
                </div>
                <strong style={{ fontSize: 13, color: 'var(--arci-teal-dark)', display: 'block' }}>
                  {source.label}
                </strong>
                <small style={{ fontSize: 11, color: 'var(--arci-text-muted)' }}>{source.desc}</small>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--arci-teal-soft)', margin: '8px 0' }}>
          <ArrowDown size={20} style={{ display: 'inline' }} />
        </div>

        {/* Center Interpretation Output Bar */}
        <div
          style={{
            background: 'var(--arci-teal-light)',
            border: '1px solid var(--arci-border-strong)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <strong style={{ fontSize: 15, color: 'var(--arci-teal-dark)', display: 'block' }}>
            ARCI 受限結構化解讀 (Interpretation Output)
          </strong>
          <span style={{ fontSize: 13, color: 'var(--arci-teal)' }}>
            「結果不是文字猜想，而是與來源緊密綁定的客觀觀察。」
          </span>
        </div>

        {/* Retained Provenance Attributes */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {retainedMetadata.map((meta) => (
            <div
              key={meta.label}
              style={{
                background: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--arci-border-subtle)',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Link2 size={12} style={{ color: 'var(--arci-teal)' }} />
              <strong style={{ color: 'var(--arci-teal-dark)' }}>{meta.label}</strong>
              <span style={{ color: 'var(--arci-text-muted)' }}>({meta.desc})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Real Peer-Reviewed Evidence Documents Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} style={{ color: 'var(--arci-teal)' }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)', margin: 0 }}>
            正式收錄文獻清單 (Official Evidence Registry · kbpd-camera-evidence-v1)
          </h4>
        </div>

        {officialDocuments.map((doc) => (
          <div
            key={doc.id}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--arci-border-subtle)',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div>
                <span className="kb-badge kb-badge-primary" style={{ fontSize: 11, marginRight: 8 }}>
                  {doc.id}
                </span>
                <span className="kb-badge kb-badge-accent" style={{ fontSize: 11 }}>
                  {doc.status}
                </span>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  fontSize: 12,
                  color: 'var(--arci-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 600,
                }}
              >
                <span>DOI: {doc.doi}</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <h5 style={{ fontSize: 15, fontWeight: 700, color: 'var(--arci-teal-dark)', marginBottom: 4 }}>
              {doc.title}
            </h5>
            <div style={{ fontSize: 12, color: 'var(--arci-text-muted)', marginBottom: 8 }}>
              {doc.authors} · <em>{doc.journal}</em>
            </div>

            <div style={{ fontSize: 13, color: 'var(--arci-text-dark)', lineHeight: 1.5, marginBottom: 6 }}>
              <strong>核心結論</strong>：{doc.findings}
            </div>
            <div style={{ fontSize: 12, color: 'var(--arci-text-muted)', lineHeight: 1.5 }}>
              <strong>適用邊界</strong>：{doc.limitations}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default ArciEvidenceSection
