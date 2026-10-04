import { NextResponse } from 'next/server';
import { candidateRow, fetchJson, fetchText, mapLimit, num, pct, rsi, safePct, source, volumeRatio } from '../../../../lib/scanner';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=300;

const FALLBACK=['AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','AMD','AVGO','NFLX','PLTR','INTC','MU','ORCL','CRM','QCOM','ADBE','UBER','SHOP','PYPL','COIN','MSTR','JPM','BAC','GS','XOM','CVX','LLY','NVO','PFE','DIS','NKE','BA','CAT','GE','F','GM','RIVN','SNAP','ROKU'];

const EUROPE_CORE = [
  // Spania — BME / Madrid
  ['SAN.MC','EUROPA','Spania · BME'],['BBVA.MC','EUROPA','Spania · BME'],['ITX.MC','EUROPA','Spania · BME'],['IBE.MC','EUROPA','Spania · BME'],['REP.MC','EUROPA','Spania · BME'],['TEF.MC','EUROPA','Spania · BME'],['AENA.MC','EUROPA','Spania · BME'],['FER.MC','EUROPA','Spania · BME'],['ACS.MC','EUROPA','Spania · BME'],['CABK.MC','EUROPA','Spania · BME'],['ELE.MC','EUROPA','Spania · BME'],['NTGY.MC','EUROPA','Spania · BME'],['CLNX.MC','EUROPA','Spania · BME'],
  // Germania — Xetra
  ['SAP.DE','EUROPA','Germania · Xetra'],['SIE.DE','EUROPA','Germania · Xetra'],['ALV.DE','EUROPA','Germania · Xetra'],['DTE.DE','EUROPA','Germania · Xetra'],['MBG.DE','EUROPA','Germania · Xetra'],['BMW.DE','EUROPA','Germania · Xetra'],['VOW3.DE','EUROPA','Germania · Xetra'],['BAS.DE','EUROPA','Germania · Xetra'],['BAYN.DE','EUROPA','Germania · Xetra'],['RWE.DE','EUROPA','Germania · Xetra'],['DB1.DE','EUROPA','Germania · Xetra'],['IFX.DE','EUROPA','Germania · Xetra'],['ADS.DE','EUROPA','Germania · Xetra'],['HEN3.DE','EUROPA','Germania · Xetra'],['DHL.DE','EUROPA','Germania · Xetra'],
  // Franța — Euronext Paris
  ['MC.PA','EUROPA','Franța · Euronext Paris'],['OR.PA','EUROPA','Franța · Euronext Paris'],['SAN.PA','EUROPA','Franța · Euronext Paris'],['SU.PA','EUROPA','Franța · Euronext Paris'],['TTE.PA','EUROPA','Franța · Euronext Paris'],['BNP.PA','EUROPA','Franța · Euronext Paris'],['AIR.PA','EUROPA','Franța · Euronext Paris'],['ACA.PA','EUROPA','Franța · Euronext Paris'],['DG.PA','EUROPA','Franța · Euronext Paris'],['CAP.PA','EUROPA','Franța · Euronext Paris'],['RI.PA','EUROPA','Franța · Euronext Paris'],['ENGI.PA','EUROPA','Franța · Euronext Paris'],['RMS.PA','EUROPA','Franța · Euronext Paris'],['KER.PA','EUROPA','Franța · Euronext Paris'],['AI.PA','EUROPA','Franța · Euronext Paris'],
  // Italia — Borsa Italiana
  ['ENI.MI','EUROPA','Italia · Milano'],['ISP.MI','EUROPA','Italia · Milano'],['UCG.MI','EUROPA','Italia · Milano'],['ENEL.MI','EUROPA','Italia · Milano'],['STLAM.MI','EUROPA','Italia · Milano'],['RACE.MI','EUROPA','Italia · Milano'],['G.MI','EUROPA','Italia · Milano'],['PRY.MI','EUROPA','Italia · Milano'],['SRG.MI','EUROPA','Italia · Milano'],['TRN.MI','EUROPA','Italia · Milano'],['LDO.MI','EUROPA','Italia · Milano'],
  // Olanda / Belgia / Portugalia — Euronext
  ['ASML.AS','EUROPA','Olanda · Euronext Amsterdam'],['PHIA.AS','EUROPA','Olanda · Euronext Amsterdam'],['INGA.AS','EUROPA','Olanda · Euronext Amsterdam'],['AD.AS','EUROPA','Olanda · Euronext Amsterdam'],['HEIA.AS','EUROPA','Olanda · Euronext Amsterdam'],['UNA.AS','EUROPA','Olanda · Euronext Amsterdam'],['PRX.AS','EUROPA','Olanda · Euronext Amsterdam'],['ASM.AS','EUROPA','Olanda · Euronext Amsterdam'],['KPN.AS','EUROPA','Olanda · Euronext Amsterdam'],['ABI.BR','EUROPA','Belgia · Euronext Brussels'],['KBC.BR','EUROPA','Belgia · Euronext Brussels'],['UCB.BR','EUROPA','Belgia · Euronext Brussels'],['EDP.LS','EUROPA','Portugalia · Euronext Lisbon'],['GALP.LS','EUROPA','Portugalia · Euronext Lisbon'],['JMT.LS','EUROPA','Portugalia · Euronext Lisbon'],
  // Marea Britanie — London Stock Exchange
  ['SHEL.L','EUROPA','Regatul Unit · LSE'],['AZN.L','EUROPA','Regatul Unit · LSE'],['HSBA.L','EUROPA','Regatul Unit · LSE'],['ULVR.L','EUROPA','Regatul Unit · LSE'],['BP.L','EUROPA','Regatul Unit · LSE'],['GSK.L','EUROPA','Regatul Unit · LSE'],['BARC.L','EUROPA','Regatul Unit · LSE'],['LLOY.L','EUROPA','Regatul Unit · LSE'],['RIO.L','EUROPA','Regatul Unit · LSE'],['REL.L','EUROPA','Regatul Unit · LSE'],['DGE.L','EUROPA','Regatul Unit · LSE'],['NG.L','EUROPA','Regatul Unit · LSE'],['VOD.L','EUROPA','Regatul Unit · LSE'],['RR.L','EUROPA','Regatul Unit · LSE'],['LSEG.L','EUROPA','Regatul Unit · LSE'],
  // Elveția
  ['NESN.SW','EUROPA','Elveția · SIX'],['NOVN.SW','EUROPA','Elveția · SIX'],['ROG.SW','EUROPA','Elveția · SIX'],['UBSG.SW','EUROPA','Elveția · SIX'],['ZURN.SW','EUROPA','Elveția · SIX'],['ABBN.SW','EUROPA','Elveția · SIX'],['SREN.SW','EUROPA','Elveția · SIX'],['GIVN.SW','EUROPA','Elveția · SIX'],['SIKA.SW','EUROPA','Elveția · SIX'],['LOGN.SW','EUROPA','Elveția · SIX'],['HOLN.SW','EUROPA','Elveția · SIX'],
  // Nordice
  ['NOVO-B.CO','EUROPA','Danemarca · Copenhagen'],['MAERSK-B.CO','EUROPA','Danemarca · Copenhagen'],['VWS.CO','EUROPA','Danemarca · Copenhagen'],['DSV.CO','EUROPA','Danemarca · Copenhagen'],['CARL-B.CO','EUROPA','Danemarca · Copenhagen'],
  ['VOLV-B.ST','EUROPA','Suedia · Stockholm'],['ATCO-A.ST','EUROPA','Suedia · Stockholm'],['ERIC-B.ST','EUROPA','Suedia · Stockholm'],['SEB-A.ST','EUROPA','Suedia · Stockholm'],['SWED-A.ST','EUROPA','Suedia · Stockholm'],['HM-B.ST','EUROPA','Suedia · Stockholm'],['SAND.ST','EUROPA','Suedia · Stockholm'],['INVE-B.ST','EUROPA','Suedia · Stockholm'],
  ['NOKIA.HE','EUROPA','Finlanda · Helsinki'],['KNEBV.HE','EUROPA','Finlanda · Helsinki'],['SAMPO.HE','EUROPA','Finlanda · Helsinki'],['NESTE.HE','EUROPA','Finlanda · Helsinki'],
  ['EQNR.OL','EUROPA','Norvegia · Oslo'],['DNB.OL','EUROPA','Norvegia · Oslo'],['TEL.OL','EUROPA','Norvegia · Oslo'],['MOWI.OL','EUROPA','Norvegia · Oslo']
].map(([symbol,region,exchange])=>({symbol,region,exchange}));
const EUROPE_META = new Map(EUROPE_CORE.map(x=>[x.symbol,x]));

