export async function fetchJson(url, options = {}, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal, cache: 'no-store', headers: { 'user-agent': 'VarfRobot/5.0', ...(options.headers || {}) } });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function fetchText(url, options = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal, cache: 'no-store', headers: { 'user-agent': 'VarfRobot/5.0', ...(options.headers || {}) } });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

export async function mapLimit(items, limit, mapper) {
  const out = new Array(items.length);
  let index = 0;
  async function worker() {
    while (true) {
      const i = index++;
      if (i >= items.length) return;
      out[i] = await mapper(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, worker));
  return out;
}

export function num(v) { const n = Number(v); return Number.isFinite(n) ? n : NaN; }
export function pct(from, to) { return Number.isFinite(from) && from !== 0 && Number.isFinite(to) ? (to / from - 1) * 100 : NaN; }
export function safePct(v) { return Number.isFinite(v) ? Math.round(v * 100) / 100 : null; }

export function rsi(closes, period = 14) {
  const xs = closes.map(Number).filter(Number.isFinite);
  if (xs.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = xs.length - period; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1]; if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

export function volumeRatio(volumes, lookback = 12) {
  const xs = volumes.map(Number).filter(Number.isFinite);
  if (xs.length < 3) return null;
  const latest = xs.at(-1);
  const prev = xs.slice(Math.max(0, xs.length - 1 - lookback), -1);
  const avg = prev.reduce((a,b)=>a+b,0) / Math.max(1, prev.length);
  return avg > 0 ? latest / avg : null;
}

export function source(name, ok, m15 = null, error = null, freshness = '15m') {
  return { name, ok, up: ok ? Number(m15) > 0.12 : false, m15: ok && Number.isFinite(Number(m15)) ? safePct(Number(m15)) : null, error: ok ? null : String(error || 'indisponibil'), freshness };
}

export function verdict({ sources, rsiValue, volRatioValue, momentum }) {
  const sourceTarget = sources.length;
  const active = sources.filter(s => s.ok).length;
  const agree = sources.filter(s => s.ok && s.up).length;
  const disagree = Math.max(0, active - agree);
  const unavailable = Math.max(0, sourceTarget - active);
  const agreePct = active ? Math.round(agree / active * 100) : 0;
  const rsiOk = rsiValue == null || (rsiValue >= 42 && rsiValue <= 68);
  const volOk = volRatioValue == null || volRatioValue >= 0.9;
  const techOk = rsiOk && volOk && Number(momentum || 0) > 0;
  let label = 'AȘTEAPTĂ';
  if (active < 5) label = 'DATE INSUFICIENTE';
  else if (agree >= 6 && techOk) label = 'SEMNAL PUTERNIC';
  else if (agree >= 5 && techOk) label = 'INTRARE POSIBILĂ';
  return { active, agree, disagree, unavailable, agreePct, sourceTarget, verdict: label };
}

export function candidateRow(base, sources, technical = {}) {
  const v = verdict({ sources, rsiValue: technical.rsi, volRatioValue: technical.volRatio, momentum: technical.momentum });
  return { ...base, ...technical, ...v, sources };
}
