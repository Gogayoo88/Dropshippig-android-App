import { NextResponse } from 'next/server';
import { candidateRow, fetchJson, mapLimit, num, pct, rsi, safePct, source, volumeRatio } from '../../../../lib/scanner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BASES = new Set(['USD','USDT']);
const toDash = s => s.replace('/','-');
const assetOf = s => s.split(/[\/-]/)[0].toUpperCase();
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function revolutCandles(symbol) {
  const pair = String(symbol || '').replace('/', '-');
  if (!/^[A-Z0-9]+-(USD|USDT)$/.test(pair)) throw Error('pereche Revolut X neacceptată');
  const end = Date.now(), start = end - 60 * 60_000;
  const qs = new URLSearchParams({ interval:'5', since:String(start), until:String(end), region:'EEA' });
  const j = await fetchJson(`https://revx.revolut.com/api/1.0/public/candles/${encodeURIComponent(pair)}?${qs.toString()}`, {}, 7000);
  const rows = [...(j.data || [])].sort((a,b)=>num(a.start)-num(b.start));
  if (rows.length < 4) throw Error('sub 4 lumânări intraday de la Revolut X');
  const closes = rows.map(x=>num(x.close)).filter(Number.isFinite);
  const vols = rows.map(x=>num(x.volume)).filter(Number.isFinite);
  if (closes.length < 4) throw Error('date OHLCV Revolut X incomplete');
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols,asOf:j.metadata?.timestamp||null};
}

