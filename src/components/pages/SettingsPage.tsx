import { browserStorageEnabled } from '../../services/browserStorage'
import React, { useState, useEffect } from 'react'
import {
  Key,
  Database,
  Shield,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Info,
  ShieldAlert,
  HardDrive
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import {
  kbpdApi,
  type StorageUsage,
  type DeletionReceipt,
} from '../../services/kbpdApi'
import { MotionSection } from '../motion/MotionSection'

interface SettingsPageProps {
  token: string | null
  userId: string | null
  onIdentityChanged: () => void
  isDemo?: boolean
  onEnableDemo?: () => void
  onDisableDemo?: () => void
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  token,
  userId,
  onIdentityChanged,
  isDemo = false,
  onEnableDemo,
  onDisableDemo,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [restoreInputToken, setRestoreInputToken] = useState('')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  // Storage
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)
  const [loadingStorage, setLoadingStorage] = useState(false)

  // Deletion
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletionReceipt, setDeletionReceipt] = useState<DeletionReceipt | null>(null)
  const [deletionError, setDeletionError] = useState<string | null>(null)

  // Receipt lookup state
  const [lookupReceiptToken, setLookupReceiptToken] = useState('')
  const [receiptLookupResult, setReceiptLookupResult] = useState<DeletionReceipt | null>(null)
  const [receiptLookupError, setReceiptLookupError] = useState<string | null>(null)

  const fetchStorage = async () => {
    if (!token) return
    setLoadingStorage(true)
    try {
      const usage = await kbpdApi.getStorageUsage()
      setStorageUsage(usage)
    } catch {
      // Ignored if unauthenticated
    } finally {
      setLoadingStorage(false)
    }
  }

  useEffect(() => {
    fetchStorage()
  }, [token])

  const handleCopyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegisterNew = async () => {
    if (
      token &&
      !confirm(
        '確定要建立新的身分嗎？若未備份目前憑證，您將需要使用目前 Token 才能恢復舊紀錄。'
      )
    ) {
      return
    }

    try {
      await kbpdApi.register()
      setRestoreSuccess(true)
      onIdentityChanged()
      fetchStorage()
    } catch (err: any) {
      setRestoreError(err.message || '建立身分失敗')
    }
  }

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restoreInputToken.trim()) return

    setIsRestoring(true)
    setRestoreError(null)
    setRestoreSuccess(false)

    try {
      await kbpdApi.restoreSession(restoreInputToken.trim())
      setRestoreSuccess(true)
      setRestoreInputToken('')
      onIdentityChanged()
      fetchStorage()
    } catch (err: any) {
      setRestoreError(err.message || '憑證無效或會話已過期')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDeleteAllData = async () => {
    if (
      !confirm(
        browserStorageEnabled?'此操作會刪除此瀏覽器中目前身分的量測紀錄，無法復原。確定刪除？':'警告：此操作將刪除目前身分的紀錄與私有檔案，無法復原。確定刪除？'
      )
    ) {
      return
    }

    setIsDeleting(true)
    setDeletionError(null)

    try {
      const receipt = await kbpdApi.deleteAccount()
      setDeletionReceipt(receipt)
      onIdentityChanged()
      setStorageUsage(null)
    } catch (err: any) {
      setDeletionError(err.message || '連帶刪除未完成')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLookupReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lookupReceiptToken.trim()) return

    setReceiptLookupError(null)
    setReceiptLookupResult(null)

    try {
      const result = await kbpdApi.getDeletionReceipt(lookupReceiptToken.trim())
      setReceiptLookupResult(result)
    } catch (err: any) {
      setReceiptLookupError(err.message || '查無此刪除回執憑證')
    }
  }

  return (
    <div className="kb-settings-page">
      <MotionSection className="kb-page-header">
        <div className="kb-page-tagline">身分、容量與隱私控制</div>
        <h1 className="kb-page-title">設定與隱私</h1>
        <p className="kb-page-desc">
          管理您的本機紀錄身分憑證、資料儲存空間、私有影像政策與資料連帶清除。
        </p>
      </MotionSection>

      {browserStorageEnabled && <p className="kb-alert">目前使用此瀏覽器的本機保存空間，不是雲端帳號。資料不會跨裝置同步，清除網站資料會刪除紀錄；憑證只能在原瀏覽器讀取既有資料。</p>}
      {/* SECTION 1: Personal Record Identity */}
      <MotionSection className="kb-card">
        <div className="kb-card-header">
          <div>
            <h2 className="kb-card-title">個人紀錄身分與憑證</h2>
            <p className="kb-card-subtitle">
              {browserStorageEnabled?'以瀏覽器產生的隨機代碼區分本機紀錄，無需提供身分證號或電子信箱。':'本系統採用伺服端發放之隨機金鑰進行所有權隔離，無需提供身分證號或電子信箱。'}
            </p>
          </div>
          <span className={`kb-badge ${isDemo ? 'kb-badge-warning' : token ? 'kb-badge-success' : 'kb-badge-warning'}`}>
            {isDemo ? '展示模式隔離中 (DEMO-001)' : token ? '紀錄身分使用中' : '尚未連結身分'}
          </span>
        </div>

        {token ? (
          <div>
            <div className="kb-form-group">
              <label className="kb-label">您的專屬紀錄憑證 (Token)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  readOnly
                  value={token}
                  className="kb-input"
                  style={{ fontFamily: 'var(--kb-font-mono)', fontSize: 14 }}
                />
                <button
                  type="button"
                  className="kb-btn kb-btn-secondary"
                  style={{ width: 48, padding: 0 }}
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? '隱藏憑證' : '顯示完整憑證'}
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  type="button"
                  className="kb-btn kb-btn-secondary"
                  onClick={handleCopyToken}
                >
                  {copied ? (
                    <Check size={18} color="var(--kb-success)" />
                  ) : (
                    <Copy size={18} />
                  )}
                  <span>{copied ? '已複製' : '複製憑證'}</span>
                </button>
              </div>
              <p className="kb-form-hint">
                憑證代表您對紀錄的讀寫權限。建議妥善保存此字串，以便更換裝置或重新整理時恢復紀錄。
              </p>
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="kb-btn kb-btn-ghost kb-btn-sm"
                onClick={handleRegisterNew}
              >
                ＋ 建立全新紀錄身分
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p
              style={{
                fontSize: 15,
                color: 'var(--kb-text-secondary)',
                marginBottom: 16,
              }}
            >
              您目前尚未建立或登入個人紀錄。您可以建立新紀錄，或輸入先前備份的憑證恢復資料。
            </p>
            <button
              type="button"
              className="kb-btn kb-btn-primary"
              onClick={handleRegisterNew}
            >
              建立我的紀錄
            </button>
          </div>
        )}

        {/* Restore Section */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--kb-divider)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>
            恢復既有紀錄
          </h3>
          <p
            style={{
              fontSize: 14,
              color: 'var(--kb-text-secondary)',
              marginBottom: 12,
            }}
          >
            {browserStorageEnabled?'僅能恢復此瀏覽器仍保存的身分；憑證不包含紀錄，也不能跨裝置還原。':'若您曾在此處或另一瀏覽器產生過憑證，可於此貼上還原歷史量測：'}
          </p>

          <form
            onSubmit={handleRestore}
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
          >
            <input
              type="text"
              placeholder={browserStorageEnabled?'貼上此瀏覽器原有憑證':'貼上您的 kbpd_sec_ 憑證'}
              className="kb-input"
              style={{
                flex: '1 1 280px',
                fontFamily: 'var(--kb-font-mono)',
                fontSize: 14,
              }}
              value={restoreInputToken}
              onChange={(e) => setRestoreInputToken(e.target.value)}
            />
            <button
              type="submit"
              className="kb-btn kb-btn-secondary"
              disabled={isRestoring || !restoreInputToken.trim()}
            >
              {isRestoring ? '正在驗證…' : '恢復紀錄'}
            </button>
          </form>

          {restoreError && (
            <div
              className="kb-alert kb-alert-danger"
              style={{ marginTop: 12, padding: '10px 14px' }}
            >
              <AlertTriangle size={16} />
              <span style={{ fontSize: 14 }}>{restoreError}</span>
            </div>
          )}

          {restoreSuccess && (
            <div
              className="kb-alert kb-alert-success"
              style={{ marginTop: 12, padding: '10px 14px' }}
            >
              <Check size={16} />
              <span style={{ fontSize: 14 }}>身分已成功確認並加載最新紀錄！</span>
            </div>
          )}
        </div>
      </MotionSection>

      {/* SECTION: Demo Mode Control */}
      <MotionSection className="kb-card">
        <div className="kb-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="kb-card-title" style={{ margin: 0 }}>展示模式 (Demo Mode)</h2>
              <span className={`kb-badge ${isDemo ? 'kb-badge-warning' : 'kb-badge-neutral'}`}>
                {isDemo ? '展示模式已啟用 (DEMO-001)' : '未啟用'}
              </span>
            </div>
            <p className="kb-card-subtitle" style={{ marginTop: 6 }}>
              載入 14 天受控示範數據（56 筆量測，含 1 筆負向品質案例），供介面體驗、趨勢探索與 ARCI 解讀示範。
            </p>
          </div>
        </div>

        {isDemo ? (
          <div>
            <div
              style={{
                padding: 16,
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
                marginBottom: 16,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                fontSize: 14,
              }}
            >
              <div>
                <span style={{ color: 'var(--kb-text-secondary)', fontSize: 13 }}>個案身分：</span>
                <div style={{ fontWeight: 700, color: 'var(--kb-text-primary)' }}>DEMO-001 (展示個案 A)</div>
              </div>
              <div>
                <span style={{ color: 'var(--kb-text-secondary)', fontSize: 13 }}>時間跨度：</span>
                <div style={{ fontWeight: 650, color: 'var(--kb-text-primary)' }}>2026-09-04 ~ 2026-09-17</div>
              </div>
              <div>
                <span style={{ color: 'var(--kb-text-secondary)', fontSize: 13 }}>數據規模：</span>
                <div style={{ fontWeight: 650, color: 'var(--kb-text-primary)' }}>56 筆 (55 合格 · 1 拒絕)</div>
              </div>
              <div>
                <span style={{ color: 'var(--kb-text-secondary)', fontSize: 13 }}>安全隔離：</span>
                <div style={{ fontWeight: 650, color: 'var(--kb-success)' }}>純前端沙盒 (未污染後端 DB)</div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: 'var(--kb-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              安全保障：關閉展示模式將安全返回空狀態，<strong>絕不會清除或刪除您的真實量測數據與伺服端身分憑證</strong>。
            </p>

            <button
              type="button"
              className="kb-btn kb-btn-secondary"
              style={{ color: 'var(--kb-danger)', borderColor: 'var(--kb-danger)' }}
              onClick={() => {
                if (confirm('確定要關閉展示模式並返回空狀態嗎？您的真實帳號資料不會受到任何影響。')) {
                  onDisableDemo?.()
                }
              }}
            >
              <Trash2 size={16} />
              <span>關閉並清除展示資料</span>
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--kb-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              若您初次使用尚未累積足夠量測數據，可載入內建的 14 天受控合成示範數據（包含雙手開合、服藥前後時段、基準線帶與 ARCI 解讀），快速探索系統各項分析功能。
            </p>
            <button
              type="button"
              className="kb-btn kb-btn-primary"
              onClick={() => onEnableDemo?.()}
            >
              <span>載入展示資料 (Load Demo)</span>
            </button>
          </div>
        )}
      </MotionSection>

      {/* SECTION 2: Storage Quota */}
      <MotionSection className="kb-card">
        <div className="kb-card-header">
          <div>
            <h2 className="kb-card-title">管理資料容量與配額</h2>
            <p className="kb-card-subtitle">
              {browserStorageEnabled?'此瀏覽器最多保存 50MB 量測資料，影像不會保存。':'本機資料庫與私有檔案受限額保護，防止硬碟空間被過度佔用。'}
            </p>
          </div>
          <button
            type="button"
            className="kb-btn kb-btn-ghost kb-btn-sm"
            onClick={fetchStorage}
            disabled={loadingStorage || !token}
          >
            <RefreshCw size={14} className={loadingStorage ? 'kb-spin' : ''} />
            <span>重新整理</span>
          </button>
        </div>

        {storageUsage ? (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                  已使用容量
                </span>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 750,
                    color: 'var(--kb-text-primary)',
                    marginTop: 4,
                  }}
                >
                  {(storageUsage.totalBytesUsed / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>

              <div
                style={{
                  padding: '14px 18px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                  個人總配額上限
                </span>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 750,
                    color: 'var(--kb-text-primary)',
                    marginTop: 4,
                  }}
                >
                  {(storageUsage.quotaBytes / (1024 * 1024)).toFixed(0)} MB
                </div>
              </div>

              <div
                style={{
                  padding: '14px 18px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                  儲存量測紀錄
                </span>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 750,
                    color: 'var(--kb-primary)',
                    marginTop: 4,
                  }}
                >
                  {storageUsage.measurementsCount} 筆
                </div>
              </div>

              <div
                style={{
                  padding: '14px 18px',
                  background: 'var(--kb-surface-subtle)',
                  borderRadius: 'var(--kb-radius-md)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--kb-text-secondary)' }}>
                  保留影片媒體檔案
                </span>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 750,
                    color: 'var(--kb-primary)',
                    marginTop: 4,
                  }}
                >
                  {storageUsage.mediaFilesCount} 個
                </div>
              </div>
            </div>

            {/* Storage Progress Bar */}
            <div
              style={{
                width: '100%',
                height: 10,
                background: 'var(--kb-divider)',
                borderRadius: 5,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(
                    100,
                    (storageUsage.totalBytesUsed / storageUsage.quotaBytes) * 100
                  )}%`,
                  background:
                    storageUsage.totalBytesUsed / storageUsage.quotaBytes > 0.85
                      ? 'var(--kb-danger)'
                      : 'var(--kb-primary)',
                  borderRadius: 5,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--kb-text-muted)',
              }}
            >
              <span>
                佔用比例：
                {(
                  (storageUsage.totalBytesUsed / storageUsage.quotaBytes) *
                  100
                ).toFixed(1)}
                %
              </span>
              <span>單一影片上傳限制：25 MB</span>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--kb-text-secondary)', fontSize: 14 }}>
            {token ? '正在查詢儲存空間…' : '建立或登入個人紀錄後即可檢視容量配額。'}
          </div>
        )}
      </MotionSection>

      {/* SECTION 3: Privacy & Video Storage Policy */}
      <MotionSection className="kb-card">
        <h2 className="kb-card-title">影像與隱私控制政策</h2>
        <p className="kb-card-subtitle">
          嚴格遵循本機受控原則，絕不私自上傳外部服務
        </p>

        <div
          style={{
            fontSize: 15,
            lineHeight: 1.75,
            color: 'var(--kb-text-secondary)',
            marginTop: 16,
          }}
        >
          <p>
            <strong>本機專屬保存：</strong> {browserStorageEnabled?'只保存原始關鍵點與計算結果，不保存影像。資料僅在目前瀏覽器內，不會上傳或同步。':<>您的量測影像與時序數據保存在本機目錄（<code>.data/media</code>），不透過雲端進行二次分析或公開展示。</>}
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>無人臉與音訊：</strong>{' '}
            攝影機權限完全由瀏覽器標準受控；程式絕無要求收音麥克風權限，亦未包含任何臉部或身分特徵辨識模組。
          </p>
        </div>
      </MotionSection>

      {/* SECTION 4: Cascading Data Erasure (Danger Zone) */}
      <MotionSection
        className="kb-card"
        style={{
          borderColor: 'rgba(155, 58, 54, 0.4)',
          background: 'var(--kb-surface)',
        }}
      >
        <div className="kb-card-header">
          <div>
            <span className="kb-badge kb-badge-danger" style={{ marginBottom: 6 }}>
              危險操作區
            </span>
            <h2 className="kb-card-title" style={{ color: 'var(--kb-danger)' }}>
              刪除我的資料 (連帶銷毀與晚到阻絕)
            </h2>
            <p className="kb-card-subtitle">
              刪除目前身分與關聯紀錄。此操作不可逆。
            </p>
          </div>
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'var(--kb-text-secondary)',
            lineHeight: 1.65,
            marginBottom: 20,
          }}
        >
          <p>
            <strong>連帶清除範圍說明：</strong>
          </p>
          {browserStorageEnabled ? <p>刪除此瀏覽器中目前身分的原始關鍵點與分析結果，並停用該本機身分。影像未儲存，手動匯出的檔案不在刪除範圍內。此操作不代表磁碟的鑑識安全抹除。</p> : (          <ul style={{ paddingLeft: 20, marginTop: 6 }}>
            <li>
              即刻註銷您的 <code>kbpd_sec_</code> 存取權杖，所有進行中連線立即失效。
            </li>
            <li>本機磁碟中屬於您的所有視訊、縮圖與特徵檔案皆被徹底粉碎。</li>
            <li>
              SQLite 資料庫中所有量測 Session、分析結果與 ARCI 解讀記錄級聯刪除。
            </li>
            <li>
              啟用晚到阻絕機制（Late-write
              Blocker），任何背景非同步任務皆無法再寫入已被刪除的身分。
            </li>
            <li>
              系統將發放一次性短期回執（Receipt），可用於免登入查驗刪除事實。
            </li>
            <li>
              <em>
                限制宣告：您過去已手動匯出或下載至本機其他資料夾的檔案，不在本系統控制與清除範圍內。
              </em>
            </li>
          </ul>)}
        </div>

        {deletionError && (
          <div className="kb-alert kb-alert-danger">
            <AlertTriangle size={18} />
            <div>{deletionError}</div>
          </div>
        )}

        {deletionReceipt ? (
          <div className="kb-alert kb-alert-success" style={{ display: 'block' }}>
            <h4
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                color: 'var(--kb-success)',
              }}
            >
              <Check size={18} /> 身分與資料已成功連帶刪除完畢！
            </h4>
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                color: 'var(--kb-text-primary)',
              }}
            >
              <div>
                已清除量測筆數：
                {deletionReceipt.erasedResources?.measurementsCount ?? 0} 筆
              </div>
              <div>
                已釋放磁碟空間：
                {(
                  (deletionReceipt.erasedResources?.diskBytesFreed ?? 0) / 1024
                ).toFixed(1)}{' '}
                KB
              </div>
              <div style={{ marginTop: 10 }}>
                <strong>刪除查驗回執憑證 (Receipt Token)：</strong>
                <div
                  style={{
                    fontFamily: 'var(--kb-font-mono)',
                    fontSize: 13,
                    background: 'rgba(255,255,255,0.7)',
                    padding: '6px 10px',
                    borderRadius: 4,
                    marginTop: 4,
                  }}
                >
                  {deletionReceipt.receiptToken}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--kb-text-muted)',
                    marginTop: 4,
                  }}
                >
                  您可以使用此回執憑證向伺服器查驗刪除狀態，回執不包含任何個人健康資訊。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="kb-btn kb-btn-danger"
            disabled={isDeleting || !token}
            onClick={handleDeleteAllData}
          >
            <Trash2 size={18} />
            <span>
              {isDeleting ? '正在執行連帶清除…' : '確認連帶刪除我的所有資料'}
            </span>
          </button>
        )}

        {/* Receipt Verification Tool */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--kb-divider)',
          }}
        >
          <h4
            style={{
              fontSize: 15,
              fontWeight: 650,
              color: 'var(--kb-text-secondary)',
              marginBottom: 8,
            }}
          >
            免登入查驗刪除回執 (Verify Deletion Receipt)
          </h4>
          <form
            onSubmit={handleLookupReceipt}
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
          >
            <input
              type="text"
              placeholder="輸入 kbpd_receipt_ 憑證"
              className="kb-input"
              style={{
                flex: '1 1 240px',
                fontFamily: 'var(--kb-font-mono)',
                fontSize: 14,
              }}
              value={lookupReceiptToken}
              onChange={(e) => setLookupReceiptToken(e.target.value)}
            />
            <button type="submit" className="kb-btn kb-btn-secondary kb-btn-sm">
              查詢回執
            </button>
          </form>

          {receiptLookupError && (
            <div
              style={{ color: 'var(--kb-danger)', fontSize: 13, marginTop: 8 }}
            >
              {receiptLookupError}
            </div>
          )}

          {receiptLookupResult && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                background: 'var(--kb-surface-subtle)',
                borderRadius: 'var(--kb-radius-md)',
                fontSize: 13,
              }}
            >
              <div>
                狀態：
                <strong style={{ color: 'var(--kb-success)' }}>
                  已確認刪除 (DELETED)
                </strong>
              </div>
              <div>
                完成時間：
                {new Date(receiptLookupResult.completedAt).toLocaleString('zh-TW')}
              </div>
              <div>
                銷毀資源：
                {receiptLookupResult.erasedResources?.measurementsCount ?? 0}{' '}
                筆量測，
                {receiptLookupResult.erasedResources?.mediaFilesCount ?? 0} 筆影音
              </div>
            </div>
          )}
        </div>
      </MotionSection>

      {/* SECTION 5: Developer / Engineering Link */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 32,
          padding: '16px 0',
          borderTop: '1px solid var(--kb-divider)',
        }}
      >
        <a
          href="/test-harness"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 14,
            color: 'var(--kb-text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>開啟底層工程測試台 (Engineering Test Harness)</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
export default SettingsPage
