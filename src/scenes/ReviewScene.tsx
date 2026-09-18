import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  Check,
  ChevronRight,
  HeartHandshake,
  Info,
  LockKeyhole,
  RotateCcw,
  Stethoscope,
  UserRound
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'
import { SafetyLoop } from '../components/SafetyLoop'
import { evaluatePersonalTrend } from '../lib/tapMetrics'

interface ReviewSceneProps {
  onRestart: () => void
}

export function ReviewScene({ onRestart }: ReviewSceneProps) {
  const [deviationCount, setDeviationCount] = useState(1)
  const [acknowledged, setAcknowledged] = useState(false)
  const recentReadings = useMemo(
    () => Array.from({ length: 3 }, (_, index) => index >= 3 - deviationCount),
    [deviationCount]
  )
  const assessment = useMemo(
    () => evaluatePersonalTrend({
      deviations: recentReadings,
      validBaselinePairs: 10
    }),
    [recentReadings]
  )
  const notificationState =
    acknowledged
      ? 'acknowledged'
      : assessment.level === 'caregiver-notified'
        ? 'notified'
        : assessment.level === 'caregiver-attention'
          ? 'attention'
          : 'watching'

  const addReading = () => {
    if (deviationCount < 3) {
      setDeviationCount((value) => value + 1)
      setAcknowledged(false)
    }
  }

  const reset = () => {
    setDeviationCount(1)
    setAcknowledged(false)
  }

  return (
    <SceneShell
      eyebrow="場景 06 · 照護團隊複核"
      title="先看趨勢，再由人共同複核"
      description="單次偏離只記錄；最近 3 次中 2 次偏離發送非緊急提醒，連續 3 次偏離則通知主要照顧者並建立回診摘要。"
      aside={<StatusPill tone="amber" icon="review">原型規則 · 尚待臨床校準</StatusPill>}
    >
      <div className="review-layout">
        <section className="rule-simulator">
          <header>
            <div>
              <p className="eyebrow">原型規則模擬器</p>
              <h2>安全分級與通知條件</h2>
            </div>
            <button className="icon-button" onClick={reset} aria-label="重設示範">
              <RotateCcw />
            </button>
          </header>
          <div className="reading-track">
            {recentReadings.map((deviated, index) => {
              return (
                <div key={index} className={deviated ? 'filled' : 'within-range'}>
                  <span>{deviated ? <AlertTriangle /> : <Check />}</span>
                  <strong>最近第 {index + 1} 次</strong>
                  <small>{deviated ? '有效偏離' : '近期範圍內'}</small>
                </div>
              )
            })}
          </div>
          <div className="rule-actions">
            <button
              className="secondary-button"
              onClick={addReading}
              disabled={deviationCount >= 3}
            >
              新增下一次模擬資料
            </button>
            <span>最近 3 次中 {deviationCount} 次有效偏離</span>
          </div>
          <div className={`rule-outcome ${assessment.notifyCaregiver ? 'met' : ''}`}>
            {assessment.notifyCaregiver ? <BellRing /> : <Info />}
            <div>
              <strong>{assessment.headline}</strong>
              <p>{assessment.guidance}</p>
            </div>
          </div>
        </section>

        <aside className="review-summary">
          <header>
            <div>
              <span className={`summary-state ${notificationState}`}>
                {notificationState === 'acknowledged'
                  ? <Check />
                  : notificationState === 'notified' || notificationState === 'attention'
                    ? <BellRing />
                    : <LockKeyhole />}
              </span>
              <div>
                <small>共同複核摘要</small>
                <strong>
                  {notificationState === 'acknowledged'
                    ? '照顧者已確認'
                    : notificationState === 'notified'
                      ? '回診摘要已建立'
                      : notificationState === 'attention'
                        ? '非緊急提醒已送出'
                      : '門檻尚未成立'}
                </strong>
              </div>
            </div>
            <StatusPill
              tone={notificationState === 'acknowledged' ? 'teal' : assessment.notifyCaregiver ? 'amber' : 'neutral'}
            >
              {notificationState === 'acknowledged'
                ? '已確認'
                : assessment.notifyCaregiver
                  ? '等待照顧者確認'
                  : '不通知'}
            </StatusPill>
          </header>
          <div className="summary-data">
            <div><span>觀察區間</span><strong>7 / 28 – 7 / 30</strong></div>
            <div><span>有效偏離</span><strong>{deviationCount} / 3 個時段</strong></div>
            <div><span>用藥處方</span><strong>未變更</strong></div>
            <div><span>吞服狀態</span><strong>無法由系統確認</strong></div>
          </div>
          {notificationState === 'attention' ? (
            <p className="caregiver-message">主要照顧者已收到非緊急提醒</p>
          ) : notificationState === 'notified' ? (
            <p className="caregiver-message urgent-review">
              已通知主要照顧者，建議與醫療團隊共同複核
            </p>
          ) : notificationState === 'acknowledged' ? (
            <p className="caregiver-message confirmed">
              已確認，建議於下次回診共同複核
            </p>
          ) : null}
          <div className="recipient-list">
            <Recipient icon={<UserRound />} name="患者本人" role="查看自己的資料脈絡" />
            <Recipient icon={<HeartHandshake />} name="主要照顧者" role="協助確認日常狀況" />
            <Recipient icon={<Stethoscope />} name="醫療團隊" role="結合臨床資訊複核" />
          </div>
          <button
            className="primary-button large"
            disabled={!assessment.notifyCaregiver || acknowledged}
            onClick={() => setAcknowledged(true)}
          >
            {acknowledged
              ? <><Check /> 照顧者已確認</>
              : assessment.notifyCaregiver
                ? <><Check /> 照顧者確認已收到</>
                : <><LockKeyhole /> 單次偏離不通知</>}
          </button>
          <p className="prototype-rule-note">
            <AlertTriangle />
            「最近 3 次中 2 次」與「連續 3 次」皆為原型規則，尚待臨床校準。
          </p>
        </aside>
      </div>

      <SafetyLoop />

      <div className="experience-complete">
        <div>
          <Check />
          <p>
            <strong>六個場景體驗完成</strong>
            AI 不能停止用藥，也不能更改藥物、劑量或服藥時間；點擊結果不阻擋依醫囑用藥。
          </p>
        </div>
        <button className="text-button" onClick={onRestart}>回到今天的時程 <ChevronRight /></button>
      </div>
    </SceneShell>
  )
}

function Recipient({ icon, name, role }: { icon: React.ReactNode; name: string; role: string }) {
  return (
    <div>
      <span>{icon}</span>
      <p><strong>{name}</strong><small>{role}</small></p>
      <Check />
    </div>
  )
}
