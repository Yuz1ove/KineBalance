import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MeasurePage } from './MeasurePage'
import { kbpdApi } from '../../services/kbpdApi'
import { handDetector } from '../../services/handDetector'
import fixtures from '../../../evidence/baseline/fixtures.json'
import { analyzeFingerTapping } from '../../../kbpd-core/src/measurement/detector.ts'
import { toAnalysisOutput } from '../../services/kbpdApi'
vi.mock('../../services/handDetector',()=>({handDetector:{startCamera:vi.fn(),stopCamera:vi.fn(),resetRecording:vi.fn(),getCapturedFrames:vi.fn()}}))
vi.mock('../../services/kbpdApi',async()=>({...await vi.importActual('../../services/kbpdApi'),kbpdApi:{getRealVideoFixture:vi.fn(),createSession:vi.fn(),saveAnalysis:vi.fn()}}))
beforeEach(()=>{
 vi.clearAllMocks()
 vi.mocked(handDetector.startCamera).mockImplementation(async(_v,_c,cb)=>{cb?.({tapCount:0,normalizedDistance:0,currentFrequencyHz:0,isTracking:true,readyToMeasure:true});return true})
 vi.mocked(handDetector.getCapturedFrames).mockReturnValue([])
})
async function live(){
 render(<MeasurePage hasIdentity onNavigateToInsights={()=>{}} onRecordSaved={()=>{}} onPromptRegister={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'下一步：準備事項與影像來源'}))
 fireEvent.click(screen.getByRole('button',{name:'進入量測畫面'}))
 fireEvent.click(screen.getByRole('button',{name:'啟用鏡頭預覽'}))
 fireEvent.click(await screen.findByRole('button',{name:'開始 20 秒量測'}))
 fireEvent.click(screen.getByRole('button',{name:'提早結束並計算'}))
 await screen.findByText('本次量測結果與品質確認')
}
test('Empty live capture cannot fall back to synthetic fixture or save a fabricated frame',async()=>{
 await live()
 expect(kbpdApi.getRealVideoFixture).not.toHaveBeenCalled()
 expect(screen.getByRole('button',{name:'保存這次紀錄'})).toBeDisabled()
 expect(kbpdApi.saveAnalysis).not.toHaveBeenCalled()
 expect(screen.getByText(/有效追蹤比例：0.0%/)).toBeInTheDocument()
})
test('SYNTHETIC_TEST_DATA: live UI preview and saved result use the same core metrics and exact frames',async()=>{
 const frames=fixtures.fixtures.periodic.frames as any
 vi.mocked(handDetector.getCapturedFrames).mockReturnValue(frames)
 vi.mocked(kbpdApi.createSession).mockResolvedValue({id:'test-session',ownerUserId:'synthetic-user',handSide:'RIGHT'})
 const result=toAnalysisOutput(analyzeFingerTapping({sessionId:'test-session',protocolVersion:'KBPD-FT-IMAGE-2',handSide:'RIGHT',mirrored:false,frames}))
 vi.mocked(kbpdApi.saveAnalysis).mockResolvedValue(result)
 await live();fireEvent.click(screen.getByRole('button',{name:'保存這次紀錄'}))
 await screen.findByText('本次紀錄已成功保存！')
 expect(kbpdApi.saveAnalysis).toHaveBeenCalledWith('test-session','RIGHT',frames,'CAMERA')
 expect(screen.getByText(/有效追蹤比例：100.0%/)).toBeInTheDocument()
 expect(screen.getByRole('img',{name:'原始相對幅度曲線',hidden:true})).toBeInTheDocument()
})