const EXCLUDE_NAME=/\b(ETF|ETN|WARRANT|RIGHT|UNIT|PREFERRED|DEPOSITARY|NOTE|BOND|FUND|TRUST)\b/i;

function parsePipe(text, kind){
  const lines=String(text||'').trim().split(/\r?\n/); if(lines.length<2)return [];
  const headers=lines[0].split('|'); const idx=Object.fromEntries(headers.map((h,i)=>[h.trim(),i]));
  const symKey=kind==='nasdaq'?'Symbol':'ACT Symbol';
  return lines.slice(1).map(line=>line.split('|')).filter(a=>a.length>3).filter(a=>!String(a[0]).startsWith('File Creation Time')).filter(a=>{
    const test=a[idx['Test Issue']]; const etf=a[idx['ETF']]; const name=a[idx['Security Name']]||'';
    return test==='N' && etf!=='Y' && !EXCLUDE_NAME.test(name);
  }).map(a=>String(a[idx[symKey]]||'').trim()).filter(s=>/^[A-Z.\-]{1,10}$/.test(s));
}

async function loadUniverse(){
  try{
    const [n,o]=await Promise.all([
      fetchText('https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',{},12000),
      fetchText('https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt',{},12000)
    ]);
    return [...new Set([...parsePipe(n,'nasdaq'),...parsePipe(o,'other')])];
  }catch{return FALLBACK;}
}

