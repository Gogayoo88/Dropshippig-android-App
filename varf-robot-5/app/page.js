'use client';
import {useMemo,useState} from 'react';

const fmt=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString('ro-RO',{maximumFractionDigits:d}):'—';
function SourcePill({s}){return <span className={'source '+(!s.ok?'off':s.up?'up':'down')} title={s.ok?`Mișcare ${fmt(s.m15)}% • ${s.freshness||'feed'}`:s.error}>{s.name} {s.ok?(s.up?'▲':'▼'):'×'}</span>}
function Card({x,kind}){const neg=x.daily<0; const strong=x.verdict==='SEMNAL PUTERNIC'; const possible=x.verdict==='INTRARE POSIBILĂ';return <article className="card">
  <div className="cardTop"><div><b className="sym">{x.symbol}</b><span className="kind">{kind==='crypto'?'CRYPTO':'ACȚIUNE'}</span></div><span className={'daily '+(neg?'neg':'pos')}>{fmt(x.daily)}%</span></div>
  <div className="price">{fmt(x.price, x.price<1?6:2)} <small>{x.currency||'USD'}</small></div>
  <div className="metrics"><div><span>Confirmă</span><b>{x.agree}/{x.sourceTarget||x.active}</b></div><div><span>Active</span><b>{x.active}/{x.sourceTarget||x.active}</b></div><div><span>Nu confirmă</span><b>{x.disagree??Math.max(0,x.active-x.agree)}</b></div><div><span>Indisponibile</span><b>{x.unavailable??0}</b></div><div><span>Acord</span><b>{x.agreePct}%</b></div><div><span>RSI</span><b>{fmt(x.rsi,1)}</b></div><div><span>Volum 24h</span><b>{Number.isFinite(Number(x.quoteVolume||x.volume24h))?fmt(Number(x.quoteVolume||x.volume24h)/1000000,2)+'M':'—'}</b></div><div><span>Impuls vol.</span><b>{x.volRatio?fmt(x.volRatio,2)+'×':'—'}</b></div></div>
  <div className="sources">{x.sources?.map(s=><SourcePill s={s} key={s.name}/>)}</div>
  <div className={'verdict '+(strong?'strong':possible?'go':'wait')}>{x.verdict}</div>
</article>}

export default function Home(){
 const [mode,setMode]=useState('crypto'); const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState('');
 async function scan(which=mode){setLoading(true);setErr('');setMode(which);try{const r=await fetch(`/api/scan/${which}`,{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error||'Scanare eșuată');setData(j);}catch(e){setErr(e.message)}finally{setLoading(false)}}
 async function scanAll(){setLoading(true);setErr('');try{const [a,b]=await Promise.all([fetch('/api/scan/crypto',{cache:'no-store'}).then(r=>r.json()),fetch('/api/scan/stocks',{cache:'no-store'}).then(r=>r.json())]);setMode('all');setData({ok:a.ok||b.ok,kind:'all',asOf:new Date().toISOString(),universe:(a.universe||0)+(b.universe||0),deepScanned:(a.deepScanned||0)+(b.deepScanned||0),rows:[...(a.rows||[]).map(x=>({...x,_kind:'crypto'})),...(b.rows||[]).map(x=>({...x,_kind:'stocks'}))].sort((x,y)=>(y.agree-x.agree)||(y.agreePct-x.agreePct)||(x.daily-y.daily)),note:[a.note,b.note].filter(Boolean).join(' • ')});}catch(e){setErr(e.message)}finally{setLoading(false)}}
 const rows=useMemo(()=>data?.rows||[],[data]);
 return <main>
  <header><div><h1>VÂRF <span>ROBOT 5</span></h1><p>Scanner multi-sursă • caută în primul rând active de la −10% până la +2%; pe plus intră doar cu volum puternic</p></div><div className="live"><i></i> DATE REALE • sursele indisponibile NU sunt numărate</div></header>
  <section className="robotZone">
   <button className="eye left" onClick={()=>scan('crypto')} aria-label="Scanează crypto"><span>₿</span><small>CRYPTO</small></button>
   <button className={'nose '+(loading?'scanning':'')} onClick={scanAll} aria-label="Scanare totală"><span>SCAN</span><small>{loading?'SCANEZ…':'TOTAL'}</small></button>
   <button className="eye right" onClick={()=>scan('stocks')} aria-label="Scanează acțiuni"><span>↗</span><small>ACȚIUNI</small></button>
   <div className="mouth">3 confirmări + tehnic = intrare posibilă • 4+ = semnal puternic</div>
  </section>
  <nav><button className={mode==='crypto'?'active':''} onClick={()=>scan('crypto')}>Crypto</button><button className={mode==='stocks'?'active':''} onClick={()=>scan('stocks')}>Acțiuni</button><button className={mode==='all'?'active':''} onClick={scanAll}>Toate</button></nav>
  {err&&<div className="error">{err}</div>}
  {!data&&!loading&&<div className="empty">Pornește o scanare. Nu sunt afișate exemple sau confirmări inventate.</div>}
  {loading&&<div className="empty pulse">Se citesc piețele și se verifică sursele…</div>}
  {data&&!loading&&<><div className="summary"><span>Univers verificat <b>{data.universe}</b></span><span>Candidați −10…+2 <b>{data.deepScanned}</b></span><span>Cu semnal <b>{data.qualified??rows.length}</b></span><span>Actualizat <b>{new Date(data.asOf).toLocaleTimeString('ro-RO',{timeZone:'Europe/Madrid'})}</b> ES</span></div>{data.note&&<div className="note">{data.note}</div>}<section className="grid">{rows.map((x,i)=><Card key={`${x._kind||data.kind}-${x.symbol}-${i}`} x={x} kind={x._kind||data.kind}/>)}</section>{!rows.length&&<div className="empty">Niciun activ nu are acum minimum 3 confirmări + condiții tehnice favorabile în filtrul −10%…+2% (pe plus cerem volum puternic).</div>}</>}
  <footer>Semnalele sunt analiză tehnică, nu garanții. 3–4 surse care coincid reduc incertitudinea, dar nu pot garanta că prețul va urca.</footer>
 </main>
}
