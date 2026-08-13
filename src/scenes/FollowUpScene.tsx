import { useEffect, useState } from 'react'
import {
  AlarmClock,
  ArrowRight,
  Bell,
  Check,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Volume2
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'

interface FollowUpSceneProps {
  onNext: () => void
}

export function FollowUpScene({ onNext }: FollowUpSceneProps) {
  const [reminder, setReminder] = useState<'gentle' | 'caregiver' | 'done'>('gentle')
  const [previewMinutes, setPreviewMinutes] = useState(60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || previewMinutes === 0) return
    const timer = window.setInterval(() => {
      setPreviewMinutes((value) => Math.max(0, value - 5))
    }, 120)
    return () => window.clearInterval(timer)
  }, [previewMinutes, running])

  useEffect(() => {
    if (previewMinutes === 0) {
      setRunning(false)
      setReminder('done')
    }
  }, [previewMinutes])

  const replay = () => {
    setPreviewMinutes(60)
    setReminder('gentle')
    setRunning(true)
  }

  return (
    <SceneShell
      eyebrow="場景 04 · 服藥後追蹤"
      title="約 60 分鐘後，再看一次變化"
      description="服藥後測試形成同一時段的前後對照。提醒可調整，但未完成測試不會阻擋本次或下一次正常發藥。"
      aside={<StatusPill tone="teal" icon="success">14:02 已發藥</StatusPill>}
    >
      <div className="followup-layout">
        <section className="response-window-card">
          <div className="response-ring" style={{ '--progress': `${(60 - previewMinutes) / 60}` } as React.CSSProperties}>
            <div>
              {previewMinutes > 0 ? <Clock3 /> : <Check />}
              <strong>{previewMinutes > 0 ? `${previewMinutes}` : '可測試'}</strong>
              <span>{previewMinutes > 0 ? '分鐘後' : '視窗已開啟'}</span>
            </div>
          </div>
          <div className="window-copy">
            <p className="eyebrow">Response window · 概念設定</p>
            <h2>預計 15:02 開始</h2>
            <p>
              以發藥時間作為可信時間錨點，對齊服藥前與約 60 分鐘後的指尖動作特徵。
              實際量測時點須於後續研究驗證。
            </p>
            <div className="window-actions">
              <button className="secondary-button" onClick={replay} disabled={running}>
                <AlarmClock /> {running ? '時間快轉中…' : '快速預覽 60 分鐘'}
              </button>
              <button className="text-button" onClick={onNext}>
                這次不測試，查看趨勢 <ArrowRight />
              </button>
            </div>
          </div>
        </section>

        <aside className="reminder-card">
          <header>
            <div>
              <Bell />
              <span>
                <strong>漸進式提醒</strong>
                <small>依偏好調整方式，不改發藥時程</small>
              </span>
            </div>
            <StatusPill tone={reminder === 'done' ? 'teal' : 'blue'}>
              {reminder === 'done' ? '可開始測試' : '已排程'}
            </StatusPill>
          </header>
          <div className="reminder-options">
            <button
              className={reminder === 'gentle' ? 'selected' : ''}
              onClick={() => setReminder('gentle')}
            >
              <span><Smartphone /></span>
              <div>
                <strong>螢幕＋柔和提示音</strong>
                <small>15:02 第一次提醒</small>
              </div>
              <i>{reminder === 'gentle' ? <Check /> : null}</i>
            </button>
            <button
              className={reminder === 'caregiver' ? 'selected' : ''}
              onClick={() => setReminder('caregiver')}
            >
              <span><MessageCircle /></span>
              <div>
                <strong>同步給家屬</strong>
                <small>僅提示協助，不視為異常警報</small>
              </div>
              <i>{reminder === 'caregiver' ? <Check /> : null}</i>
            </button>
            <button>
              <span><Volume2 /></span>
              <div>
                <strong>大型語音提示</strong>
                <small>可由本人或家屬設定偏好</small>
              </div>
            </button>
          </div>
          <div className="nonblocking-note">
            <ShieldCheck />
            <p>
              <strong>未完成測試也不中斷用藥</strong>
              系統記錄「資料不足」，仍依原定處方安全時程發藥。
            </p>
          </div>
        </aside>
      </div>

      <div className="comparison-preview">
        <div>
          <span>14:00</span>
          <strong>服藥前測試</strong>
          <StatusPill tone="teal" icon="success">資料品質良好</StatusPill>
        </div>
        <span className="comparison-line">
          <i />
          <small>約 60 分鐘</small>
          <i />
        </span>
        <div>
          <span>15:02</span>
          <strong>服藥後測試</strong>
          <StatusPill tone={reminder === 'done' ? 'blue' : 'neutral'} icon="scheduled">
            {reminder === 'done' ? '可開始' : '等待中'}
          </StatusPill>
        </div>
      </div>
    </SceneShell>
  )
}
