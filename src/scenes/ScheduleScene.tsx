import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HeartHandshake,
  Server
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'

interface ScheduleSceneProps {
  onNext: () => void
}

const scheduleRows = [
  {
    time: '08:00', period: '上午時段', action: '完成交付', note: '家屬已確認抽屜開啟',
    status: '已發藥', tone: 'teal' as const, icon: <CheckCircle2 aria-hidden="true" />
  },
  {
    time: '11:00', period: '中午時段', action: '等待共同複核', note: '偏差紀錄待照護者確認',
    status: '待複核', tone: 'amber' as const, icon: <ClipboardCheck aria-hidden="true" />
  },
  {
    time: '14:00', period: '第 3 時段', action: '服藥前指尖測試', note: '約 42 分鐘後',
    status: '已排程', tone: 'blue' as const, icon: <Clock3 aria-hidden="true" />, current: true
  },
  {
    time: '18:00', period: '傍晚時段', action: '尚未開始', note: '依原定安全時程',
    status: '稍後', tone: 'neutral' as const, icon: <span className="empty-status-dot" aria-hidden="true" />
  }
]

export function ScheduleScene({ onNext }: ScheduleSceneProps) {
  return (
    <SceneShell
      eyebrow="今日照護 · 2026.08.13"
      title="今日照護總覽"
      description="處方與發藥時間來自醫師核准內容及安全規則。KineBalance 只協助記錄、提醒與複核。"
      aside={<StatusPill tone="teal" icon="safe">家屬連線正常</StatusPill>}
    >
      <div className="landscape-quick-action">
        <button className="primary-button" onClick={onNext}>
          開始服藥前指尖測試 <ArrowRight aria-hidden="true" />
        </button>
        <small>約 2–3 分鐘完成 · 不影響用藥</small>
      </div>
      <section className="care-schedule" aria-labelledby="care-schedule-title">
        <h2 id="care-schedule-title" className="sr-only">今日用藥時程</h2>
        <div className="care-schedule-head" aria-hidden="true">
          <span>時間</span><span>狀態</span><span>時段</span><span>下一步</span><span>備註</span>
        </div>
        <ol className="care-schedule-rows">
          {scheduleRows.map((row) => (
            <li className={row.current ? 'current' : ''} key={row.time}>
              <time>{row.time}</time>
              <StatusPill tone={row.tone}>{row.icon}{row.status}</StatusPill>
              <strong>{row.period}</strong>
              <span>{row.action}</span>
              <small>{row.note}</small>
            </li>
          ))}
        </ol>

        <div className="task-detail">
          <div className="task-detail-copy">
            <span className="task-kicker"><Clock3 aria-hidden="true" /> 下一個處方時段</span>
            <h2>第 3 時段取藥任務</h2>
            <div className="task-meta"><span>約 42 分鐘後</span><span>依醫師核准處方</span></div>
            <p>先完成簡短的服藥前動作測試，建立這個時段的個人基準。若暫時不方便，仍會依原定安全時程發藥。</p>
          </div>
          <div className="task-action">
            <button className="primary-button large" onClick={onNext}>
              開始服藥前指尖測試 <ArrowRight aria-hidden="true" />
            </button>
            <small>約 2–3 分鐘完成 · 不影響用藥</small>
          </div>
        </div>
      </section>

      <section className="operational-status" aria-label="系統運作狀態">
        <div><Activity aria-hidden="true" /><span><small>最近一次動作測試</small><strong>今日 11:02 · 已記錄</strong></span></div>
        <div><Server aria-hidden="true" /><span><small>發藥設備</small><strong>KineBalance Home · KB-01</strong></span></div>
        <div><HeartHandshake aria-hidden="true" /><span><small>家屬照護連結</small><strong>最近同步 1 分鐘前</strong></span></div>
      </section>

      <div className="definition-strip" role="note">
        <strong>安全用語</strong>
        「已發藥」表示設備完成交付至取藥抽屜；抽屜開啟也不等於已吞下藥物。
      </div>
    </SceneShell>
  )
}