async function quoteBatch(symbols){
  const url=`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const j=await fetchJson(url,{},8000);
  return j.quoteResponse?.result||[];
}

async function yahoo(sym){
  const j=await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m&includePrePost=true`,{},6000);
  const r=j.chart?.result?.[0]; if(!r)throw Error('fără date'); const q=r.indicators?.quote?.[0]||{}; const closes=(q.close||[]).map(num).filter(Number.isFinite); const vols=(q.volume||[]).map(num).filter(Number.isFinite); const meta=r.meta||{};
  const daily=Number.isFinite(num(meta.previousClose))?pct(num(meta.previousClose),num(meta.regularMarketPrice)):NaN;
  return {price:num(meta.regularMarketPrice),daily,m15:pct(closes.at(-4),closes.at(-1)),closes,vols,marketState:meta.marketState||null,volume:num(meta.regularMarketVolume),currency:meta.currency||null,exchangeName:meta.exchangeName||meta.fullExchangeName||null};
}
async function twelve(sym,key){const j=await fetchJson(`https://api.twelvedata.com/time_series?symbol=${sym}&interval=5min&outputsize=25&apikey=${encodeURIComponent(key)}`,{},6000); if(j.status==='error')throw Error(j.message); const rows=[...(j.values||[])].reverse(); const closes=rows.map(x=>num(x.close)),vols=rows.map(x=>num(x.volume)); return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};}
async function alpha(sym,key){const j=await fetchJson(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${sym}&interval=5min&outputsize=compact&apikey=${encodeURIComponent(key)}`,{},6000); const ts=j['Time Series (5min)']; if(!ts)throw Error(j.Note||j.Information||'fără date'); const rows=Object.entries(ts).sort((a,b)=>a[0].localeCompare(b[0])).slice(-25); const closes=rows.map(([,x])=>num(x['4. close'])),vols=rows.map(([,x])=>num(x['5. volume'])); return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};}
async function massive(sym,key){const to=new Date().toISOString().slice(0,10), from=new Date(Date.now()-3*864e5).toISOString().slice(0,10); const j=await fetchJson(`https://api.polygon.io/v2/aggs/ticker/${sym}/range/5/minute/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${encodeURIComponent(key)}`,{},6000); const rows=(j.results||[]).slice(-25); const closes=rows.map(x=>num(x.c)),vols=rows.map(x=>num(x.v)); return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};}
async function alpaca(sym,key,secret){const j=await fetchJson(`https://data.alpaca.markets/v2/stocks/${sym}/bars?timeframe=5Min&limit=25&feed=iex`,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret}},6000); const rows=j.bars||[]; const closes=rows.map(x=>num(x.c)),vols=rows.map(x=>num(x.v)); return {m15:pct(closes.at(-4),closes.at(-1)),closes,vols};}
async function finnhub(sym,key){const j=await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${encodeURIComponent(key)}`,{},6000); const c=num(j.c),o=num(j.o); return {m15:pct(o,c),closes:[],vols:[]};}
async function call(name, fn, configured=true){if(!configured)return {s:source(name,false,null,'cheie API neconfigurată')}; try{const x=await fn();return{s:source(name,true,x.m15,null,'5m'),x};}catch(e){return{s:source(name,false,null,e.message)}}}

export async function GET(){
 try{
  const usUniverseSymbols=await loadUniverse();
  const universeSymbols=[...new Set([...usUniverseSymbols,...EUROPE_CORE.map(x=>x.symbol)])];
  const batches=[]; for(let i=0;i<universeSymbols.length;i+=120)batches.push(universeSymbols.slice(i,i+120));
  let quotes=[]; let quoteFallbackUsed=false;
  try{
    const parts=await mapLimit(batches,5,async b=>quoteBatch(b)); quotes=parts.flat();
  }catch{
    quoteFallbackUsed=true;
    // Yahoo bulk can occasionally reject anonymous calls. Fall back to the core list instead of inventing coverage.
    const fallbackSymbols=[...FALLBACK,...EUROPE_CORE.map(x=>x.symbol)];
    const parts=await mapLimit(fallbackSymbols,6,async sym=>{try{const y=await yahoo(sym);return {symbol:sym,regularMarketPrice:y.price,regularMarketChangePercent:y.daily,regularMarketVolume:y.volume,marketState:y.marketState,currency:y.currency};}catch{return null}}); quotes=parts.filter(Boolean);
  }

  const candidates=quotes.map(q=>{
    const eu=EUROPE_META.get(q.symbol);
    return {sym:q.symbol,price:num(q.regularMarketPrice),daily:num(q.regularMarketChangePercent),volume:num(q.regularMarketVolume),marketState:q.marketState||null,currency:q.currency||null,region:eu?.region||'SUA',exchange:eu?.exchange||'SUA'};
  }).filter(x=>Number.isFinite(x.price)&&Number.isFinite(x.daily)&&x.daily>=-10&&x.daily<=1).sort((a,b)=>b.daily-a.daily);

  const F=process.env.FINNHUB_API_KEY,T=process.env.TWELVEDATA_API_KEY,A=process.env.ALPHAVANTAGE_API_KEY,M=process.env.MASSIVE_API_KEY||process.env.POLYGON_API_KEY,AK=process.env.ALPACA_API_KEY,AS=process.env.ALPACA_API_SECRET;
  const scanned=await mapLimit(candidates,5,async c=>{
   let y; try{y=await yahoo(c.sym)}catch{y={price:c.price,daily:c.daily,m15:NaN,closes:[],vols:[],marketState:c.marketState,volume:c.volume}}
   const jobs=await Promise.all([
    {s:Number.isFinite(y.m15)?source('Yahoo',true,y.m15,null,'5m'):source('Yahoo',false,null,'fără bare intraday'),x:y},
    call('Finnhub',()=>finnhub(c.sym,F),!!F), call('Twelve Data',()=>twelve(c.sym,T),!!T), call('Alpha Vantage',()=>alpha(c.sym,A),!!A),
    call('Massive',()=>massive(c.sym,M),!!M), call('Alpaca',()=>alpaca(c.sym,AK,AS),!!AK&&!!AS)
   ]);
   const sources=jobs.map(x=>x.s); const extra=jobs.find(x=>x.x?.closes?.length>=15)?.x||y; const m=jobs.filter(x=>Number.isFinite(x.x?.m15)).map(x=>x.x.m15); const momentum=m.length?m.reduce((a,b)=>a+b,0)/m.length:0;
   return candidateRow({symbol:c.sym,price:Number.isFinite(y.price)?y.price:c.price,daily:safePct(Number.isFinite(y.daily)?y.daily:c.daily),currency:y.currency||c.currency||(c.region==='SUA'?'USD':'—'),quoteVolume:Number.isFinite(y.volume)?y.volume:c.volume,marketState:y.marketState||c.marketState,region:c.region,exchange:c.exchange},sources,{rsi:rsi(extra.closes||[]),volRatio:volumeRatio(extra.vols||[]),momentum:safePct(momentum)});
  });
  scanned.sort((a,b)=>(b.agree-a.agree)||(b.agreePct-a.agreePct)||(b.daily-a.daily));
  const rows=scanned.filter(x=>{
    const visible=Number(x.agree)>=2 && Number(x.active)>=2;
    if(!visible) return false;
    if(x.daily<=0) return true;
    return x.daily<=1 && Number(x.volRatio)>=1.20 && Number(x.momentum)>0;
  });
  const directoryFallbackUsed=usUniverseSymbols.length===FALLBACK.length && usUniverseSymbols.every((x,i)=>x===FALLBACK[i]);
  const incomplete=directoryFallbackUsed||quoteFallbackUsed;
  return NextResponse.json({ok:true,kind:'stocks',asOf:new Date().toISOString(),universe:incomplete?(FALLBACK.length+EUROPE_CORE.length):universeSymbols.length,usUniverse:directoryFallbackUsed?FALLBACK.length:usUniverseSymbols.length,europeUniverse:EUROPE_CORE.length,deepScanned:candidates.length,qualified:rows.length,rows,watching:scanned.length-rows.length,note:incomplete?`Scannerul verifică SUA + Europa. Directorul complet SUA nu a putut fi confirmat în această rundă, deci SUA folosește temporar lista de bază; Europa rămâne activă cu ${EUROPE_CORE.length} acțiuni lichide multi-bursă (Spania, Germania, Franța, Italia, Olanda, Belgia, Portugalia, Regatul Unit, Elveția și Nordice). Nu prezentăm această listă europeană ca întreaga piață europeană.`:`Motor 1 verifică directorul Nasdaq/NYSE/alte burse SUA plus ${EUROPE_CORE.length} acțiuni lichide din piețele europene. Motor 2 a verificat TOȚI candidații −10%…+1%. Pentru 0…+1% sunt afișate numai activele cu volum ≥1,20×, momentum pozitiv și minimum 5 confirmări. Sunt afișați candidații de la 2 confirmări în sus. 2 = URMĂREȘTE, 3–4 = APROAPE DE INTRARE, 5 = INTRARE POSIBILĂ, 6+ = SEMNAL PUTERNIC. Sursele indisponibile nu sunt numărate. Sursele cu cheie API lipsă rămân indisponibile și nu sunt numărate.`});
 }catch(e){return NextResponse.json({ok:false,error:`Acțiuni: ${e.message}`},{status:502});}
}
