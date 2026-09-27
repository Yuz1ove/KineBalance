import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { HandDetectorService } from './handDetector'

let resultsCallback:(r:any)=>void, callbacks:Map<number,Function>,raf:Map<number,Function>,next:number,service:HandDetectorService,video:HTMLVideoElement,canvas:HTMLCanvasElement
let raw:any,send:any,stop:any,context:any,close:any
const points=(distance=.1)=>Array.from({length:21},(_,i)=>i===0?{x:.4,y:.7,z:0}:i===9?{x:.4,y:.5,z:0}:i===4?{x:.3,y:.4,z:0}:i===8?{x:.3+distance*.15,y:.4,z:0}:{x:.4,y:.6,z:0})
const hand=(distance=.1)=>({multiHandLandmarks:[points(distance)],multiHandedness:[{label:'Left',score:.99}]})
beforeEach(()=>{
 callbacks=new Map();raf=new Map();next=0;raw=hand();stop=vi.fn();close=vi.fn()
 context=Object.fromEntries(['clearRect','drawImage','beginPath','moveTo','lineTo','stroke','setLineDash','arc','fill','save','restore','translate','scale'].map(k=>[k,vi.fn()]))
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context)
 vi.stubGlobal('requestAnimationFrame',(cb:Function)=>{raf.set(++next,cb);return next})
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>raf.delete(id))
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(async()=>({getTracks:()=>[{stop}],getVideoTracks:()=>[{getSettings:()=>({frameRate:30})}]}))}})
 send=vi.fn(async()=>resultsCallback(raw))
 ;(window as any).Hands=class {setOptions(){} onResults(cb:any){resultsCallback=cb}send=send;close=close}
 service=new HandDetectorService();video=document.createElement('video');canvas=document.createElement('canvas')
 Object.defineProperties(video,{readyState:{value:2},videoWidth:{value:640},videoHeight:{value:480}})
 video.pause=vi.fn();video.load=vi.fn();video.play=vi.fn(async()=>{});video.requestVideoFrameCallback=((cb:Function)=>{callbacks.set(++next,cb);return next}) as any
 video.cancelVideoFrameCallback=(id:number)=>{callbacks.delete(id)}
})
afterEach(()=>{vi.useRealTimers();service.stopCamera();vi.restoreAllMocks();vi.unstubAllGlobals();delete (window as any).Hands})
async function frame(ms:number,presented:number){const [id,cb]=callbacks.entries().next().value!;callbacks.delete(id);cb(999,{mediaTime:ms/1000,presentedFrames:presented});await Promise.resolve();await Promise.resolve()}
test('SYNTHETIC_TEST_DATA: rVFC source times, explicit loss, same core count, no invented confidence',async()=>{
 const stages:string[]=[];await service.startCamera(video,canvas,undefined,'RIGHT',undefined,s=>stages.push(s));service.resetRecording()
 expect(stages).toEqual(['PERMISSION_WAITING','STREAM_ACQUIRED','VIDEO_PLAYABLE','MODEL_LOADING','MODEL_READY'])
 for(let i=0;i<17;i++){raw=i===4?{}:hand(i%8>=2&&i%8<6?.8:.1);await frame(1234+i*50,i+1)}
 expect(stages).toContain('FIRST_INFERENCE');expect(stages).toContain('NO_HAND');expect(stages.at(-1)).toBe('TRACKING')
 const f=service.getCapturedFrames();expect(f).toHaveLength(17);expect(f[0].timestampMs).toBe(0);expect(f[0].sourceTimestampMs).toBe(1234)
 expect(f[4].tracked).toBe(false);expect(f[4].landmarks).toEqual([]);expect(f[0].confidence).toBeUndefined()
 expect(service.getKinematics().tapCount).toBe(1);expect(service.getAnalysis()?.trace?.frames[5].validity).toBe('REACQUIRING')
 expect(context.scale).not.toHaveBeenCalled();expect(context.translate).not.toHaveBeenCalled()
 expect(service.getPerformance().cameraFps).toBeCloseTo(20,10)
 service.stopCamera();expect(service.getKinematics().isTracking).toBe(false);expect(service.getKinematics().readyToMeasure).toBe(false)
})
test('Duplicate camera time never sends inference twice; skipped presented frames stay distinct',async()=>{
 await service.startCamera(video,canvas);service.resetRecording();await frame(10,1);await frame(10,1);await frame(110,4)
 expect(send).toHaveBeenCalledTimes(2);expect(service.getCapturedFrames()).toHaveLength(2)
 expect(service.getPerformance().duplicateFramesSkipped).toBe(1);expect(service.getPerformance().skippedPresentedFrames).toBe(2)
})
test('No rVFC fallback deduplicates currentTime; rAF is not camera FPS',async()=>{
 video.requestVideoFrameCallback=undefined as any
 await service.startCamera(video,canvas);service.resetRecording()
 const tick=async()=>{const pending=[...raf.entries()];raf.clear();for(const [,cb] of pending)cb(9999);await Promise.resolve();await Promise.resolve()}
 video.currentTime=.1;await tick();await tick();video.currentTime=.2;await tick()
 expect(send).toHaveBeenCalledTimes(2);expect(service.getPerformance().cameraFps).toBeNull();expect(service.getCapturedFrames()[1].timestampMs).toBe(100)
})
test('Recording reset discards in-flight preview; stop cancels callbacks and ends tracks',async()=>{
 let resolveSend:()=>void=()=>{};send.mockImplementation(()=>new Promise<void>(resolve=>{resolveSend=resolve}))
 await service.startCamera(video,canvas);await frame(10,1);service.resetRecording();resultsCallback(hand());resolveSend();await Promise.resolve()
 expect(service.getCapturedFrames()).toHaveLength(0)
 service.stopCamera();resultsCallback(hand());await Promise.resolve();expect(service.getCapturedFrames()).toHaveLength(0)
 expect(stop).toHaveBeenCalledTimes(1);expect(callbacks.size).toBe(0);expect(raf.size).toBe(0)
})
test('Wrong hand or no hand blocks readiness and tracking status',async()=>{
 await service.startCamera(video,canvas,undefined,'LEFT')
 for(let i=0;i<6;i++)await frame(i*50,i+1)
 expect(service.getKinematics().readyToMeasure).toBe(false);expect(service.getKinematics().validity).toBe('WRONG_HAND')
 raw={};await frame(300,7);expect(service.getKinematics().isTracking).toBe(false)
})
test('An unanswered camera request times out; late stream is stopped without adopting it',async()=>{
 vi.useFakeTimers()
 let release:(s:any)=>void=()=>{}
 ;(navigator.mediaDevices.getUserMedia as any).mockImplementation(()=>new Promise(resolve=>{release=resolve}))
 const opening=service.startCamera(video,canvas)
 const rejected=expect(opening).rejects.toThrow('CAMERA_REQUEST_TIMEOUT')
 await vi.advanceTimersByTimeAsync(15001);await rejected
 release({getTracks:()=>[{stop}]});await Promise.resolve();expect(stop).toHaveBeenCalledTimes(1)
 expect(video.srcObject).toBeFalsy();vi.useRealTimers()
})

