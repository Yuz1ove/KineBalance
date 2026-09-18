import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { KineBalanceApp } from './KineBalanceApp'
import { kbpdApi } from './services/kbpdApi'

// Mock kbpdApi methods
vi.mock('./services/kbpdApi', async () => {
  const actual = await vi.importActual('./services/kbpdApi')
  return {
    ...actual,
    kbpdApi: {
      getToken: vi.fn().mockReturnValue('kbpd_sec_mock_token_1234567890'),
      getUserId: vi.fn().mockReturnValue('user_mock_uuid_123'),
      setSession: vi.fn(),
      clearSession: vi.fn(),
      listMeasurements: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'meas_001',
            ownerUserId: 'user_mock_uuid_123',
            session: {
              id: 'meas_001',
              ownerUserId: 'user_mock_uuid_123',
              handSide: 'RIGHT',
              status: 'COMPLETED',
              createdAt: '2026-09-16T12:00:00Z',
            },
            analysis: {
              sessionId: 'meas_001',
              handSide: 'RIGHT',
              algorithmVersion: 'KBPD-DETECTOR-1',
              metrics: {
                validTapCount: 12,
                averageFrequencyHz: 3.2,
                averageOpeningAmplitudeNorm: 0.95,
                intervalVariabilityCv: 0.11,
                amplitudeDecayRatio: 0.07,
                speedDecayRatio: 0.04,
              },
              dataQuality: {
                status: 'QUALIFIED',
                totalFrames: 600,
                trackedFrames: 590,
                effectiveTrackingRatio: 0.98,
                timeGapsCount: 0,
                trackingLostCount: 0,
              },
              computedAt: '2026-09-16T12:00:20Z',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      }),
      getMeasurement: vi.fn().mockResolvedValue({
        id: 'meas_001',
        session: { id: 'meas_001', handSide: 'RIGHT', createdAt: '2026-09-16T12:00:00Z' },
      }),
      interpret: vi.fn().mockResolvedValue({
        status: 'QUALIFIED_INTERPRETATION',
        summary: '在連續 20 秒測驗中，右手敲擊頻率維持在 3.2 Hz，節奏穩定度良好。',
        observedMeasurements: {
          validTaps: 12,
          frequencyHz: 3.2,
          amplitudeDecayRatio: 0.07,
          speedDecayRatio: 0.04,
          dataQualityStatus: 'QUALIFIED',
        },
        comparisonContext: {
          hasPriorBaseline: false,
          priorCount: 0,
          differenceNotes: '初次量測，尚無歷史基線。',
        },
        evidenceSupportedInterpretation: {
          synthesis: '受試者敲擊速率符合文獻報導之健康對照組範圍。',
          citations: [
            {
              doi: '10.3389/fneur.2021.742654',
              title: 'Webcam-based Hand Tapping in Parkinsonism',
              findingExcerpt: 'Webcam-based 30fps tapping reflects motor rhythmicity.',
              applicabilityLimit: 'Limited to webcam resolution and lighting consistency.',
            },
          ],
        },
        limitationsAndMissingData: ['缺少歷史基準線', '尚未進行左手對比量測'],
        nextSteps: ['建議維持固定作息與環境，隔日再次量測以建立個人基線。'],
        disclaimer: '研究與工程原型，用於動作紀錄與變化觀察，不提供診斷或用藥建議。',
      }),
      getStorageUsage: vi.fn().mockResolvedValue({
        userId: 'user_mock_uuid_123',
        totalBytesUsed: 1048576,
        quotaBytes: 52428800,
        mediaFilesCount: 1,
        measurementsCount: 1,
      }),
      register: vi.fn().mockResolvedValue({
        userId: 'user_new_uuid',
        token: 'kbpd_sec_new_token',
        status: 'ACTIVE',
      }),
      restoreSession: vi.fn().mockResolvedValue({
        userId: 'user_restored_uuid',
        token: 'kbpd_sec_restored_token',
        status: 'ACTIVE',
      }),
      deleteMeasurement: vi.fn().mockResolvedValue({ success: true, deletedMeasurementId: 'meas_001' }),
      deleteAccount: vi.fn().mockResolvedValue({
        receiptToken: 'kbpd_receipt_test_token_999',
        userIdHash: 'hash123',
        status: 'DELETED',
        erasedResources: { measurementsCount: 1, mediaFilesCount: 1, diskBytesFreed: 1048576 },
        completedAt: '2026-09-16T12:05:00Z',
      }),
      getDeletionReceipt: vi.fn().mockResolvedValue({
        receiptToken: 'kbpd_receipt_test_token_999',
        userIdHash: 'hash123',
        status: 'DELETED',
        erasedResources: { measurementsCount: 1, mediaFilesCount: 1, diskBytesFreed: 1048576 },
        completedAt: '2026-09-16T12:05:00Z',
      }),
      getRealVideoFixture: vi.fn().mockResolvedValue([]),
    },
  }
})

