import type { ReactNode } from 'react'
export function Panel({title,kicker,children,className=''}:{title:string;kicker?:string;children:ReactNode;className?:string}) {return <section className={`w-panel ${className}`}><header>{kicker&&<span className="w-eyebrow">{kicker}</span>}<h2>{title}</h2></header>{children}</section>}
export function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="w-empty"><span aria-hidden="true">—</span><h3>{title}</h3><p>{children}</p></div>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'good'|'warn'|'bad'}){return <span className={`w-badge ${tone}`}>{children}</span>}
export function Details({title,children}:{title:string;children:ReactNode}) {return <details className="w-details"><summary>{title}</summary><div>{children}</div></details>}
export function date(value:string){return new Date(value).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}
export function num(n:number|null|undefined){return n===null||n===undefined?'—':Number(n.toFixed(2)).toLocaleString('zh-TW')}
