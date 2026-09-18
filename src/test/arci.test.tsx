import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { ArciWordmark } from '../components/arci/ArciWordmark'
import { ArciPipelineDetail } from '../components/arci/ArciPipelineDetail'
import { ArciCoreVisual } from '../components/arci/ArciCoreVisual'
import { ArciComparisonSlider } from '../components/arci/ArciComparisonSlider'
import { ArciKineBalanceBridge } from '../components/arci/ArciKineBalanceBridge'
import { ArciDecisionTraceDemo } from '../components/arci/ArciDecisionTraceDemo'
import { ArciLimitsSection } from '../components/arci/ArciLimitsSection'
import { ArciEvidenceSection } from '../components/arci/ArciEvidenceSection'
import { ArciArchitectureStack } from '../components/arci/ArciArchitectureStack'
import { ArciRevealSection } from '../components/arci/ArciRevealSection'
import { ArciTechnologyPage } from '../components/arci/ArciTechnologyPage'
import { KineBalanceApp } from '../KineBalanceApp'

// Mock kbpdApi
vi.mock('../services/kbpdApi', async () => {
  const actual = await vi.importActual('../services/kbpdApi')
  return {
    ...actual,
    kbpdApi: {
      getToken: vi.fn().mockReturnValue('kbpd_sec_mock_token_1234567890'),
      getUserId: vi.fn().mockReturnValue('user_mock_uuid_123'),
      setSession: vi.fn(),
      clearSession: vi.fn(),
      listMeasurements: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 }),
      getMeasurement: vi.fn().mockResolvedValue({ id: 'm1' }),
      interpret: vi.fn().mockResolvedValue({
        status: 'QUALIFIED_INTERPRETATION',
        summary: 'Mock interpretation',
        observedMeasurements: {},
        comparisonContext: {},
        evidenceSupportedInterpretation: { citations: [] },
        limitationsAndMissingData: [],
        nextSteps: [],
      }),
      getStorageUsage: vi.fn().mockResolvedValue({
        userId: 'user_mock_uuid_123',
        totalBytesUsed: 0,
        quotaBytes: 52428800,
        mediaFilesCount: 0,
        measurementsCount: 0,
      }),
      register: vi.fn().mockResolvedValue({ userId: 'u1', token: 't1' }),
      restoreSession: vi.fn().mockResolvedValue({ userId: 'u1', token: 't1' }),
      deleteMeasurement: vi.fn().mockResolvedValue({ success: true }),
      deleteAccount: vi.fn().mockResolvedValue({ receiptToken: 'r1', status: 'DELETED' }),
      getDeletionReceipt: vi.fn().mockResolvedValue({ receiptToken: 'r1', status: 'DELETED' }),
      getRealVideoFixture: vi.fn().mockResolvedValue([]),
    },
  }
})