describe('KineBalanceApp Formal UI', () => {
  beforeEach(() => {
    window.location.hash = '#/home'
    vi.clearAllMocks()
  })

  it('renders home page with warm branding and latest record', async () => {
    render(<KineBalanceApp />)

    expect(screen.getAllByText('KineBalance').length).toBeGreaterThan(0)
    expect(screen.getByText('讓每一次動作量測，都有清楚的脈絡')).toBeInTheDocument()
    expect(screen.getAllByText('開始量測').length).toBeGreaterThan(0)

    // Wait for mock records to load
    await waitFor(() => {
      expect(screen.getByText('最近一次紀錄')).toBeInTheDocument()
      expect(screen.getByText('右手指尖開合')).toBeInTheDocument()
    })
  })

  it('navigates to measure page when clicking 开始量测', async () => {
    render(<KineBalanceApp />)

    const startButtons = screen.getAllByRole('button', { name: /開始量測/i })
    fireEvent.click(startButtons[0])

    await waitFor(() => {
      expect(screen.getByText('手指快速開合量測')).toBeInTheDocument()
      expect(screen.getByText('單手拇指與食指快速開合敲擊測驗 (Finger Tapping)')).toBeInTheDocument()
    })
  })

  it('navigates to records and displays list and trends', async () => {
    render(<KineBalanceApp />)

    const nav = screen.getByRole('navigation', { name: /主要導覽/i })
    const recordTabBtn = within(nav).getByRole('button', { name: /紀錄與趨勢/i })
    fireEvent.click(recordTabBtn)

    await waitFor(() => {
      expect(screen.getByText('歷史與觀察')).toBeInTheDocument()
      expect(screen.getByText(/量測紀錄/i)).toBeInTheDocument()
      expect(screen.getByText('個人趨勢')).toBeInTheDocument()
      expect(screen.getByText('服藥與生活')).toBeInTheDocument()
    })
  })

  it('navigates to insights and displays ARCI 5-section interpretation', async () => {
    render(<KineBalanceApp />)

    const nav = screen.getByRole('navigation', { name: /主要導覽/i })
    const insightsTabBtn = within(nav).getByRole('button', { name: /ARCI 解讀/i })
    fireEvent.click(insightsTabBtn)

    await waitFor(() => {
      expect(screen.getByText('ARCI 動作解讀')).toBeInTheDocument()
      expect(screen.getByText('本次量測結果摘要')).toBeInTheDocument()
      expect(screen.getByText('使用了哪些量測與紀錄')).toBeInTheDocument()
      expect(screen.getByText('如何得到這個解讀？')).toBeInTheDocument()
      expect(screen.getByText(/研究文獻來源與限制/)).toBeInTheDocument()
      expect(screen.getByText('研究限制與就醫討論指引')).toBeInTheDocument()
    })
  })

  it('navigates to summary page and displays consultation briefing', async () => {
    render(<KineBalanceApp />)

    const nav = screen.getByRole('navigation', { name: /主要導覽/i })
    const summaryTabBtn = within(nav).getByRole('button', { name: /回診摘要/i })
    fireEvent.click(summaryTabBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '回診討論摘要' })).toBeInTheDocument()
      expect(screen.getByText('一、量測概況與側別統計')).toBeInTheDocument()
      expect(screen.getByText('二、建議向醫師說明的客觀現象')).toBeInTheDocument()
      expect(screen.getByText('列印 / 存為 PDF')).toBeInTheDocument()
    })
  })

  it('navigates to settings and manages identity, storage quota, and deletion', async () => {
    render(<KineBalanceApp />)

    const nav = screen.getByRole('navigation', { name: /主要導覽/i })
    const settingsTabBtn = within(nav).getByRole('button', { name: /設定與隱私/i })
    fireEvent.click(settingsTabBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '設定與隱私' })).toBeInTheDocument()
      expect(screen.getByText('個人紀錄身分與憑證')).toBeInTheDocument()
      expect(screen.getByText('管理資料容量與配額')).toBeInTheDocument()
      expect(screen.getByText(/刪除我的資料/i)).toBeInTheDocument()
    })
  })
})
