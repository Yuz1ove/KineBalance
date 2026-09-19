import {afterEach,expect,test,vi} from 'vitest'
import {kbpdApi} from './kbpdApi'
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
test('Hosted preview never sends identity or persistence payloads; synthetic fixture is explicit',async()=>{
 vi.stubEnv('VITE_HOSTED_PREVIEW','true')
 const fetchMock=vi.fn(async()=>({ok:true,json:async()=>({meta:{dataClassification:'SYNTHETIC_TEST_DATA'},frames:[]})}))
 vi.stubGlobal('fetch',fetchMock)
 await expect(kbpdApi.createSession('RIGHT')).rejects.toThrow('未提供身分與持久化 API')
 await expect(kbpdApi.saveAnalysis('test-session','RIGHT',[],'CAMERA')).rejects.toThrow('未提供身分與持久化 API')
 expect(fetchMock).not.toHaveBeenCalled()
 const fixture=await kbpdApi.getRealVideoFixture(false)
 expect(fetchMock).toHaveBeenCalledWith('/fixtures/finger-tapping-synthetic.json')
 expect(fixture).toMatchObject({meta:{dataClassification:'SYNTHETIC_TEST_DATA'}})
})
