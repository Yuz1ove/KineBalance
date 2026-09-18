import React from 'react'
import {
  Home,
  Activity,
  Calendar,
  Sparkles,
  FileText,
  Settings,
  Shield,
  CheckCircle2,
  AlertCircle,
  Layers,
  type LucideIcon
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export type TabId = 'home' | 'measure' | 'records' | 'insights' | 'arci' | 'summary' | 'settings'

interface ShellProps {
  currentTab: TabId
  onSelectTab: (tab: TabId) => void
  hasIdentity: boolean
  isDemo?: boolean
  children: React.ReactNode
}

export const Shell: React.FC<ShellProps> = ({
  currentTab,
  onSelectTab,
  hasIdentity,
  isDemo = false,
  children,
}) => {
  const shouldReduceMotion = useReducedMotion()

  const navItems: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
    { id: 'home', label: '首頁概覽', icon: Home },
    { id: 'measure', label: '開始量測', icon: Activity },
    { id: 'records', label: '紀錄與趨勢', icon: Calendar },
    { id: 'insights', label: 'ARCI 解讀', icon: Sparkles },
    { id: 'arci', label: 'ARCI 核心', icon: Layers },
    { id: 'summary', label: '回診摘要', icon: FileText },
    { id: 'settings', label: '設定與隱私', icon: Settings },
  ]

  return (
    <div className="kb-app-shell">
      {/* Desktop Sidebar */}
      <aside className="kb-sidebar">
        <div className="kb-sidebar-brand">
          <div className="kb-brand-title">
            <span>KineBalance</span>
            {isDemo ? (
              <span className="kb-badge kb-badge-accent" style={{ fontSize: 11, padding: '2px 8px' }}>
                展示模式
              </span>
            ) : (
              <span className="kb-brand-badge">正式版</span>
            )}
          </div>
          <p className="kb-brand-sub">動作紀錄與變化觀察工具</p>
        </div>

        <nav aria-label="主要導覽" className="kb-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`kb-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && !shouldReduceMotion && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="kb-nav-active-pill"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {isActive && shouldReduceMotion && (
                  <div className="kb-nav-active-pill" />
                )}
                <Icon size={20} className="kb-nav-icon" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="kb-sidebar-footer">
          <div className="kb-identity-chip">
            {isDemo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    className="kb-identity-dot"
                    style={{
                      background: 'var(--kb-accent)',
                      boxShadow: '0 0 6px rgba(164, 109, 80, 0.4)',
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>DEMO-001 展示個案 A</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--kb-text-muted)', marginLeft: 16 }}>
                  合成展示資料 (56 筆)
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  className="kb-identity-dot"
                  style={{
                    background: hasIdentity ? 'var(--kb-success)' : 'var(--kb-warning)',
                    boxShadow: hasIdentity
                      ? '0 0 6px rgba(61, 104, 78, 0.4)'
                      : '0 0 6px rgba(154, 101, 23, 0.4)',
                  }}
                />
                <span>{hasIdentity ? '個人紀錄已連結' : '未建立紀錄身分'}</span>
              </div>
            )}
          </div>

          <div className="kb-sidebar-disclaimer">
            <Shield size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            <span>研究與工程原型，用於動作紀錄與變化觀察，不提供診斷或用藥建議。</span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="kb-mobile-header">
        <div className="kb-brand-title" style={{ fontSize: 18 }}>
          <span>KineBalance</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          {isDemo ? (
            <span className="kb-badge kb-badge-accent" style={{ padding: '3px 8px' }}>
              <Sparkles size={12} /> 展示模式
            </span>
          ) : hasIdentity ? (
            <span className="kb-badge kb-badge-success" style={{ padding: '3px 8px' }}>
              <CheckCircle2 size={12} /> 已連結
            </span>
          ) : (
            <span className="kb-badge kb-badge-warning" style={{ padding: '3px 8px' }}>
              <AlertCircle size={12} /> 未建立
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="kb-main" id="main-content" tabIndex={-1}>
        <div className="kb-content-container">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="手機主要導覽" className="kb-mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`kb-mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.label.replace(/與.*|概覽/, '')}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
export default Shell
