import React from 'react'
import {
  LogIn,
  Fingerprint,
  BookOpen,
  ShieldAlert,
  GitBranch,
  FileCheck,
  X,
  type LucideIcon,
} from 'lucide-react'

export type ArciNodeId = 'input' | 'identity' | 'evidence' | 'constraint' | 'decision' | 'trace'

export interface ArciNodeInfo {
  id: ArciNodeId
  number: string
  title: string
  titleZh: string
  subtitle: string
  icon: LucideIcon
  description: string
  formalRole: string
  guardrails: string
  systemState: string
}

export const ARCI_NODES_DATA: Record<ArciNodeId, ArciNodeInfo> = {
  input: {
    id: 'input',
    number: '01',
    title: 'INPUT',
    titleZh: '輸入層',
    subtitle: 'Raw Kinematic Signal',
    icon: LogIn,
    description:
      '接收來自視訊鏡頭或標準重放之原始動作軌跡、時間戳記與 21 個手部關鍵點座標。ARCI 堅持完整保留最純粹的物理時序，絕不在輸入端預先推估或插值捏造遺失幀。',
    formalRole: '時序特徵標準化、時間缺口（>400ms）標記、有效開合週期檢測。',
    guardrails: '時間缺口防禦、掌長尺度正規化、微小抖動遲滯門檻過濾。',
    systemState: 'STREAM_INGESTED',
  },
  identity: {
    id: 'identity',
    number: '02',
    title: 'IDENTITY',
    titleZh: '資料身分層',
    subtitle: 'Cryptographic Ownership',
    icon: Fingerprint,
    description:
      '驗證紀錄所有權與隱私權杖。系統產生不透明 UUID 與安全憑證，嚴格從授權標頭解析身分，絕不盲目採信客戶端自報 ID；任何抹除指令均會原子切換為阻絕狀態。',
    formalRole: '多身分資料庫隔離、存取權限驗證、晚到寫入阻絕（Late-Write Blocker）。',
    guardrails: '禁止未經授權跨個案查詢、原子級連帶刪除、一次性銷毀回執。',
    systemState: 'TOKEN_VERIFIED',
  },
  evidence: {
    id: 'evidence',
    number: '03',
    title: 'EVIDENCE',
    titleZh: '證據層',
    subtitle: 'Peer-Reviewed Literature & Context',
    icon: BookOpen,
    description:
      'ARCI 不直接把原始輸入交給模型。資料首先會被整理、比對並確認可使用的證據來源。透過同儕審查文獻庫（如 Frontiers 2021 與 mPower 研究）確立客觀對照基準。',
    formalRole: '檢索相機規格匹配之研究文獻、對齊同齡常模與歷史量測基線。',
    guardrails: '無外部推論幻覺、禁止引用未登錄或未驗證之文獻、歷史基線完整性檢驗。',
    systemState: 'EVIDENCE_RETRIEVED',
  },
  constraint: {
    id: 'constraint',
    number: '04',
    title: 'CONSTRAINT',
    titleZh: '限制條件層',
    subtitle: 'Safety Guardrails & Quality Gating',
    icon: ShieldAlert,
    description:
      '當證據不足、輸入不完整或超出系統允許的範圍時，ARCI 可以限制輸出，而不是強迫模型生成答案。若影像品質不足或遭遇禁止事項（如自動確診、調藥），立即熔斷推論。',
    formalRole: '資料品質門檻過濾（VFR/掉幀檢測）、禁止醫療宣稱攔截、未收錄領域拒絕。',
    guardrails: '禁止 UPDRS 代替評分、禁止用藥劑量調整建議、允許系統保持 UNKNOWN。',
    systemState: 'CONSTRAINTS_CHECKED',
  },
  decision: {
    id: 'decision',
    number: '05',
    title: 'DECISION',
    titleZh: '受限判斷層',
    subtitle: 'Bounded Inference Engine',
    icon: GitBranch,
    description:
      '只有通過前面條件的資訊，才會進入後續解讀與決策流程。ARCI 在已知證據與約束下，產出結構化之動作觀察，絕不妄稱病情惡化，而是誠實說明客觀數值波動。',
    formalRole: '五區塊受限解讀產出、前後期變化幅度量化對比、醫病溝通引導。',
    guardrails: '資格標記為 UNQUALIFIED_RESEARCH_ONLY、明確附帶不確定性區間。',
    systemState: 'SUPPORTED',
  },
  trace: {
    id: 'trace',
    number: '06',
    title: 'TRACE',
    titleZh: '可追溯紀錄層',
    subtitle: 'Audit Receipt & Provenance',
    icon: FileCheck,
    description:
      '判斷不只留下結果，也保留它使用了哪些資料、通過哪些限制，以及為什麼得到這個結果。每一份產出的解讀，都能回到對應的文獻 DOI、影像雜湊與驗收憑證。',
    formalRole: '產生 SHA-256 驗證雜湊、記錄執行軌跡（Audit Trail）、文獻回溯錨點。',
    guardrails: '防竄改雜湊密封、執行路徑可完全重放、歷史分析透明審計。',
    systemState: 'AUDIT_SEALED',
  },
}

interface ArciPipelineDetailProps {
  selectedNodeId: ArciNodeId
  onClose?: () => void
  onSelectNode: (id: ArciNodeId) => void
}

export const ArciPipelineDetail: React.FC<ArciPipelineDetailProps> = ({
  selectedNodeId,
  onClose,
  onSelectNode,
}) => {
  const node = ARCI_NODES_DATA[selectedNodeId] || ARCI_NODES_DATA.evidence
  const Icon = node.icon

  return (
    <div className="arci-pipeline-drawer" role="region" aria-label={`ARCI ${node.title} 節點詳情`}>
      <div className="arci-pipeline-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--arci-teal-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--arci-teal)',
            }}
          >
            <Icon size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="arci-pipeline-badge">
                {node.number} / {node.title}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--arci-teal-dark)' }}>
                {node.titleZh}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--arci-teal-soft)' }}>
              {node.subtitle}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="kb-btn kb-btn-ghost kb-btn-sm"
            onClick={onClose}
            aria-label="關閉說明"
            style={{ padding: 6, borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <p>{node.description}</p>

      <div className="arci-pipeline-meta-grid">
        <div className="arci-pipeline-meta-item">
          <small>核心工作 (Function)</small>
          <span>{node.formalRole}</span>
        </div>
        <div className="arci-pipeline-meta-item">
          <small>保護邊界 (Guardrail)</small>
          <span>{node.guardrails}</span>
        </div>
        <div className="arci-pipeline-meta-item">
          <small>系統狀態碼 (Status)</small>
          <span style={{ fontFamily: 'var(--kb-font-mono)', fontSize: 12 }}>
            {node.systemState}
          </span>
        </div>
      </div>

      {/* Quick Switch Bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--arci-border-subtle)',
          flexWrap: 'wrap',
        }}
      >
        {(Object.keys(ARCI_NODES_DATA) as ArciNodeId[]).map((key) => {
          const item = ARCI_NODES_DATA[key]
          const isSelected = item.id === selectedNodeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNode(item.id)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: isSelected ? 'var(--arci-teal)' : 'var(--arci-border-subtle)',
                background: isSelected ? 'var(--arci-teal-light)' : '#FFFFFF',
                color: isSelected ? 'var(--arci-teal-dark)' : 'var(--arci-text-muted)',
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {item.number} {item.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default ArciPipelineDetail
