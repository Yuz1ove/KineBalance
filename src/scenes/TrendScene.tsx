import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  Info,
  Minus,
  ShieldCheck,
  TrendingUp
} from 'lucide-react'
import { SceneShell } from '../components/SceneShell'
import { StatusPill } from '../components/StatusPill'
import { evaluatePersonalTrend } from '../lib/tapMetrics'

type TrendState = 'baseline' | 'invalid' | 'single' | 'attention' | 'escalation'

interface TrendSceneProps {
  onNext: () => void
}

const stateCopy: Record<TrendState, {
  title: string
  tab: string
  description: string
  tone: 'teal' | 'amber'
  icon: React.ReactNode
  deviations: boolean[]
  validBaselinePairs: number
  currentTestValid?: boolean
}> = {
  baseline: {
    title: '累積基線中',
    tab: '累積基線中',
    description: '尚未建立個人近期範圍，先持續累積有效的服藥前後配對資料。',
    tone: 'teal',
    icon: <TrendingUp />,
    deviations: [],
    validBaselinePairs: 6
  },
  invalid: {
    title: '測試無效，先確認是否需要協助',
    tab: '測試無效',
    description: '單次無效不納入動作趨勢；連續兩次交替錯誤或本人求助時，改發非緊急照護協助提醒。',
    tone: 'amber',
    icon: <Minus />,
    deviations: [false, false],
    validBaselinePairs: 10,
    currentTestValid: false
  },
  single: {
    title: '單次有效偏離',
    tab: '單次偏離',
    description: '測試有效，但本次速度低於個人近期範圍；先記錄並持續觀察。',
    tone: 'amber',
    icon: <AlertTriangle />,
    deviations: [false, false, true],
    validBaselinePairs: 10
  },
  attention: {
    title: '建議照顧者關注',
    tab: '3 次中 2 次',
    description: '最近 3 次有效資料中有 2 次偏離，發送非緊急照顧者提醒。',
    tone: 'amber',
    icon: <BellRing />,
    deviations: [true, false, true],
    validBaselinePairs: 10
  },
  escalation: {
    title: '已通知主要照顧者',
    tab: '連續 3 次',
    description: '連續 3 次有效偏離，建議與醫療團隊共同複核，並建立回診摘要。',
    tone: 'amber',
    icon: <BellRing />,
    deviations: [true, true, true],
    validBaselinePairs: 10
  }
}

const data: Record<TrendState, Array<number | null>> = {
  baseline: [5, 8, 4, 10, 7, 9],
  invalid: [5, 8, 4, 10, 7, 9, 6, 11, 8, 7, null, 6],
  single: [5, 8, 4, 10, 7, 9, 6, 11, 8, 7, 9, 19],
  attention: [5, 8, 4, 10, 7, 9, 6, 11, 8, 17, 8, 19],
  escalation: [5, 8, 4, 10, 7, 9, 6, 11, 15, 18, 21, 19]
}

