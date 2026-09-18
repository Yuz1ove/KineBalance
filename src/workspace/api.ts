export async function api<T>(path:string,body?:unknown):Promise<T> {
 const response=await fetch(`/api/workspace/${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-KBPD-Workspace':'1'},body:body===undefined?undefined:JSON.stringify(body)})
 if(!response.ok){const value=await response.json().catch(()=>({error:'SERVICE_UNAVAILABLE'}));throw new Error(value.error??`HTTP_${response.status}`)}
 return response.json()
}
export async function initialize(){await api('session',{})}
export function download(name:string,text:string,type='text/markdown;charset=utf-8') {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