for(const [name,code] of [['NotSupportedError','CAMERA_UNSUPPORTED'],['NotAllowedError','PERMISSION_DENIED'],['NotFoundError','DEVICE_NOT_FOUND'],['NotReadableError','DEVICE_NOT_READABLE'],['OverconstrainedError','CONSTRAINT_UNSUPPORTED']])test(`Camera error ${name} is ${code}`,async()=>{
 const stages:string[]=[]
 ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new DOMException('controlled',name))
 await expect(service.startCamera(video,canvas,undefined,'RIGHT',undefined,s=>stages.push(s))).rejects.toThrow(code)
 expect(stages).toEqual(['PERMISSION_WAITING',code]);expect(send).not.toHaveBeenCalled()
})
test('Cancel pending permission then reopen: late old stream and old callbacks cannot attach',async()=>{
 let release:(s:any)=>void=()=>{};const oldStop=vi.fn()
 ;(navigator.mediaDevices.getUserMedia as any).mockImplementationOnce(()=>new Promise(r=>{release=r}))
 const old=service.startCamera(video,canvas);service.stopCamera();expect(await old).toBe(false)
 await service.startCamera(video,canvas);await frame(10,1)
 release({getTracks:()=>[{stop:oldStop}]});await Promise.resolve()
 expect(oldStop).toHaveBeenCalledTimes(1);expect(stop).not.toHaveBeenCalled();expect(service.getCapturedFrames()).toHaveLength(1)
 service.stopCamera();await service.startCamera(video,canvas);expect(callbacks.size).toBe(1)
})
test('Model load failure is distinct and releases acquired stream',async()=>{
 ;(window as any).Hands=class {setOptions(){} initialize(){return Promise.reject(new Error('model asset failure'))}close=close}
 await expect(service.startCamera(video,canvas)).rejects.toThrow('MODEL_LOAD_FAILED')
 expect(stop).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledTimes(1)
})
test('No new frames and inference failure have separate bounded states',async()=>{
 vi.useFakeTimers();const errors=vi.fn()
 await service.startCamera(video,canvas,undefined,'RIGHT',errors)
 await vi.advanceTimersByTimeAsync(10001);expect(errors).toHaveBeenCalledWith('VIDEO_NO_NEW_FRAMES');expect(callbacks.size).toBe(0)
 await service.startCamera(video,canvas,undefined,'RIGHT',errors);send.mockRejectedValueOnce(new Error('controlled'))
 await frame(10,1);expect(errors).toHaveBeenLastCalledWith('INFERENCE_FAILED: controlled')
})
test('Paused video processes every sample despite slow inference and finishes by media duration',async()=>{
 vi.useFakeTimers()
 Object.defineProperty(video,'duration',{value:1})
 let time=0
 Object.defineProperty(video,'currentTime',{get:()=>time,set:t=>{time=t;queueMicrotask(()=>video.dispatchEvent(new Event('seeked')))}})
 const ended=vi.fn()
 send.mockImplementation(async()=>{await new Promise(r=>setTimeout(r,80));resultsCallback(hand())})
 await service.startCamera(video,canvas,undefined,'RIGHT',undefined,undefined,{url:'blob:mock-video',onEnded:ended})
 await vi.advanceTimersByTimeAsync(4000)
 expect(send).toHaveBeenCalledTimes(30)
 expect(service.getCapturedFrames().map(f=>f.sourceTimestampMs)).toEqual(Array.from({length:30},(_,i)=>i/30*1000))
 expect(ended).toHaveBeenCalledTimes(1)
 expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
 service.stopCamera();await vi.advanceTimersByTimeAsync(2000);expect(ended).toHaveBeenCalledTimes(1)
})
test('Failed script is removed so another attempt can load successfully',async()=>{
 delete (window as any).Hands
 const first=service.initialize().catch(e=>e.message)
 const script=document.querySelector('script[src$="hands.js"]') as HTMLScriptElement
 script.dispatchEvent(new Event('error'));expect(await first).toBe('MODEL_LOAD_FAILED');expect(script.isConnected).toBe(false)
 const second=service.initialize()
 ;(window as any).Hands=class {setOptions(){} close=close}
 document.querySelector('script[src$="hands.js"]')!.dispatchEvent(new Event('load'))
 await expect(second).resolves.toBeTruthy()
})
test('Cancel model initialization then restart does not replace the new model or accept old results',async()=>{
 let ready:()=>void=()=>{};const initializing=vi.fn(()=>new Promise<void>(r=>{ready=r}))
 ;(window as any).Hands=class {setOptions(){}initialize=initializing;onResults(cb:any){resultsCallback=cb}send=send;close=close}
 const stages:string[]=[];const opening=service.startCamera(video,canvas,undefined,'RIGHT',undefined,s=>stages.push(s))
 for(let i=0;i<8;i++)await Promise.resolve()
 expect(stages).toContain('MODEL_LOADING');service.stopCamera();expect(await opening).toBe(false)
 initializing.mockImplementation(async()=>{});await service.startCamera(video,canvas)
 ready();await Promise.resolve();await frame(50,1);expect(service.getCapturedFrames()).toHaveLength(1)
 const stale=resultsCallback;service.stopCamera();await service.startCamera(video,canvas)
 stale(hand());expect(service.getCapturedFrames()).toHaveLength(0)
})
