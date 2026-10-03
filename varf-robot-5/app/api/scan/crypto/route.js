import { NextResponse } from 'next/server';
import { candidateRow, fetchJson, mapLimit, num, pct, rsi, safePct, source, volumeRatio } from '../../../../lib/scanner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BASES = new Set(['USD','USDT']);
const toDash = s => s.replace('/','-');
const assetOf = s => s.split(/[\/-]/)[0].toUpperCase();
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function revolutRecentMomentum() {
  const end = Date.now(), start = end - 25 * 60_000;
  let cursor = null, page = 0;
  const grouped = new Map();
  do {
    const qs = new URLSearchParams({ start_date:String(start), end_date:String(end), limit:'1000', region:'EEA' });
    if (cursor) qs.set('cursor', cursor);
    const j = await fetchJson(`https://revx.revolut.com/api/1.0/public/trades/all?${qs.toString()}`, {}, 9000);
    for (const t of (j.data||[])) {
      const sym = String(t.symbol||'');
      const p = num(t.price), ts = num(t.timestamp);
      if (!sym || !Number.isFinite(p) || !Number.isFinite(ts)) continue;
      if (!grouped.has(sym)) grouped.set(sym, []);
      grouped.get(sym).push({p,ts});
    }
    cursor = j.metadata?.next_cursor || null;
    page++;
    if (cursor && page < 4) await sleep(1050);
  } while (cursor && page < 4);

  const out = new Map();
  for (const [sym, rows] of grouped) {
    rows.sort((a,b)=>a.ts-b.ts);
    if (rows.length >= 2) out.set(sym, pct(rows[0].p, rows.at(-1).p));
  }
  return out;
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
async function call(name, fn) { try { const x=await fn(); return {s:source(name,true,x.m15,null,'5m'),x}; } catch(e) { return {s:source(name,false,null,e.message)}; } }

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
    }).filter(x=>Number.isFinite(x.daily)&&x.daily>=-10&&x.daily<=0&&Number.isFinite(x.last)).sort((a,b)=>b.daily-a.daily);

    let revMom = new Map();
    try { revMom = await revolutRecentMomentum(); } catch { /* source will show unavailable */ }

    const scanned=await mapLimit(candidates,4,async c=>{
      const revM15 = revMom.get(c.t.symbol) ?? revMom.get(toDash(c.t.symbol)) ?? null;
      const external=await Promise.all([
        call('Binance',()=>binance(c.asset)), call('Coinbase',()=>coinbase(c.asset)), call('Kraken',()=>kraken(c.asset)),
        call('OKX',()=>okx(c.asset)), call('Bybit',()=>bybit(c.asset)), call('Bitstamp',()=>bitstamp(c.asset)), call('KuCoin',()=>kucoin(c.asset))
      ]);
      const jobs=[
        {s:Number.isFinite(revM15)?source('Revolut X',true,revM15,null,'tranzacții ~25m'):source('Revolut X',false,null,'fără suficiente tranzacții recente')},
        ...external.map(x=>x)
      ];
      const sources=jobs.map(x=>x.s);
      const best=external.find(x=>x.x?.closes?.length>=15)?.x;
      const m=[...(Number.isFinite(revM15)?[revM15]:[]),...external.filter(x=>Number.isFinite(x.x?.m15)).map(x=>x.x.m15)];
      const momentum=m.length?m.reduce((a,b)=>a+b,0)/m.length:0;
      return candidateRow({symbol:c.asset,price:c.last,daily:safePct(c.daily),currency:String(c.t.symbol).split('/')[1],quoteVolume:num(c.t.quote_volume_24h),volume24h:num(c.t.volume_24h)},sources,{rsi:rsi(best?.closes||[]),volRatio:volumeRatio(best?.vols||[]),momentum:safePct(momentum)});
    });

    scanned.sort((a,b)=>(b.agree-a.agree)||(b.agreePct-a.agreePct)||(b.daily-a.daily));
    const rows=scanned.filter(x=>x.verdict==='INTRARE POSIBILĂ'||x.verdict==='SEMNAL PUTERNIC');
    return NextResponse.json({ok:true,kind:'crypto',asOf:new Date().toISOString(),universe,deepScanned:candidates.length,qualified:rows.length,rows,watching:scanned.length-rows.length,note:`Motor 1 a verificat toate cele ${universe} active crypto unice disponibile în tickerele publice Revolut X EEA și a găsit ${candidates.length} în intervalul −10%…0%. Motor 2 a verificat TOȚI acești candidați; sunt afișați numai cei cu minimum 3 confirmări și condiții tehnice favorabile.`});
  } catch(e) { return NextResponse.json({ok:false,error:`Crypto: ${e.message}`},{status:502}); }
}