export function TrendScene({ onNext }: TrendSceneProps) {
  const [trendState, setTrendState] = useState<TrendState>('baseline')
  const copy = stateCopy[trendState]
  const assessment = useMemo(
    () => evaluatePersonalTrend({
      deviations: copy.deviations,
      validBaselinePairs: copy.validBaselinePairs,
      currentTestValid: copy.currentTestValid
    }),
    [copy]
  )

  return (
    <SceneShell
      eyebrow="場景 05 · 個人長期反應"
      title="看自己的長期變化，不和別人比較"
      description="每個資料點都來自同一個人的服藥前後差值；單次低手速只記錄，不通知家屬，也不改變任何用藥。"
      aside={<StatusPill tone="blue">概念展示／模擬資料</StatusPill>}
    >
      <div className="trend-state-tabs" role="tablist" aria-label="趨勢狀態展示">
        {(Object.keys(stateCopy) as TrendState[]).map((state) => (
          <button
            key={state}
            role="tab"
            aria-selected={trendState === state}
            className={trendState === state ? 'active' : ''}
            onClick={() => setTrendState(state)}
          >
            {stateCopy[state].icon} {stateCopy[state].tab}
          </button>
        ))}
      </div>

      <div className="trend-layout">
        <section className="trend-chart-card">
          <header>
            <div>
              <span>運動反應分數 · 前後差值</span>
              <strong>{copy.validBaselinePairs} 組有效配對 · 模擬資料</strong>
            </div>
            <span className="baseline-key"><i /> 個人基線帶</span>
          </header>
          <TrendChart state={trendState} />
          <footer>
            <span>7 / 19</span>
            <span>7 / 22</span>
            <span>7 / 25</span>
            <span>7 / 28</span>
            <span>今天</span>
          </footer>
        </section>

        <aside className={`trend-insight state-${trendState}`}>
          <div className="insight-icon">{copy.icon}</div>
          <p className="eyebrow">本次原型判讀</p>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>

          <div className="delta-block">
            <span>本次前後差值</span>
            <strong>
              {trendState === 'invalid' || trendState === 'baseline'
                ? '—'
                : '+19'}
            </strong>
            <small>分 · 模擬指標</small>
          </div>

          {assessment.level === 'caregiver-notified' ? (
            <div className="deviation-rule notice-rule">
              <BellRing />
              <p>
                <strong>3 / 3 次連續有效偏離</strong>
                已通知主要照顧者，建議與醫療團隊共同複核。回診摘要已建立。
              </p>
            </div>
          ) : assessment.level === 'caregiver-attention' ? (
            <div className="deviation-rule notice-rule">
              <BellRing />
              <p>
                <strong>最近 3 次中有 2 次偏離</strong>
                主要照顧者已收到非緊急提醒。
              </p>
            </div>
          ) : assessment.level === 'invalid-retest' ? (
            <div className="deviation-rule muted-rule">
              <Info />
              <p>
                <strong>單次先引導重測，不自動升級成醫療警報</strong>
                連續兩次交替錯誤或本人求助時，通知主要照顧者協助操作；仍不影響原處方。
              </p>
            </div>
          ) : assessment.level === 'baseline-building' ? (
            <div className="deviation-rule safe-rule">
              <TrendingUp />
              <p>
                <strong>累積基線中 · {copy.validBaselinePairs} / 7 組</strong>
                建議以 7 至 14 組有效的服藥前後配對資料作為原型設定。
              </p>
            </div>
          ) : (
            <div className="deviation-rule safe-rule">
              <Check />
              <p>
                <strong>記錄並持續觀察，不立即通知</strong>
                本次結果不影響依醫囑用藥。
              </p>
            </div>
          )}

          <button className="primary-button large" onClick={onNext}>
            前往共同複核 <ArrowRight />
          </button>
        </aside>
      </div>
      <div className="acute-safety-note">
        <ShieldCheck />
        <p>
          <strong>點擊速度不推論急性危險事件。</strong>
          急性危險事件必須來自患者主動回報或其他安全感測。
        </p>
      </div>
      <p className="chart-disclaimer">
        最近 3 次中 2 次與連續 3 次門檻為「原型規則，尚待臨床校準」；不代表症狀嚴重度或用藥效果。
      </p>
    </SceneShell>
  )
}

function TrendChart({ state }: { state: TrendState }) {
  const values = data[state]
  const x = (index: number) => 56 + index * 54
  const y = (value: number) => 232 - value * 7.4
  const segments: string[] = []
  let current = ''
  values.forEach((value, index) => {
    if (value === null) {
      if (current) segments.push(current)
      current = ''
    } else {
      current += `${current ? ' L' : 'M'}${x(index)} ${y(value)}`
    }
  })
  if (current) segments.push(current)

  return (
    <svg viewBox="0 0 700 290" className="trend-svg" role="img" aria-label={`${stateCopy[state].title}趨勢圖`}>
      <defs>
        <linearGradient id="baselineBand" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#4b9f92" stopOpacity=".08" />
          <stop offset=".5" stopColor="#4b9f92" stopOpacity=".18" />
          <stop offset="1" stopColor="#4b9f92" stopOpacity=".08" />
        </linearGradient>
      </defs>
      {[40, 100, 160, 220].map((lineY) => (
        <line key={lineY} x1="40" y1={lineY} x2="670" y2={lineY} stroke="#dfe8e6" />
      ))}
      <path d="M40 141 Q190 125 340 143 T670 136 L670 205 Q510 196 340 207 T40 199Z" fill="url(#baselineBand)" />
      <path d="M40 141 Q190 125 340 143 T670 136" fill="none" stroke="#64a99f" strokeDasharray="5 6" />
      <path d="M40 199 Q190 191 340 207 T670 205" fill="none" stroke="#64a99f" strokeDasharray="5 6" />
      {segments.map((path, index) => (
        <path
          key={`${state}-${index}`}
          className="trend-line"
          d={path}
          fill="none"
          stroke={state === 'attention' || state === 'escalation' || state === 'single' ? '#b47b37' : '#16485b'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {values.map((value, index) =>
        value === null ? (
          <g key={index}>
            <circle cx={x(index)} cy="174" r="11" fill="#fff" stroke="#c28d42" strokeWidth="3" strokeDasharray="3 3" />
            <path d={`M${x(index) - 4} 174h8`} stroke="#c28d42" strokeWidth="2" />
          </g>
        ) : (
          <circle
            className="trend-point"
            key={index}
            cx={x(index)}
            cy={y(value)}
            r={index >= 9 && (state === 'attention' || state === 'escalation' || state === 'single') ? 7 : 5}
            fill={index >= 9 && (state === 'attention' || state === 'escalation' || state === 'single') ? '#c2873e' : '#fff'}
            stroke={state === 'attention' || state === 'escalation' || state === 'single' ? '#b47b37' : '#16485b'}
            strokeWidth="3"
            style={{ animationDelay: `${index * 45}ms` }}
          />
        )
      )}
      <text x="47" y="129" fill="#3d766e">個人基線帶</text>
    </svg>
  )
}
