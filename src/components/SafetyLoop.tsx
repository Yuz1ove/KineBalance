import { BrainCircuit, Camera, Hand, PackageCheck, Scale, Timer, Users } from 'lucide-react'

export function SafetyLoop() {
  return (
    <section className="safety-loop" aria-labelledby="loop-title">
      <header>
        <p className="eyebrow">Physical AI safety loop</p>
        <h2 id="loop-title">感知—決策—行動，處方規則在環外受保護</h2>
      </header>
      <div className="loop-grid">
        <div className="loop-column sensing">
          <span className="loop-index">01 感知</span>
          <p><Timer /> 發藥時間</p>
          <p><Hand /> 指尖動作</p>
          <p><Scale /> 重量感測</p>
          <p><Camera /> 藥物影像</p>
        </div>
        <div className="loop-arrow" aria-hidden="true">→</div>
        <div className="loop-column deciding">
          <span className="loop-index">02 決策</span>
          <p><BrainCircuit /> 有效性與動作特徵分開</p>
          <p><BrainCircuit /> 個人趨勢安全分級</p>
          <p><BrainCircuit /> 連續操作失敗協助分流</p>
          <p><BrainCircuit /> 發藥結果核對</p>
          <p><BrainCircuit /> 無效重測或硬體暫停</p>
        </div>
        <div className="loop-arrow" aria-hidden="true">→</div>
        <div className="loop-column acting">
          <span className="loop-index">03 行動</span>
          <p><PackageCheck /> 發出醫師核准劑量</p>
          <p><PackageCheck /> 異常批次鎖定暫存</p>
          <p><Users /> 操作協助提醒／共同複核</p>
        </div>
      </div>
      <footer>
        <ShieldLock />
        <p>
          <strong>不可由 AI 變更的安全邊界</strong>
          AI 不能停止用藥，也不能更改藥物、劑量或服藥時間。只有分藥硬體偵測到重量、影像、
          卡藥或重複出藥風險，才能暫停本次自動交付；這不等於停止患者用藥，必須等待照顧者人工確認。
        </p>
      </footer>
    </section>
  )
}

function ShieldLock() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 4 40 10v12c0 10.4-6.8 18.4-16 22C14.8 40.4 8 32.4 8 22V10l16-6Z" />
      <rect x="17" y="20" width="14" height="11" rx="3" />
      <path d="M20 20v-3a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
