'use client';
import {useEffect,useMemo,useState} from 'react';

const fmt=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString('ro-RO',{maximumFractionDigits:d}):'—';
function SourcePill({s}){return <span className={'source '+(!s.ok?'off':s.up?'up':'down')} title={s.ok?'Mișcare '+fmt(s.m15)+'% • '+(s.freshness||'feed'):s.error}>{s.name} {s.ok?(s.up?'▲':'▼'):'×'}</span>}
function Card({x}){const neg=x.daily<0; const strong=x.verdict==='SEMNAL PUTERNIC'; const possible=x.verdict==='INTRARE POSIBILĂ';return <article className="card">
  <div className="cardTop"><div><b className="sym">{x.symbol}</b>{x.region&&<span className="kind">{x.region}</span>}</div><span className={'daily '+(neg?'neg':'pos')}>{fmt(x.daily)}%</span></div>
  {x.exchange&&<div className="note" style={{margin:'6px 0 8px',padding:'6px 8px'}}>{x.exchange}</div>}
  <div className="price">{fmt(x.price, x.price<1?6:2)} <small>{x.currency||'USD'}</small></div>
  <div className="metrics"><div><span>Confirmă</span><b>{x.agree}/6</b></div><div><span>Surse active</span><b>{x.active}/6</b></div><div><span>Nu confirmă</span><b>{x.disagree??Math.max(0,x.active-x.agree)}</b></div><div><span>Indisponibile</span><b>{x.unavailable??0}</b></div><div><span>Acord</span><b>{x.agreePct}%</b></div><div><span>RSI</span><b>{fmt(x.rsi,1)}</b></div><div><span>Volum</span><b>{Number.isFinite(Number(x.quoteVolume||x.volume24h))?fmt(Number(x.quoteVolume||x.volume24h)/1000000,2)+'M':'—'}</b></div><div><span>Impuls vol.</span><b>{x.volRatio?fmt(x.volRatio,2)+'×':'—'}</b></div></div>
  <div className="sources">{x.sources?.map(s=><SourcePill s={s} key={s.name}/>)}</div>
  <div className={'verdict '+(strong?'strong':possible?'go':'wait')}>{x.verdict}</div>
  <div className="note" style={{marginTop:8}}><b>Orizont estimat:</b> {x.horizon||'Orizont neconfirmat'}</div>
</article>}

export default function Home(){
 const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState('');
 async function scan(){
  setLoading(true);setErr('');
  try{const r=await fetch('/api/scan/stocks',{cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Scanarea acțiunilor a eșuat');setData(j);}
  catch(e){setErr(e.message||'Datele acțiunilor nu sunt disponibile');}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  let stopped=false;
  const refresh=async()=>{
   try{const r=await fetch('/api/scan/stocks',{cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Scanarea acțiunilor a eșuat');if(!stopped){setData(j);setErr('');}}
   catch(e){if(!stopped)setErr(e.message||'Datele acțiunilor nu sunt disponibile');}
   finally{if(!stopped)setLoading(false);}
  };
  refresh();
  const timer=setInterval(refresh,60000);
  return ()=>{stopped=true;clearInterval(timer);};
 },[]);
 const rows=useMemo(()=>data?.rows||[],[data]);
 return <main>
  <header><div><h1>VÂRF <span>ROBOT 6</span></h1><p>Scanner exclusiv pentru acțiuni • caută mișcări timpurii între −10% și +1% • minimum 6 confirmări pozitive din 6 surse</p></div><div className="live"><i></i> DATE DE PIAȚĂ • surse indisponibile necontorizate</div></header>
  <section className="robotZone">
   <button className={'nose '+(loading?'scanning':'')} onClick={scan} aria-label="Scanează acțiuni"><span>{loading?'SCANEZ':'SCANEAZĂ'}</span><small>ACȚIUNI</small></button>
   <div className="mouth">6 DIN 6 SURSE POZITIVE + RSI + VOLUM • fără garanții</div>
  </section>
  {err&&<div className="error">{err}</div>}
  {loading&&<div className="empty pulse">Se scanează acțiunile și se verifică sursele…</div>}
  {data&&!loading&&<><div className="summary"><span>Univers verificat <b>{data.universe??0}</b></span><span>Candidați în interval <b>{data.deepScanned??0}</b></span><span>Cu semnal <b>{data.qualified??rows.length}</b></span><span>Actualizat <b>{new Date(data.asOf).toLocaleTimeString('ro-RO',{timeZone:'Europe/Madrid'})}</b> ES</span></div>{data.note&&<div className="note">{data.note}</div>}<section className="grid">{rows.map((x,i)=><Card key={x.symbol+'-'+i} x={x}/>)}</section>{!rows.length&&<div className="empty">{data.marketOpen===false?'Piața este închisă acum. Scannerul nu afișează cotații vechi drept semnale noi.':'Nicio acțiune nu îndeplinește în acest moment toate condițiile: 6 surse pozitive din 6, momentum pozitiv, RSI între 40 și 68 și volum relativ suficient. Verifică din nou în timpul sesiunii bursiere.'}</div>}</>}
  <footer>Acesta este un scanner de acțiuni, nu un sistem de tranzacționare automată. Sursele folosite sunt Yahoo Finance, Finnhub, Twelve Data, Alpha Vantage, Massive/Polygon și Alpaca. Sunt afișate numai semnalele confirmate de toate cele 6 surse; sursele indisponibile nu sunt considerate confirmări. Niciun semnal nu garantează creșterea prețului.</footer>
 </main>
}