async function binance(asset) {
  const j=await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${asset}USDT&interval=5m&limit=25`,{},5000);
  const closes=j.map(x=>num(x[4])), vols=j.map(x=>num(x[5]));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function coinbase(asset) {
  const j=await fetchJson(`https://api.exchange.coinbase.com/products/${asset}-USD/candles?granularity=300`,{},5000);
  const rows=[...(j||[])].sort((a,b)=>a[0]-b[0]).slice(-25); const closes=rows.map(x=>num(x[4])), vols=rows.map(x=>num(x[5]));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function kraken(asset) {
  const j=await fetchJson(`https://api.kraken.com/0/public/OHLC?pair=${asset}USD&interval=5`,{},5000);
  const key=Object.keys(j.result||{}).find(k=>k!=='last'); const rows=key?j.result[key].slice(-25):[]; const closes=rows.map(x=>num(x[4])), vols=rows.map(x=>num(x[6]));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function okx(asset) {
  const j=await fetchJson(`https://www.okx.com/api/v5/market/candles?instId=${asset}-USDT&bar=5m&limit=25`,{},5000);
  const rows=[...(j.data||[])].reverse(); const closes=rows.map(x=>num(x[4])), vols=rows.map(x=>num(x[5]));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function bybit(asset) {
  const j=await fetchJson(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${asset}USDT&interval=5&limit=25`,{},5000);
  const rows=[...(j.result?.list||[])].reverse(); const closes=rows.map(x=>num(x[4])), vols=rows.map(x=>num(x[5]));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function bitstamp(asset) {
  const j=await fetchJson(`https://www.bitstamp.net/api/v2/ohlc/${asset.toLowerCase()}usd/?step=300&limit=25`,{},5000);
  const rows=j.data?.ohlc||[]; const closes=rows.map(x=>num(x.close)), vols=rows.map(x=>num(x.volume));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function kucoin(asset) {
  const j=await fetchJson(`https://api.kucoin.com/api/v1/market/candles?type=5min&symbol=${asset}-USDT`,{},5000);
  const rows=[...(j.data||[])].reverse().slice(-25); const closes=rows.map(x=>num(x[2])), vols=rows.map(x=>num(x[5]));
  return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};
}
async function call(name, fn) { try { const x=await fn(); if(!Number.isFinite(x.m15)||!Array.isArray(x.closes)||x.closes.length<4)throw Error('date intraday insuficiente'); return {s:source(name,true,x.m15,null,'5m'),x}; } catch(e) { return {s:source(name,false,null,e.message)}; } }

export async function GET() {
  try {
    const rev = await fetchJson('https://revx.revolut.com/api/1.0/public/tickers?region=EEA', {}, 9000);
    const raw=(rev.data||[]).filter(t=>{const p=String(t.symbol||'').split('/'); return p.length===2 && BASES.has(p[1]);});

    // One row per crypto asset. Prefer USD, then USDT.
    const bestByAsset = new Map();
    for (const t of raw) {
      const asset=assetOf(t.symbol); const quote=String(t.symbol).split('/')[1];
      const prev=bestByAsset.get(asset);
      if (!prev || (quote==='USD' && String(prev.symbol).split('/')[1]!=='USD')) bestByAsset.set(asset,t);
    }
    const all=[...bestByAsset.values()];
    const universe=all.length;
    const candidates=all.map(t=>{
      const last=num(t.last_price), change=num(t.price_change_24h), prev=last-change, daily=pct(prev,last);
      return {t,last,daily,asset:assetOf(t.symbol)};
    }).filter(x=>Number.isFinite(x.daily)&&x.daily>=-10&&x.daily<=1&&Number.isFinite(x.last)).sort((a,b)=>b.daily-a.daily);

    const scanned=await mapLimit(candidates,4,async c=>{
      const revResult = await call('Revolut X',()=>revolutCandles(c.t.symbol));
      const external=await Promise.all([
        call('Binance',()=>binance(c.asset)), call('Coinbase',()=>coinbase(c.asset)), call('Kraken',()=>kraken(c.asset)),
        call('OKX',()=>okx(c.asset)), call('Bybit',()=>bybit(c.asset)), call('Bitstamp',()=>bitstamp(c.asset)), call('KuCoin',()=>kucoin(c.asset))
      ]);
      const jobs=[revResult,...external];
      const sources=jobs.map(x=>x.s);
      const best=[revResult,...external].find(x=>x.x?.closes?.length>=15)?.x;
      const m=[...jobs.filter(x=>Number.isFinite(x.x?.m15)).map(x=>x.x.m15)];
      const momentum=m.length?m.reduce((a,b)=>a+b,0)/m.length:0;
      return candidateRow({symbol:c.asset,price:c.last,daily:safePct(c.daily),currency:String(c.t.symbol).split('/')[1],quoteVolume:num(c.t.quote_volume_24h),volume24h:num(c.t.volume_24h)},sources,{rsi:rsi(best?.closes||[]),volRatio:volumeRatio(best?.vols||[]),momentum:safePct(momentum)});
    });

    scanned.sort((a,b)=>(b.agree-a.agree)||(b.agreePct-a.agreePct)||(b.daily-a.daily));
    const rows=scanned.filter(x=>{
      const visible=Number(x.agree)>=5 && Number(x.active)>=6 && Number(x.momentum)>0 && Number(x.volRatio)>=1 && Number.isFinite(Number(x.rsi)) && Number(x.rsi)>=40 && Number(x.rsi)<=68;
      if(!visible) return false;
      if(x.daily<=0) return true;
      // Pe +0…+2% păstrăm numai continuări timpurii cu volum și impuls pozitiv.
      return x.daily<=1 && Number(x.volRatio)>=1.20 && Number(x.momentum)>0;
    });
    const providerNames=['Revolut X','Binance','Coinbase','Kraken','OKX','Bybit','Bitstamp','KuCoin'];
    const providerDiagnostics=providerNames.map(name=>{
      const statuses=scanned.map(x=>x.sources.find(s=>s.name===name)).filter(Boolean);
      return {name,checked:statuses.length,ok:statuses.filter(s=>s.ok).length,failed:statuses.filter(s=>!s.ok).length,latestError:statuses.find(s=>!s.ok)?.error||null};
    });
    return NextResponse.json({ok:true,kind:'crypto',asOf:new Date().toISOString(),quoteSource:'Revolut X public tickers EEA',quoteAsOf:rev.metadata?.timestamp||null,universe,deepScanned:candidates.length,qualified:rows.length,rows,watching:scanned.length-rows.length,providerDiagnostics,note:`Motor 1 a verificat toate cele ${universe} active crypto unice disponibile în tickerele publice Revolut X EEA și a găsit ${candidates.length} în intervalul −10%…+1%. Variația 24h este calculată din prețul curent și schimbarea absolută raportată de Revolut X. Confirmarea de 15 minute folosește lumânări OHLCV publice Revolut X (interval 5m), nu un flux inventat din tranzacții. Celelalte 7 platforme sunt comparatoare independente; perechile nesuportate de o bursă sunt raportate indisponibile, nu simulate. Sursele indisponibile nu sunt numărate.`});
  } catch(e) { return NextResponse.json({ok:false,error:`Crypto: ${e.message}`},{status:502}); }
}
