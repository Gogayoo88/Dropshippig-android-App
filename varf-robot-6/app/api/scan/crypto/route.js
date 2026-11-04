import { NextResponse } from 'next/server';
import { fetchJson, mapLimit, num, pct, safePct, rsi, volumeRatio } from '../../../../lib/scanner';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;

const timeout=6500;
const providers=[
  ['Binance', async a=>{const j=await fetchJson('https://api.binance.com/api/v3/klines?symbol='+a+'USDT&interval=5m&limit=40',{},timeout);return candleStats(j.map(x=>({c:+x[4],v:+x[7],buy:+x[10]})));}],
  ['OKX', async a=>{const j=await fetchJson('https://www.okx.com/api/v5/market/candles?instId='+a+'-USDT&bar=5m&limit=40',{},timeout);return candleStats((j.data||[]).reverse().map(x=>({c:+x[4],v:+x[6],buy:null})));}],
  ['Bybit', async a=>{const j=await fetchJson('https://api.bybit.com/v5/market/kline?category=spot&symbol='+a+'USDT&interval=5&limit=40',{},timeout);return candleStats((j.result?.list||[]).reverse().map(x=>({c:+x[4],v:+x[6],buy:null})));}],
  ['KuCoin', async a=>{const j=await fetchJson('https://api.kucoin.com/api/v1/market/candles?type=5min&symbol='+a+'-USDT',{},timeout);return candleStats((j.data||[]).reverse().slice(-40).map(x=>({c:+x[2],v:+x[6],buy:null})));}],
  ['Gate.io', async a=>{const j=await fetchJson('https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair='+a+'_USDT&interval=5m&limit=40',{},timeout);return candleStats((j||[]).map(x=>({c:+x[2],v:+x[6],buy:null})));}],
  ['Coinbase', async a=>{const j=await fetchJson('https://api.exchange.coinbase.com/products/'+a+'-USD/candles?granularity=300',{},timeout);return candleStats((j||[]).slice(0,40).reverse().map(x=>({c:+x[4],v:+x[5],buy:null})));}],
  ['Kraken', async a=>{const j=await fetchJson('https://api.kraken.com/0/public/OHLC?pair='+a+'USD&interval=5',{},timeout);const k=Object.keys(j.result||{}).find(x=>x!=='last');return candleStats((k?j.result[k]:[]).slice(-40).map(x=>({c:+x[4],v:+x[6],buy:null})));}],
  ['Bitstamp', async a=>{const j=await fetchJson('https://www.bitstamp.net/api/v2/ohlc/'+a.toLowerCase()+'usd/?step=300&limit=40',{},timeout);return candleStats((j.data?.ohlc||[]).map(x=>({c:+x.close,v:+x.volume,buy:null})));}]
];
function candleStats(rows){
 const valid=rows.filter(x=>Number.isFinite(x.c)&&Number.isFinite(x.v));
 if(valid.length<16)throw Error('istoric 5m insuficient');
 const closes=valid.map(x=>x.c), vols=valid.map(x=>x.v);
 return {m15:pct(closes.at(-4),closes.at(-1)),m60:pct(closes.at(-13),closes.at(-1)),closes,vols,buyQuote:valid.slice(-12).reduce((s,x)=>s+(Number.isFinite(x.buy)?x.buy:0),0),buyAvailable:valid.slice(-12).some(x=>Number.isFinite(x.buy)),last12Quote:valid.slice(-12).reduce((s,x)=>s+x.v,0)};
}
function source(name,ok,stats,error){
 return {name,ok,up:!!ok&&stats.m15>0.12,m15:ok?safePct(stats.m15):null,error:ok?null:String(error||'indisponibil')};
}
function forecast({rsiValue,volRatio,m15,m60,flow,atrPct}){
 const score=Math.max(0,Math.min(100,Math.round((m15>0?15:0)+(m60>0?15:0)+(volRatio>1.5?20:volRatio>1?10:0)+(rsiValue>=48&&rsiValue<=68?20:rsiValue>68&&rsiValue<76?8:0)+(flow>55?20:flow>50?10:0)+(atrPct>0?10:0))));
 const base=Math.max(0.5,Math.min(18,atrPct*2.2+Math.max(0,m15)*0.35+Math.max(0,m60)*0.12));
 const low=score>=70?base:base*0.45, high=score>=70?base*2.5:base*1.3;
 return {score,upsideMin:safePct(low),upsideMax:safePct(high),horizon:m15>0.5&&volRatio>1.6?'Scurt: 15–90 minute':m60>0.8&&volRatio>1.15?'Mediu: 2–12 ore':'Lung: 12–48 ore'};
}
export async function GET(){
 try{
  const [tickers,exchangeInfo,revolut]=await Promise.all([
   fetchJson('https://api.binance.com/api/v3/ticker/24hr',{},10000),
   fetchJson('https://api.binance.com/api/v3/exchangeInfo',{},10000),
   fetchJson('https://revx.revolut.com/api/1.0/public/tickers?region=EEA',{},10000).catch(()=>null)
  ]);
  const tradable=new Set((exchangeInfo.symbols||[]).filter(s=>s.status==='TRADING'&&s.quoteAsset==='USDT'&&s.isSpotTradingAllowed!==false).map(s=>s.symbol));
  const revAssets=new Set((revolut?.data||[]).map(x=>String(x.symbol||'').split(/[/-]/)[0].toUpperCase()).filter(Boolean));
  const universe=tickers.filter(t=>tradable.has(t.symbol)&&t.symbol.endsWith('USDT')&&!/^(USDC|BUSD|FDUSD|TUSD|USDP|DAI|EUR|TRY|BRL|GBP|AUD|BIDR|USTC|USDE)USDT$/.test(t.symbol));
  const all=universe.map(t=>({symbol:t.symbol.replace(/USDT$/,''),price:+t.lastPrice,daily:+t.priceChangePercent,quoteVolume:+t.quoteVolume,high:+t.highPrice,low:+t.lowPrice}));
  // Preselectează candidați din întregul univers: scăderile recente și revenirea de lângă minim primesc prioritate, dar monedele deja în urcare rămân eligibile.
  const ranked=all.filter(x=>Number.isFinite(x.daily)&&x.quoteVolume>50000).map(x=>{
   const range=Math.max(1e-12,x.high-x.low), position=(x.price-x.low)/range;
   const earlyScore=(x.daily<0?Math.min(20,Math.abs(x.daily)*1.4):Math.max(0,8-x.daily))+
    Math.max(0,Math.min(20,(1-position)*20))+
    Math.min(25,Math.log10(Math.max(1,x.quoteVolume))*2.2)+Math.min(10,Math.log10(Math.max(1,x.high>0?x.quoteVolume/(x.high-x.low):0)));
   return {...x,earlyScore};
  }).sort((a,b)=>b.earlyScore-a.earlyScore);
  const early=ranked.slice(0,60);
  const detailed=await mapLimit(early,4,async coin=>{
   const checks=await Promise.all(providers.map(async ([name,fn])=>{try{const s=await fn(coin.symbol);return {s:source(name,true,s),stats:s};}catch(e){return {s:source(name,false,null,e.message),stats:null};}}));
   const bin=checks[0].stats;
   if(!bin)return {...coin,sources:checks.map(x=>x.s),active:checks.filter(x=>x.stats).length,agree:0,disagree:0,unavailable:checks.length,score:0,verdict:'DATE INSUFICIENTE'};
   const valid=checks.filter(x=>x.stats), agree=valid.filter(x=>x.stats.m15>0.12).length, disagree=valid.length-agree;
   const rsiValue=rsi(bin.closes), volRatio=volumeRatio(bin.vols);
   const flow=bin.buyAvailable&&bin.buyQuote>0?Math.min(100,100*bin.buyQuote/(bin.last12Quote||1)):null;
   const atrPct=100*(coin.high-coin.low)/Math.max(coin.price,1e-12);
   const f=forecast({rsiValue,volRatio,m15:bin.m15,m60:bin.m60,flow:flow??50,atrPct});
   const sell=flow==null?null:100-flow;
   const agreePct=valid.length?Math.round(100*agree/valid.length):0;
   const risk= (rsiValue>=76?'RSI supraîncălzit': '') + (flow!=null&&sell>=58?' vânzări dominante':'') + (bin.m15< -1.2?' impuls descendent':'');
   const dump=(sell!=null&&sell>=58)||(bin.m15< -1.5&&volRatio>1.8)||(rsiValue>82&&bin.m15<0);
   const verdict=dump?'AVERTISMENT VÂNZARE':agree>=6&&f.score>=70?'URCARE SOLIDĂ':agree>=3&&f.score>=42?'URCARE SLABĂ / SCURTĂ':'ÎN MONITORIZARE';
   return {...coin,currency:'USDT',sources:checks.map(x=>x.s),active:valid.length,agree,disagree,unavailable:checks.length-valid.length,agreePct,rsi:rsiValue==null?null:safePct(rsiValue),volRatio:volRatio==null?null:safePct(volRatio),buyPct:flow==null?null:safePct(flow),sellPct:sell==null?null:safePct(sell),inflow24h:coin.quoteVolume, m15:safePct(bin.m15),m60:safePct(bin.m60),...f,verdict,risk:risk.trim()||'Fără avertisment major detectat',dump,sourceTarget:providers.length};
  });
  const rows=detailed.sort((a,b)=>(b.dump-a.dump)||(b.score-a.score)||(b.quoteVolume-a.quoteVolume));
  const diagnostics=providers.map(([name])=>({name,ok:rows.filter(x=>x.sources.find(s=>s.name===name)?.ok).length,checked:rows.length}));
  return NextResponse.json({ok:true,kind:'crypto',primary:'Binance Spot',asOf:new Date().toISOString(),universe:all.length,deepScanned:rows.length,qualified:rows.filter(x=>x.verdict==='URCARE SOLIDĂ'||x.verdict==='URCARE SLABĂ / SCURTĂ').length,rows,providerDiagnostics:diagnostics,revolutUniverse:revAssets.size,revolutFeed:!!revolut,note:'Binance furnizează universul primar. Din toate perechile spot USDT tranzacționabile, sunt selectați 60 de candidați pentru verificare tehnică detaliată pe 8 burse, prioritizând scăderile recente, apropierea de minim și activitatea. Nu este încă o verificare multi-bursă completă pentru fiecare pereche. RSI, impuls 5m/1h, volum relativ și fluxul cumpărătorilor sunt calculate din lumânări reale. Estimarea de potențial este un interval statistic, nu promisiune. Avertismentul de vânzare indică presiune detectată, nu execută tranzacții.'});
 }catch(e){return NextResponse.json({ok:false,error:'Binance / scanare: '+e.message},{status:502});}
}
