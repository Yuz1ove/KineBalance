import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronRight, Menu, Pause, Play, X } from 'lucide-react'
import { cover, illustrationRecords } from './config'
import { MotionPreference, useMotionPreference } from './MotionPreference'

export function BrandMark() { return <span className="kb-mark" aria-hidden="true"><i /><i /><i /><i /></span> }

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [menu, setMenu] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionPreference()
  useEffect(() => {
    if (!menu) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(false); menuButton.current?.focus() } }
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [menu])
  useEffect(() => {
    if (reduced || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('kb-revealed'); observer.unobserve(entry.target) }
    }), { threshold: .12 })
    root.current?.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [reduced])
  return <div className="kb-cover" ref={root}>
    <a className="kb-skip" href="#cover-content">跳至主要內容</a>
    <header className="kb-header">
      <a className="kb-brand" href="#cover" aria-label="KineBalance 首頁"><BrandMark /><span>KineBalance<span className="kb-brand-sub">MOVEMENT IN CONTEXT</span></span></a>
      <button ref={menuButton} className="kb-menu-toggle" aria-label={menu ? '關閉選單' : '開啟選單'} aria-expanded={menu} aria-controls="cover-navigation" onClick={() => setMenu(v => !v)}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
      <nav id="cover-navigation" className={menu ? 'is-open' : ''} aria-label="封面導覽">
        <a href="#intro" onClick={() => setMenu(false)}>工具介紹</a><a href="#workflow" onClick={() => setMenu(false)}>使用流程</a>
        <button className="kb-button kb-nav-enter" onClick={onEnter}>進入工作台 <ArrowRight size={16} /></button>
      </nav>
    </header>
    <main id="cover-content">
      <section className="kb-hero" aria-labelledby="cover-title">
        <div className="kb-hero-copy">
          <p className="kb-kicker kb-intro-1"><span /> {cover.position}</p>
          <h1 id="cover-title" tabIndex={-1} className="kb-intro-2">{cover.title[0]}<br /><em>{cover.title[1]}</em></h1>
          <p className="kb-hero-description kb-intro-3">{cover.description}</p>
          <div className="kb-hero-actions kb-intro-4"><button className="kb-button kb-primary" onClick={onEnter}>{cover.enter}<ArrowRight size={19} /></button><a href="#workflow" className="kb-text-link">了解使用流程 <ArrowDown size={16} /></a></div>
          <div className="kb-hero-footnote kb-intro-4"><span>動作量測</span><span>背景紀錄</span><span>可查核的計算</span></div>
        </div>
        <RhythmVisual />
      </section>
      <section className="kb-introduction" id="intro" data-reveal>
        <div><span className="kb-kicker">A CLEARER VIEW OF MOVEMENT</span><h2>不只留下數字。<br />也留下理解它的線索。</h2></div>
        <div><p>一次量測，是一個時間點的紀錄。<br />把時間、操作條件與背景放在一起，<br className="kb-desktop-break" />才有清楚、可比較的觀察。</p><p className="kb-small-note">目前提供工程量測與背景自述；正式臨床量表及醫療研究判讀尚未開放。</p></div>
      </section>
      <ProductStory />
      <section className="kb-start" data-reveal><div><span className="kb-kicker">YOUR NEXT OBSERVATION</span><h2>從這一次，開始記錄。</h2><p>開啟工作台，選擇資料來源，再進行量測。</p></div><button className="kb-button kb-primary" onClick={onEnter}>{cover.enter}<ArrowRight size={19} /></button></section>
    </main>
    <footer className="kb-footer"><div className="kb-footer-brand"><BrandMark /><strong>KineBalance</strong><span>量測有跡，理解有據。</span></div><div className="kb-footer-bottom"><p>本機研究工具 · 非診斷與處方用途</p><MotionPreference /><a href="#cover">回到頂端 ↑</a></div></footer>
  </div>
}

function RhythmVisual() {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(true)
  const [visible, setVisible] = useState(document.visibilityState !== 'hidden')
  const { reduced, paused, togglePaused } = useMotionPreference()
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', update)
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => setInView(e.isIntersecting)) : null
    if (ref.current) observer?.observe(ref.current)
    return () => { document.removeEventListener('visibilitychange', update); observer?.disconnect() }
  }, [])
  const stopped = reduced || paused || !visible || !inView
  return <figure ref={ref} className="kb-rhythm kb-intro-4" data-stopped={stopped}>
    <figcaption><span className="kb-kicker">MOTION / RHYTHM / TIME</span><span className="kb-demo-label">介面示意</span></figcaption>
    <div className="kb-rhythm-art">
      <svg viewBox="0 0 520 370" role="img" aria-labelledby="rhythm-title"><title id="rhythm-title">動作與時間的概念構圖，非患者資料或醫療判斷</title>
        <g fill="none" stroke="currentColor" strokeWidth="1" className="kb-orbits">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <path key={i} d={`M ${38+i*8} 244 C ${100+i*5} ${235-i*14}, ${125+i*4} ${52+i*7}, 242 ${65+i*9} S ${339+i*6} ${287-i*4}, ${471-i*4} ${113+i*13}`} />)}
        </g>
        <path className="kb-path" d="M 50 244 C 107 217, 136 56, 242 83 S 369 275, 463 139" fill="none" stroke="#315647" strokeWidth="2.5" />
        <g fill="#315647"><circle cx="50" cy="244" r="5" /><circle cx="242" cy="83" r="6" /><circle cx="463" cy="139" r="5" /></g>
        <g stroke="#a0b09e" strokeDasharray="3 5"><path d="M 242 98 V 298" /><path d="M 463 154 V 298" /></g>
        <circle className="kb-pulse" cx="242" cy="83" r="17" fill="none" stroke="#315647" />
        <text x="22" y="320" className="kb-svg-caption">每個動作，都是一個時間的註記。</text>
      </svg>
      <div className="kb-art-note"><span className="kb-note-dot" /><span>原始事件<br /><small>時間・順序・輸入方式</small></span></div>
    </div>
    <div className="kb-sequence"><div><span>左右交替</span><small>事件序列示意</small></div><svg viewBox="0 0 300 58" role="img" aria-label="左右目標的交替事件，裝飾示意"><path d="M 10 16 H 290 M 10 42 H 290" stroke="#c0cdbd" />{[0,1,2,3,4,5,6,7,8].map(i=><circle className="kb-event-dot" key={i} style={{animationDelay:`${i*.18}s`}} cx={14+i*33} cy={i%2?42:16} r="4" fill="#315647" />)}</svg></div>
    <div className="kb-visual-footer"><span>概念構圖 · 非即時量測</span><button aria-pressed={paused || reduced} disabled={reduced} onClick={togglePaused}>{paused || reduced ? <Play size={13}/> : <Pause size={13}/>} {reduced ? '靜態呈現' : paused ? '播放動態' : '暫停動態'}</button></div>
  </figure>
}

