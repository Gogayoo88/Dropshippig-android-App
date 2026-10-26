'use client';
import {useEffect,useMemo,useState} from 'react';

const fmt=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString('ro-RO',{maximumFractionDigits:d}):'—';
function SourcePill({s}){return <span className={'source '+(!s.ok?'off':s.up?'up':'down')} title={s.ok?'Mișcare '+fmt(s.m15)+'% • '+(s.freshness||'feed'):s.error}>{s.name} {s.ok?(s.up?'▲':'▼'):'×'}</span>}
function Card({x}){const neg=x.daily<0; const strong=x.verdict==='SEMNAL PUTERNIC'; const possible=x.verdict==='INTRARE POSIBILĂ';return <article className="card">
  <div className="cardTop"><div><b className="sym">{x.symbol}</b>{x.region&&<span className="kind">{x.region}</span>}</div><span className={'daily '+(neg?'neg':'pos')}>{fmt(x.daily)}%</span></div>
  {x.exchange&&<div className="note" style={{margin:'6px 0 8px',padding:'6px 8px'}}>{x.exchange}</div>}
  <div className="price">{fmt(x.price, x.price<1?6:2)} <small>{x.currency||'USD'}</small></div>
  <div className="metrics"><div><span>Confirmă</span><b>{x.agree}/{x.sourceTarget??6}</b></div><div><span>Surse active</span><b>{x.active}/{x.sourceTarget??6}</b></div><div><span>Nu confirmă</span><b>{x.disagree??Math.max(0,x.active-x.agree)}</b></div><div><span>Indisponibile</span><b>{x.unavailable??0}</b></div><div><span>Acord</span><b>{x.agreePct}%</b></div><div><span>RSI</span><b>{fmt(x.rsi,1)}</b></div><div><span>Volum</span><b>{Number.isFinite(Number(x.quoteVolume||x.volume24h))?fmt(Number(x.quoteVolume||x.volume24h)/1000000,2)+'M':'—'}</b></div><div><span>Impuls vol.</span><b>{x.volRatio?fmt(x.volRatio,2)+'×':'—'}</b></div></div>
  <div className="sources">{x.sources?.map(s=><SourcePill s={s} key={s.name}/>)}</div>
  <div className={'verdict '+(strong?'strong':possible?'go':'wait')}>{x.verdict}</div>
  <div className="note" style={{marginTop:8}}><b>Orizont estimat:</b> {x.horizon||'Orizont neconfirmat'}</div>
</article>}

export default function Home(){
 const [mode,setMode]=useState('stocks'); const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState('');
 const endpoint=mode==='stocks'?'/api/scan/stocks':'/api/scan/crypto';
 async function scan(){
  setLoading(true);setErr('');
  try{const r=await fetch(endpoint,{cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Scanarea acțiunilor a eșuat');setData(j);}
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
 },[mode]);
 const rows=useMemo(()=>data?.rows||[],[data]);
 return <main>
  <header><div><h1>VÂRF <span>ROBOT 6</span></h1><p>{mode==='stocks'?'Acțiuni SUA + Europa • caută mișcări timpurii între −10% și +1% • confirmări independente':'Criptomonede disponibile în Revolut X EEA • mișcări timpurii între −10% și +1% • verificare pe 8 surse'}</p></div><div className="live"><i></i> DATE DE PIAȚĂ • surse indisponibile necontorizate</div></header>
  <nav className="modeTabs" aria-label="Tipul scannerului">
   <button className={mode==='stocks'?'active':''} onClick={()=>{setData(null);setMode('stocks');setLoading(true);setErr('');}}>ACȚIUNI</button>
   <button className={mode==='crypto'?'active':''} onClick={()=>{setData(null);setMode('crypto');setLoading(true);setErr('');}}>CRYPTO · REVOLUT X</button>
  </nav>
  <section className="robotZone">
   <button className={'nose '+(loading?'scanning':'')} onClick={scan} aria-label={mode==='stocks'?'Scanează acțiuni':'Scanează criptomonede'}><span>{loading?'SCANEZ':'SCANEAZĂ'}</span><small>{mode==='stocks'?'ACȚIUNI':'CRYPTO'}</small></button>
   <div className="mouth">{mode==='stocks'?'6 surse pentru acțiuni':'8 surse crypto'} • RSI + volum + momentum • fără garanții</div>
  </section>
  {err&&<div className="error">{err}</div>}
  {loading&&<div className="empty pulse">Se scanează acțiunile și se verifică sursele…</div>}
  {data&&!loading&&<><div className="summary"><span>Univers verificat <b>{data.universe??0}</b></span><span>Candidați în interval <b>{data.deepScanned??0}</b></span><span>Cu semnal <b>{data.qualified??rows.length}</b></span><span>Actualizat <b>{new Date(data.asOf).toLocaleTimeString('ro-RO',{timeZone:'Europe/Madrid'})}</b> ES</span></div>{data.note&&<div className="note">{data.note}</div>}{data.providerDiagnostics&&<section className="providerGrid" aria-label="Starea surselor"><h2>Starea reală a surselor</h2>{data.providerDiagnostics.map(p=><div className="provider" key={p.name}><b>{p.name}</b><span className={p.ok>0?'providerOk':'providerOff'}>{p.ok>0?'Răspunde':'Indisponibil'}</span><small>{p.ok}/{p.checked} verificări reușite{p.keyRequired?(p.keyConfigured?' · cheie configurată':' · lipsește cheia API'):''}</small>{p.latestError&&<small className="providerError">{p.latestError}</small>}</div>)}</section>}<section className="grid">{rows.map((x,i)=><Card key={x.symbol+'-'+i} x={x}/>)}</section>{!rows.length&&<div className="empty">{data.marketOpen===false?'Piața este închisă acum. Scannerul nu afișează cotații vechi drept semnale noi.':mode==='stocks'?'Nicio acțiune nu îndeplinește în acest moment toate condițiile confirmate de sursele disponibile. Nu considerăm cheile lipsă sau datele incomplete drept confirmări.':'Nicio criptomonedă nu îndeplinește în acest moment toate condițiile. Verifică starea surselor de mai sus; perechile neacceptate sau datele incomplete nu sunt considerate confirmări.'}</div>}</>}
  <footer>VÂRF Robot 6 este un scanner informativ, nu un sistem de tranzacționare automată. {mode==='stocks'?'Surse acțiuni: Yahoo Finance, Finnhub, Twelve Data, Alpha Vantage, Massive/Polygon și Alpaca.':'Surse crypto: Revolut X, Binance, Coinbase, Kraken, OKX, Bybit, Bitstamp și KuCoin.'} Starea fiecărei surse este afișată separat. Nu afișăm date lipsă ca și cum ar fi reale și niciun semnal nu garantează creșterea prețului.</footer>
 </main>
}