describe('ARCI Technology Components & Showcase', () => {
  it('renders ArciWordmark with typography and subtitle', () => {
    render(<ArciWordmark />)
    expect(screen.getByText('ARCI')).toBeInTheDocument()
    expect(screen.getByText('Autonomous Resilient Cognitive Infrastructure')).toBeInTheDocument()
    expect(screen.getByText(/證據先於推論/)).toBeInTheDocument()
  })

  it('renders ArciPipelineDetail and allows switching nodes', () => {
    const handleSelect = vi.fn()
    render(<ArciPipelineDetail selectedNodeId="evidence" onSelectNode={handleSelect} />)

    expect(screen.getByText(/03 \/ EVIDENCE/)).toBeInTheDocument()
    expect(screen.getByText('證據層')).toBeInTheDocument()
    expect(screen.getByText(/ARCI 不直接把原始輸入交給模型/)).toBeInTheDocument()

    // Switch to constraint node
    const constraintBtn = screen.getByRole('button', { name: /04 CONSTRAINT/i })
    fireEvent.click(constraintBtn)
    expect(handleSelect).toHaveBeenCalledWith('constraint')
  })

  it('renders ArciCoreVisual with 6 peripheral nodes and central core', () => {
    const handleSelect = vi.fn()
    render(<ArciCoreVisual selectedNodeId="input" onSelectNode={handleSelect} />)

    expect(screen.getByText('ARCI CORE')).toBeInTheDocument()
    expect(screen.getByText('DECISION ENGINE')).toBeInTheDocument()

    const evidenceNode = screen.getByRole('button', { name: /03 EVIDENCE/i })
    fireEvent.click(evidenceNode)
    expect(handleSelect).toHaveBeenCalledWith('evidence')
  })

  it('renders ArciComparisonSlider and toggles between Without and With ARCI', () => {
    render(<ArciComparisonSlider />)

    expect(screen.getByText(/架構對比：直接生成 vs. 受控推論管線/)).toBeInTheDocument()
    expect(screen.getByText('WITHOUT ARCI')).toBeInTheDocument()
    expect(screen.getByText('WITH ARCI')).toBeInTheDocument()
    expect(screen.getByText(/Direct generation \(直接生成\)/)).toBeInTheDocument()
    expect(screen.getByText(/Controlled reasoning pipeline \(受控推論管線\)/)).toBeInTheDocument()

    const slider = screen.getByLabelText(/切換 Without ARCI 與 With ARCI 架構對比/)
    fireEvent.change(slider, { target: { value: '20' } })
    expect(slider).toHaveValue('20')
  })

  it('renders ArciKineBalanceBridge with tapping test demonstration', () => {
    render(<ArciKineBalanceBridge />)

    expect(screen.getByText('HOW ARCI WORKS INSIDE KINEBALANCE')).toBeInTheDocument()
    expect(screen.getByText(/指尖開合測驗/)).toBeInTheDocument()
    expect(screen.getByText(/有效開合次數/)).toBeInTheDocument()
    expect(screen.getByText(/42 次 \/ 20 秒/)).toBeInTheDocument()
    expect(screen.getByText(/常態運動學浮動/)).toBeInTheDocument()
  })

  it('executes ArciDecisionTraceDemo step inspection and displays 5 output panels', async () => {
    render(<ArciDecisionTraceDemo />)

    expect(screen.getByText('SEE HOW A DECISION IS MADE')).toBeInTheDocument()
    expect(screen.getByText('Inspect with ARCI')).toBeInTheDocument()

    const inspectBtn = screen.getByRole('button', { name: /Inspect with ARCI/i })
    fireEvent.click(inspectBtn)

    // Wait for the 7 steps to run through
    await waitFor(
      () => {
        expect(screen.getByText(/ARCI 審計驗收完成/)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // 5-Section Breakdown
    expect(screen.getByText(/01 · Result/)).toBeInTheDocument()
    expect(screen.getByText(/02 · Evidence/)).toBeInTheDocument()
    expect(screen.getByText(/03 · Constraints/)).toBeInTheDocument()
    expect(screen.getByText(/04 · Confidence \/ Uncertainty/)).toBeInTheDocument()
    expect(screen.getByText(/05 · Trace/)).toBeInTheDocument()
  })

  it('renders ArciLimitsSection with 3 cards and 4 formal states', () => {
    render(<ArciLimitsSection />)

    expect(screen.getByText('BUILT TO KNOW ITS LIMITS')).toBeInTheDocument()
    expect(screen.getByText('Not a diagnosis engine')).toBeInTheDocument()
    expect(screen.getByText("Doesn't invent missing evidence")).toBeInTheDocument()
    expect(screen.getByText('Can refuse unsupported conclusions')).toBeInTheDocument()

    expect(screen.getByText(/SUPPORTED · 證據充分/)).toBeInTheDocument()
    expect(screen.getByText(/PARTIAL · 部分支持/)).toBeInTheDocument()
    expect(screen.getByText(/UNKNOWN · 資料不足/)).toBeInTheDocument()
    expect(screen.getByText(/REJECTED · 超出系統邊界/)).toBeInTheDocument()
  })

  it('renders ArciEvidenceSection with inflow sources and official citations', () => {
    render(<ArciEvidenceSection />)

    expect(screen.getByText('EVIDENCE DOESN\'T DISAPPEAR AFTER GENERATION')).toBeInTheDocument()
    expect(screen.getByText('同儕審查文獻')).toBeInTheDocument()
    expect(screen.getByText('即時運動學')).toBeInTheDocument()
    expect(screen.getByText('個人連續歷程')).toBeInTheDocument()

    // Official citations
    expect(screen.getByText(/Frontiers in Neurology, 2021/)).toBeInTheDocument()
    expect(screen.getByText(/npj Digital Medicine, 2020/)).toBeInTheDocument()
  })

  it('renders ArciArchitectureStack and updates layer details on interaction', () => {
    render(<ArciArchitectureStack />)

    expect(screen.getByText(/六層系統架構/)).toBeInTheDocument()
    expect(screen.getByText('Sensing')).toBeInTheDocument()
    expect(screen.getByText('Normalization')).toBeInTheDocument()
    expect(screen.getByText('Evidence')).toBeInTheDocument()
    expect(screen.getByText('ARCI Decision Core')).toBeInTheDocument()
    expect(screen.getByText('Interpretation')).toBeInTheDocument()
    expect(screen.getByText('Interface')).toBeInTheDocument()

    // Click Sensing layer
    const sensingCard = screen.getByRole('button', { name: /Layer 01: Sensing/i })
    fireEvent.click(sensingCard)
    expect(screen.getAllByText(/感測層 · 動作訊號捕捉/).length).toBeGreaterThan(0)
    expect(screen.getByText(/MediaPipe Hands \/ Monotonic Timestamp Clock/)).toBeInTheDocument()
  })

  it('renders ArciRevealSection and triggers onExploreArci callback', () => {
    const handleExplore = vi.fn()
    render(<ArciRevealSection onExploreArci={handleExplore} />)

    expect(screen.getByText(/Behind KineBalance · Powered by ARCI/)).toBeInTheDocument()
    expect(screen.getByText(/量測只是第一步/)).toBeInTheDocument()
    expect(screen.getAllByText(/先確認有什麼資料，再決定能說什麼/).length).toBeGreaterThan(0)

    const ctaBtn = screen.getByRole('button', { name: /探索完整 ARCI 架構/i })
    fireEvent.click(ctaBtn)
    expect(handleExplore).toHaveBeenCalledTimes(1)
  })

  it('renders ArciTechnologyPage completely and provides back navigation', () => {
    const handleHome = vi.fn()
    const handleMeasure = vi.fn()
    render(
      <ArciTechnologyPage onNavigateToHome={handleHome} onNavigateToMeasure={handleMeasure} />
    )

    expect(screen.getByText('ARCI：受限制決策與證據處理核心')).toBeInTheDocument()
    expect(screen.getByText(/SEE HOW A DECISION IS MADE/)).toBeInTheDocument()
    expect(screen.getByText(/BUILT TO KNOW ITS LIMITS/)).toBeInTheDocument()

    const backBtn = screen.getByRole('button', { name: /返回首頁/i })
    fireEvent.click(backBtn)
    expect(handleHome).toHaveBeenCalledTimes(1)
  })

  it('navigates to ARCI tab in KineBalanceApp from navigation', async () => {
    window.location.hash = '#home'
    render(<KineBalanceApp />)

    const nav = screen.getByRole('navigation', { name: /主要導覽/i })
    const arciNavBtn = within(nav).getByRole('button', { name: /ARCI 核心/i })
    fireEvent.click(arciNavBtn)

    await waitFor(() => {
      expect(screen.getByText('ARCI：受限制決策與證據處理核心')).toBeInTheDocument()
      expect(screen.getByText(/SEE HOW A DECISION IS MADE/)).toBeInTheDocument()
    })
  })
})