function ProductStory() {
  const [step, setStep] = useState<string>(cover.steps[0].id)
  const [record, setRecord] = useState(1)
  const selected = illustrationRecords[record]
  return <section className="kb-story" id="workflow" aria-labelledby="workflow-title" data-reveal>
    <header className="kb-story-heading"><span className="kb-kicker">HOW IT WORKS / 使用流程</span><h2 id="workflow-title">讓資料，慢慢說清楚。</h2><p>三個步驟，從一次操作走向有依據的觀察。</p></header>
    <div className="kb-story-grid">
      <div className="kb-story-steps" aria-label="切換流程展示">{cover.steps.map(s=><button key={s.id} aria-pressed={step===s.id} onClick={()=>setStep(s.id)}><span className="kb-step-number">{s.number}</span><span><small>{s.en}</small><h3>{s.title}</h3><p>{s.description}</p></span><ChevronRight size={20}/></button>)}</div>
      <div className="kb-workflow-preview"><div className="kb-preview-chrome"><span><BrandMark /> KineBalance</span><span className="kb-demo-label">示範資料 · 不會保存</span></div>
        <div className="kb-preview-content" key={step}>
          {step==='record'?<><span className="kb-kicker">01 / 量測準備</span><h3>先記下，當下的條件。</h3><div className="kb-example-fields"><div><small>輸入方式</small><strong>鍵盤 F / J</strong></div><div><small>操作目標</small><strong>左右交替</strong></div></div><div className="kb-preview-pads"><span>F<small>左側</small></span><span>J<small>右側</small></span></div><p className="kb-preview-hint"><Check size={15}/>工作台會保留時間、裝置與原始事件。</p></>:step==='compare'?<><span className="kb-kicker">02 / 趨勢對照</span><h3>選一筆紀錄，看看細節。</h3><div className="kb-preview-chart"><span>敲擊速率（次／秒）</span><svg viewBox="0 0 420 180" role="img" aria-label="三筆示範速率，亦可用下方按鈕選取"><path d="M 30 35 H 390 M 30 95 H 390 M 30 155 H 390" stroke="#d8ded5" fill="none"/><path d="M 60 112 L 210 64 L 360 132" stroke="#315647" fill="none" strokeWidth="2"/>{illustrationRecords.map((r,i)=><g key={r.id} role="button" tabIndex={0} aria-label={`示範紀錄 ${r.id}，${r.rate} 次每秒`} onClick={()=>setRecord(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setRecord(i)}}}><circle cx={r.x} cy={r.y} r="20" fill="transparent"/><circle cx={r.x} cy={r.y} r={record===i?8:5} fill="#315647" stroke="#fefdf9" strokeWidth="3"/></g>)}</svg></div><div className="kb-record-selector" aria-label="示範紀錄">{illustrationRecords.map((r,i)=><button key={r.id} aria-pressed={record===i} onClick={()=>setRecord(i)}>{r.day}<small>紀錄 {r.id}</small></button>)}</div><p className="kb-selected-record" role="status">紀錄 {selected.id}<strong>{selected.rate} <small>次／秒</small></strong><span>合成示意 · 不是臨床評分</span></p></>:<><span className="kb-kicker">03 / 依據紀錄</span><h3>數值之外，還有來由。</h3><ol className="kb-proof-chain"><li><span>輸入摘要</span><small>原始事件・背景版本</small></li><li><span>品質與計算</span><small>有效事件數 ÷ 有效秒數</small></li><li><span>參考依據</span><small>研究檢索尚未資格化</small></li><li><span>結果與限制</span><small>描述操作，不推定病情</small></li></ol><p className="kb-preview-hint">工作台可逐層展開公式與實際紀錄。</p></>}
        </div>
        <div className="kb-preview-bottom"><span>產品流程示意</span><span>0{cover.steps.findIndex(s=>s.id===step)+1} / 03</span></div>
      </div>
    </div>
  </section>
}
