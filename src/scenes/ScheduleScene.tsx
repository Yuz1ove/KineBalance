import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Pill
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'

interface ScheduleSceneProps {
  onNext: () => void
}

export function ScheduleScene({ onNext }: ScheduleSceneProps) {
  return (
    <SceneShell
      eyebrow="Scene 01 · Today"
      title="今天，照著熟悉的節奏"
      description="處方與發藥時間來自醫師核准內容及安全規則。DoseLoop 只協助記錄、提醒與複核。"
      aside={<StatusPill tone="teal" icon="safe">家屬連結正常</StatusPill>}
    >
      <div className="schedule-layout">
        <section className="next-dose-card">
          <div className="card-topline">
            <span><CalendarDays /> 下一個處方時段</span>
            <StatusPill tone="blue" icon="scheduled">已排程</StatusPill>
          </div>
          <div className="dose-time">
            <span className="time">14:00</span>
            <span className="countdown">約 42 分鐘後</span>
          </div>
          <div className="medication-row">
            <div className="medication-icon" aria-hidden="true">
              <Pill />
            </div>
            <div>
              <strong>第 3 時段取藥任務</strong>
              <p>內容依醫師核准處方 · 原型展示</p>
            </div>
            <span className="dose-count">模型藥物 × 2</span>
          </div>
          <button className="primary-button large" onClick={onNext}>
            開始服藥前指尖測試
            <ArrowRight />
          </button>
          <p className="support-copy">
            若不方便測試，仍會依原定安全時程發藥，不阻擋、不延遲。
          </p>
        </section>

        <aside className="today-timeline">
          <div className="card-topline">
            <span>今日紀錄</span>
            <small>2026 / 07 / 30</small>
          </div>
          <ol>
            <li className="done">
              <span className="timeline-dot"><CheckCircle2 /></span>
              <div>
                <time>08:00</time>
                <strong>上午時段</strong>
                <StatusPill tone="teal" icon="success">已發藥</StatusPill>
              </div>
            </li>
            <li className="done">
              <span className="timeline-dot"><CheckCircle2 /></span>
              <div>
                <time>11:00</time>
                <strong>中午時段</strong>
                <StatusPill tone="amber" icon="review">待複核</StatusPill>
              </div>
            </li>
            <li className="current">
              <span className="timeline-dot"><BellRing /></span>
              <div>
                <time>14:00</time>
                <strong>下一個時段</strong>
                <StatusPill tone="blue" icon="scheduled">已排程</StatusPill>
              </div>
            </li>
            <li>
              <span className="timeline-dot" />
              <div>
                <time>18:00</time>
                <strong>傍晚時段</strong>
                <span className="muted">尚未開始</span>
              </div>
            </li>
          </ol>
          <div className="care-link">
            <span><HeartHandshake /></span>
            <div>
              <strong>家屬照護連結</strong>
              <p>主要照顧者 · 最近同步 1 分鐘前</p>
            </div>
            <i aria-label="連線正常" />
          </div>
        </aside>
      </div>
      <div className="definition-strip" role="note">
        <strong>安全用語</strong>
        「已發藥」表示設備完成交付至取藥抽屜；抽屜開啟也不等於已吞下藥物。
      </div>
    </SceneShell>
  )
}
