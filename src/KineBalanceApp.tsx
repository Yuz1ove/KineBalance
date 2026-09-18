import React, { useState, useEffect, useCallback } from 'react'
import { Shell, type TabId } from './components/Shell'
import { HomePage } from './components/pages/HomePage'
import { MeasurePage } from './components/pages/MeasurePage'
import { RecordsPage } from './components/pages/RecordsPage'
import { InsightsPage } from './components/pages/InsightsPage'
import { SummaryPage } from './components/pages/SummaryPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { ArciTechnologyPage } from './components/arci/ArciTechnologyPage'
import { kbpdApi, type MeasurementRecord } from './services/kbpdApi'
import { demoService } from './demo/demo-service'
import './styles/kinebalance.css'
import './styles/arci.css'

export const KineBalanceApp: React.FC = () => {
  // Navigation
  const getTabFromHash = (): TabId => {
    const raw = typeof window !== 'undefined' ? window.location.hash : ''
    const clean = decodeURIComponent(raw).replace(/^#\/?/, '')
    if (clean === 'arci-reveal') {
      setTimeout(() => {
        const el = document.getElementById('arci-reveal')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return 'home'
    }
    const validTabs: TabId[] = ['home', 'measure', 'records', 'insights', 'arci', 'summary', 'settings']
    return validTabs.includes(clean as TabId) ? (clean as TabId) : 'home'
  }

  const [currentTab, setCurrentTab] = useState<TabId>(getTabFromHash)
  const [isDemo, setIsDemo] = useState<boolean>(demoService.isDemoMode())
  const [token, setToken] = useState<string | null>(kbpdApi.getToken())
  const [userId, setUserId] = useState<string | null>(kbpdApi.getUserId())
  const [records, setRecords] = useState<MeasurementRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [selectedRecordIdForInsights, setSelectedRecordIdForInsights] = useState<string | null>(null)

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentTab(getTabFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleSelectTab = (tab: TabId) => {
    setCurrentTab(tab)
    window.location.hash = `#${tab}`
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Load records from API or Demo Service
  const refreshRecords = useCallback(async () => {
    const currentToken = kbpdApi.getToken()
    if (!currentToken) {
      setRecords([])
      return
    }

    setIsLoadingRecords(true)
    try {
      const res = await kbpdApi.listMeasurements(1, 100)
      setRecords(res.items || [])
    } catch {
      // Ignored if unauthenticated or server error
    } finally {
      setIsLoadingRecords(false)
    }
  }, [])

  // Subscribe to demoService changes
  useEffect(() => {
    const unsub = demoService.subscribe((active) => {
      setIsDemo(active)
      setToken(kbpdApi.getToken())
      setUserId(kbpdApi.getUserId())
      refreshRecords()
    })
    return unsub
  }, [refreshRecords])

  useEffect(() => {
    refreshRecords()
  }, [token, isDemo, refreshRecords])

  const handleIdentityChanged = () => {
    setToken(kbpdApi.getToken())
    setUserId(kbpdApi.getUserId())
    refreshRecords()
  }

  const handleQuickRegister = async () => {
    try {
      await kbpdApi.register()
      handleIdentityChanged()
    } catch (err: any) {
      alert('無法建立紀錄身分：' + err.message)
    }
  }

  const latestRecord = records.length > 0 ? records[0] : null

  return (
    <Shell
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      hasIdentity={!!token}
      isDemo={isDemo}
    >
      {currentTab === 'home' && (
        <HomePage
          latestRecord={latestRecord}
          hasIdentity={!!token}
          isDemo={isDemo}
          onNavigate={(tab) => handleSelectTab(tab as TabId)}
          onQuickRegister={handleQuickRegister}
          onLoadDemo={() => {
            demoService.enableDemoMode()
          }}
        />
      )}

      {currentTab === 'measure' && (
        <MeasurePage
          hasIdentity={!!token}
          onNavigateToInsights={(measurementId) => {
            setSelectedRecordIdForInsights(measurementId)
            handleSelectTab('insights')
          }}
          onRecordSaved={() => {
            refreshRecords()
          }}
          onPromptRegister={() => {
            handleSelectTab('settings')
          }}
        />
      )}

      {currentTab === 'records' && (
        <RecordsPage
          records={records}
          isLoading={isLoadingRecords}
          isDemo={isDemo}
          onDeleteRecord={async (id) => {
            await kbpdApi.deleteMeasurement(id)
            refreshRecords()
          }}
          onViewInsights={(id) => {
            setSelectedRecordIdForInsights(id)
            handleSelectTab('insights')
          }}
          onNavigateToMeasure={() => handleSelectTab('measure')}
        />
      )}

      {currentTab === 'insights' && (
        <InsightsPage
          records={records}
          selectedRecordId={selectedRecordIdForInsights}
          onSelectRecordId={(id) => setSelectedRecordIdForInsights(id)}
          onNavigateToMeasure={() => handleSelectTab('measure')}
          isDemo={isDemo}
        />
      )}

      {currentTab === 'arci' && (
        <ArciTechnologyPage
          onNavigateToMeasure={() => handleSelectTab('measure')}
          onNavigateToHome={() => handleSelectTab('home')}
        />
      )}

      {currentTab === 'summary' && (
        <SummaryPage records={records} isDemo={isDemo} />
      )}

      {currentTab === 'settings' && (
        <SettingsPage
          token={token}
          userId={userId}
          onIdentityChanged={handleIdentityChanged}
          isDemo={isDemo}
          onEnableDemo={() => {
            demoService.enableDemoMode()
          }}
          onDisableDemo={() => {
            demoService.disableDemoMode()
          }}
        />
      )}
    </Shell>
  )
}
export default KineBalanceApp
