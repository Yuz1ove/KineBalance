import { analyzeFingerTapping } from '../../kbpd-core/src/measurement/detector.ts'
import type { MeasurementInput } from '../../kbpd-core/src/measurement/contracts.ts'

export const browserStorageEnabled = import.meta.env.VITE_STORAGE_MODE === 'browser'
export const browserDatabaseName = 'kinebalance-browser-measurements-v1'
const quota = 50 * 1024 * 1024
type State = { profiles: Record<string,{userId:string;token:string;status:string}>; records: Record<string,any>; receipts:Record<string,any> }
const empty = ():State => ({profiles:{},records:{},receipts:{}})
const size = (data:unknown) => new TextEncoder().encode(JSON.stringify(data)).length

// A single read/write transaction serializes saves, erasure and quota accounting.
// This is same-origin device storage, never server authentication or cloud sync.
async function transaction<T>(change:(state:State)=>T):Promise<T> {
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(browserDatabaseName,1)
    request.onupgradeneeded=()=>request.result.createObjectStore('state')
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(new Error('無法開啟瀏覽器儲存空間，請確認未停用網站資料。'))
  })
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('state','readwrite'), store=tx.objectStore('state')
    const request=store.get('root');let result:T;let failure:unknown
    request.onsuccess=()=>{
      try{const state:State=request.result??empty();result=change(state);if(size(state)>quota)throw Error('瀏覽器紀錄已達 50MB 上限，請先刪除不需要的紀錄。');store.put(state,'root')}
      catch(error){failure=error;tx.abort()}
    }
    tx.oncomplete=()=>{db.close();resolve(result)}
    tx.onabort=tx.onerror=()=>{db.close();reject(failure??new Error('瀏覽器保存失敗，請檢查可用空間後重試。'))}
  })
}

export async function browserRequest<T>(path:string,options:RequestInit,token:string|null):Promise<T> {
  const method=options.method??'GET'
  const body=typeof options.body==='string'?JSON.parse(options.body):{}
  return transaction(state=>{
    const url=new URL(path,'https://local.invalid'),route=url.pathname
    if(route==='/api/auth/register'&&method==='POST'){
      const profile={userId:`browser-${crypto.randomUUID()}`,token:crypto.randomUUID(),status:'BROWSER_ONLY'}
      state.profiles[profile.token]=profile;return profile as T
    }
    if(route.startsWith('/api/deletions/')){
      const receipt=state.receipts[route.split('/').at(-1)!];if(!receipt)throw Error('此瀏覽器找不到該刪除回執。');return receipt as T
    }
    const profile=state.profiles[route==='/api/auth/restore'?body.token:token??'']
    if(!profile)throw Error('請先在此瀏覽器建立紀錄身分；其他裝置的憑證無法讀取此處資料。')
    if(route==='/api/auth/restore')return profile as T
    const owned=Object.values(state.records).filter(r=>r.ownerUserId===profile.userId)
    if(route==='/api/me/storage')return {userId:profile.userId,totalBytesUsed:size(owned),quotaBytes:quota,mediaFilesCount:0,measurementsCount:owned.filter(r=>r.measurementOutput).length} as T
    if(route==='/api/me/measurements'){
      const page=Math.max(1,Number(url.searchParams.get('page'))||1),limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit'))||50))
      const items=owned.filter(r=>r.measurementOutput).sort((a,b)=>b.session.createdAt.localeCompare(a.session.createdAt))
      return {items:items.slice((page-1)*limit,page*limit),total:items.length,page,limit} as T
    }
    if(route==='/api/measurements'&&method==='POST'){
      if(body.handSide!=='LEFT'&&body.handSide!=='RIGHT')throw Error('請選擇量測側別。')
      const id=crypto.randomUUID(),session={id,ownerUserId:profile.userId,handSide:body.handSide,status:'CREATED',createdAt:new Date().toISOString()}
      state.records[id]={id,ownerUserId:profile.userId,session,storageScope:'THIS_BROWSER_ONLY'};return session as T
    }
    if(route==='/api/me'&&method==='DELETE'){
      for(const record of owned)delete state.records[record.id]
      delete state.profiles[profile.token]
      const receipt={receiptToken:crypto.randomUUID(),userIdHash:'BROWSER_ONLY_ERASURE',status:'DELETED',completedAt:new Date().toISOString(),erasedResources:{measurementsCount:owned.length,mediaFilesCount:0,diskBytesFreed:size(owned)}}
      state.receipts[receipt.receiptToken]=receipt;return receipt as T
    }
    const id=route.match(/^\/api\/(?:me\/)?measurements\/([^/]+)/)?.[1]
    const record=id?state.records[id]:null
    if(!record||record.ownerUserId!==profile.userId)throw Error('此瀏覽器找不到這筆紀錄。')
    if(route.endsWith('/analyze')&&method==='POST'){
      const input=body as MeasurementInput
      if(record.measurementOutput)throw Error('此紀錄已保存，請勿重複寫入。')
      if(input.sessionId!==id||input.handSide!==record.session.handSide||!['CAMERA','REAL_VIDEO'].includes(input.source??''))throw Error('量測來源或身分不一致，未保存。')
      if(!Array.isArray(input.frames)||!input.frames.length||input.frames.length>900||size(input)>10*1024*1024||input.frames.at(-1)!.timestampMs>30000)throw Error('量測資料超出保存限制。')
      const output=analyzeFingerTapping(input)
      if(!output.quality.validFrames)throw Error('沒有有效量測資料，未保存。')
      record.input=input;record.measurementOutput=output;record.session.status='COMPLETED'
      return output as T
    }
    if(route.endsWith('/interpret'))throw Error('此瀏覽器版本只保存量測，尚未連接 ARCI 解讀服務。')
    if(method==='DELETE'){delete state.records[id!];return {success:true,deletedMeasurementId:id} as T}
    if(method==='GET')return record as T
    throw Error('此瀏覽器版本不支援此操作。')
  })
}
