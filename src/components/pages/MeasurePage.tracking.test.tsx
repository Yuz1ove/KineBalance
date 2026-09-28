import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
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
 fireEvent.click(await screen.findByRole('button',{name:'提早結束並計算'}, {timeout:4500}))
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

test('SYNTHETIC_TEST_DATA: rejected save preserves data and retry reuses the same native session',async()=>{
 const frames=fixtures.fixtures.periodic.frames as any
 vi.mocked(handDetector.getCapturedFrames).mockReturnValue(frames)
 vi.mocked(kbpdApi.createSession).mockResolvedValue({id:'retry-session',ownerUserId:'synthetic-user',handSide:'RIGHT'})
 const result=toAnalysisOutput(analyzeFingerTapping({sessionId:'retry-session',protocolVersion:'KBPD-FT-IMAGE-2',handSide:'RIGHT',mirrored:false,frames}))
 vi.mocked(kbpdApi.saveAnalysis).mockRejectedValueOnce(new Error('Controlled save rejection')).mockResolvedValueOnce(result)
 await live();fireEvent.click(screen.getByRole('button',{name:'保存這次紀錄'}))
 await screen.findByText('Controlled save rejection')
 expect(screen.queryByText('本次紀錄已成功保存！')).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'保存這次紀錄'}))
 await screen.findByText('本次紀錄已成功保存！')
 expect(kbpdApi.createSession).toHaveBeenCalledTimes(1)
 expect(kbpdApi.createSession).toHaveBeenCalledWith('RIGHT','CAMERA')
 expect(kbpdApi.saveAnalysis).toHaveBeenNthCalledWith(2,'retry-session','RIGHT',frames,'CAMERA')
})

afterEach(()=>vi.useRealTimers())
async function preview(){
 render(<MeasurePage hasIdentity onNavigateToInsights={()=>{}} onRecordSaved={()=>{}} onPromptRegister={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'下一步：準備事項與影像來源'}))
 fireEvent.click(screen.getByRole('button',{name:'進入量測畫面'}))
 fireEvent.click(screen.getByRole('button',{name:'啟用鏡頭預覽'}))
 await screen.findByRole('button',{name:'開始 20 秒量測'})
}
const report=(data:any)=>act(()=>{vi.mocked(handDetector.startCamera).mock.calls.at(-1)![2]?.(data)})
test('Preview even with a stale nonzero sample presents one actionable hint and no movement numbers',async()=>{
 await preview()
 report({tapCount:9,currentFrequencyHz:2,normalizedDistance:.7,isTracking:false,readyToMeasure:false,validity:'OCCLUDED'})
 expect(screen.getByText('鏡頭預覽・尚未開始記錄')).toBeInTheDocument()
 expect(screen.getByText('偵測到的手部位置超出畫面。請讓整隻手留在鏡頭內。')).toBeInTheDocument()
 expect(screen.queryByText(/暫時計數|即時頻率|本次量測詳細資訊/)).not.toBeInTheDocument()
 expect(screen.queryByText(/OCCLUDED/)).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:'開始 20 秒量測'})).toBeDisabled()
 expect(handDetector.resetRecording).not.toHaveBeenCalled();expect(kbpdApi.createSession).not.toHaveBeenCalled()
})
test('Only countdown completion starts recording; 20 elapsed seconds finish once and late UI callbacks are ignored',async()=>{
 await preview();vi.useFakeTimers()
 vi.mocked(handDetector.getCapturedFrames).mockReturnValue(fixtures.fixtures.periodic.frames as any)
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(2999)})
 expect(handDetector.resetRecording).not.toHaveBeenCalled();expect(screen.queryByText('本次量測詳細資訊')).not.toBeInTheDocument()
 await act(async()=>{await vi.advanceTimersByTimeAsync(1)})
 expect(handDetector.resetRecording).toHaveBeenCalledTimes(1)
 expect(screen.getByLabelText('剩餘秒數')).toHaveTextContent('20')
 expect(screen.getByText('本次量測詳細資訊').closest('details')).not.toHaveAttribute('open')
 await act(async()=>{await vi.advanceTimersByTimeAsync(20000)})
 expect(screen.getByText('本次量測結果與品質確認')).toBeInTheDocument()
 expect(handDetector.getCapturedFrames).toHaveBeenCalledTimes(1)
 const result=screen.getByRole('img',{name:'原始相對幅度曲線',hidden:true}).outerHTML
 report({tapCount:999,currentFrequencyHz:999,normalizedDistance:999,isTracking:true,readyToMeasure:true})
 expect(screen.getByRole('img',{name:'原始相對幅度曲線',hidden:true}).outerHTML).toBe(result)
 expect(kbpdApi.createSession).not.toHaveBeenCalled()
})
test('Cancelling countdown and losing readiness cannot create or save a formal measurement',async()=>{
 await preview();vi.useFakeTimers()
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 fireEvent.click(screen.getByRole('button',{name:'取消倒數'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(4000)})
 expect(handDetector.resetRecording).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 report({tapCount:0,currentFrequencyHz:null,normalizedDistance:null,isTracking:false,readyToMeasure:false,validity:'TRACK_LOST'})
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 expect(handDetector.resetRecording).not.toHaveBeenCalled()
 expect(screen.getByText(/準備期間追蹤不穩定，尚未開始記錄/)).toBeInTheDocument()
 expect(kbpdApi.createSession).not.toHaveBeenCalled()
})
test('Closing a recording cancels it; reopening and starting again resets instead of finalizing old data',async()=>{
 await preview();vi.useFakeTimers()
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 fireEvent.click(screen.getByRole('button',{name:'關閉鏡頭'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(25000)})
 expect(handDetector.getCapturedFrames).not.toHaveBeenCalled();expect(screen.queryByText('本次量測結果與品質確認')).not.toBeInTheDocument()
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'啟用鏡頭預覽'}))})
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 expect(handDetector.resetRecording).toHaveBeenCalledTimes(2)
 expect(screen.getByLabelText('剩餘秒數')).toHaveTextContent('20')
 expect(kbpdApi.createSession).not.toHaveBeenCalled()
})

