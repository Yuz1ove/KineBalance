import { ExternalLink, FlaskConical, ShieldCheck, X } from 'lucide-react'
import { researchSources } from '../data/research'

interface ResearchPanelProps {
  open: boolean
  onClose: () => void
}

export function ResearchPanel({ open, onClose }: ResearchPanelProps) {
  return (
    <div className={`drawer-layer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button className="drawer-scrim" aria-label="關閉研究依據" onClick={onClose} />
      <aside className="research-drawer" role="dialog" aria-modal="true" aria-labelledby="research-title">
        <header>
          <div>
            <p className="eyebrow">Evidence, with limits</p>
            <h2 id="research-title">研究依據與誠實邊界</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="關閉">
            <X />
          </button>
        </header>

        <div className="evidence-summary">
          <FlaskConical aria-hidden="true" />
          <p>
            文獻支持數位動作量測與居家長期追蹤的可行性；目前尚未證明
            DoseLoop PD 能改善臨床結果。
          </p>
        </div>

        <div className="boundary-list">
          <p><ShieldCheck />穿戴資料本身不一定改善日常動作波動。</p>
          <p><ShieldCheck />發藥紀錄不等於患者已吞下藥物。</p>
          <p><ShieldCheck />本系統是追蹤與共同複核工具，不做診斷或自動調藥。</p>
        </div>

        <div className="source-list">
          {researchSources.map((source) => (
            <a href={source.href} target="_blank" rel="noreferrer" key={source.href}>
              <span className="source-year">{source.year}</span>
              <span>
                <strong>{source.title}</strong>
                <small>{source.takeaway}</small>
                <em>限制：{source.limitation}</em>
              </span>
              <ExternalLink aria-label="開啟來源" />
            </a>
          ))}
        </div>
      </aside>
    </div>
  )
}