test('Visible counter subscribes to formal core events exactly once, retains losses and freezes/reset at lifecycle boundaries',async()=>{
 await preview();vi.useFakeTimers()
 expect(screen.queryByLabelText('本次有效開合次數')).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 expect(screen.queryByLabelText('本次有效開合次數')).not.toBeInTheDocument()
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 const count=screen.getByLabelText('本次有效開合次數')
 expect(count).toHaveTextContent('0');expect(count.closest('details')).toBeNull()
 expect(screen.getByLabelText('剩餘秒數').closest('details')).toBeNull()
 const frames=fixtures.fixtures.periodic.frames as any
 let prior=0,changes=0
 for(let i=1;i<=frames.length;i++){
  const result=analyzeFingerTapping({sessionId:'synthetic-prefix',protocolVersion:'KBPD-FT-IMAGE-2',handSide:'RIGHT',mirrored:false,frames:frames.slice(0,i)})
  const sample={tapCount:result.metrics.validTapCount,measurementValidFrames:result.quality.validFrames,currentFrequencyHz:null,normalizedDistance:.2,isTracking:true,readyToMeasure:true}
  report(sample);expect(count.textContent).toBe(String(sample.tapCount))
  report(sample);expect(count.textContent).toBe(String(sample.tapCount))
  if(sample.tapCount!==prior){expect(sample.tapCount-prior).toBe(1);changes++;prior=sample.tapCount}
 }
 expect(changes).toBe(8)
 for(const validity of ['TRACK_LOST','REACQUIRING','OCCLUDED']){
  report({tapCount:8,currentFrequencyHz:null,normalizedDistance:null,isTracking:false,validity})
  expect(count).toHaveTextContent('8');expect(screen.getByText(/暫停辨識，已完成次數保留/)).toBeInTheDocument()
 }
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000)})
 expect(screen.getByLabelText('剩餘秒數')).toHaveTextContent('19')
 vi.mocked(handDetector.getCapturedFrames).mockReturnValue(frames)
 fireEvent.click(screen.getByRole('button',{name:'提早結束並計算'}))
 expect(screen.getByTestId('frozen-live-count')).toHaveTextContent('8 次')
 report({tapCount:99,isTracking:true});expect(screen.getByTestId('frozen-live-count')).toHaveTextContent('8 次')
 expect(screen.queryByText(/這項差異尚未釐清/)).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'重新量測'}))
 fireEvent.click(screen.getByRole('button',{name:'進入量測畫面'}))
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'啟用鏡頭預覽'}))})
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 expect(screen.getByLabelText('本次有效開合次數')).toHaveTextContent('0')
})

test('A final count discrepancy is visible instead of silently overwriting the last live count',async()=>{
 await preview();vi.useFakeTimers()
 fireEvent.click(screen.getByRole('button',{name:'開始 20 秒量測'}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 report({tapCount:7,currentFrequencyHz:null,normalizedDistance:.2,isTracking:true})
 vi.mocked(handDetector.getCapturedFrames).mockReturnValue(fixtures.fixtures.periodic.frames as any)
 fireEvent.click(screen.getByRole('button',{name:'提早結束並計算'}))
 expect(screen.getByRole('alert')).toHaveTextContent('量測時計數 7 次，最終有效次數 8 次')
 expect(screen.getByRole('alert')).toHaveTextContent('没有額外的最終品質篩選'.replace('没','沒'))
})
