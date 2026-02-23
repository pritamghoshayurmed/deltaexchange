/**
 * Data utilities for Delta Exchange option chain data.
 * Symbol format: {C|P}-{ASSET}-{STRIKE}-{DDMMYY}
 * e.g. C-BTC-95200-200225  →  BTC CALL 95200 20-Feb-25
 */

export const RESOLUTIONS = [
  { value: 1,     label: '1m'   },
  { value: 3,     label: '3m'   },
  { value: 5,     label: '5m'   },
  { value: 15,    label: '15m'  },
  { value: 30,    label: '30m'  },
  { value: 60,    label: '1h'   },
  { value: 120,   label: '2h'   },
  { value: 240,   label: '4h'   },
  { value: 360,   label: '6h'   },
  { value: 1440,  label: '1D'   },
  { value: 10080, label: '1W'   },
];

export const METRICS = [
  { value: 'mark_price',    label: 'Mark Price'    },
  { value: 'open_interest', label: 'Open Interest' },
  { value: 'volume',        label: 'Volume'        },
  { value: 'delta',         label: 'Delta'         },
  { value: 'gamma',         label: 'Gamma'         },
  { value: 'theta',         label: 'Theta'         },
];

// ─── Symbol Parsing ────────────────────────────────────────────────────────────

function parseOptionSymbol(symbol) {
  if (!symbol) return null;
  const parts = symbol.split('-');
  if (parts.length < 4) return null;

  const [typeChar, asset, strikeStr, expiryStr] = parts;
  if (!['C', 'P'].includes(typeChar)) return null;

  const strike = parseFloat(strikeStr);
  if (isNaN(strike)) return null;
  if (expiryStr.length < 6) return null;

  const day   = expiryStr.slice(0, 2);
  const month = expiryStr.slice(2, 4);
  const year  = `20${expiryStr.slice(4, 6)}`;
  const expiryDate = `${year}-${month}-${day}`;
  const expiryMs = new Date(`${year}-${month}-${day}T08:00:00Z`).getTime();

  return {
    optionType: typeChar === 'C' ? 'call' : 'put',
    asset,
    strike,
    expiryDate,
    expiryMs,
    expiryRaw: expiryStr,
  };
}

// ─── Normalization ─────────────────────────────────────────────────────────────

function normalizeTicker(ticker) {
  const sym = parseOptionSymbol(ticker.symbol);
  if (!sym) return null;

  const quotes = ticker.quotes ?? {};
  const greeks = ticker.greeks ?? {};

  return {
    symbol:        ticker.symbol,
    asset:         sym.asset,
    option_type:   sym.optionType,
    strike:        sym.strike,
    expiry_date:   sym.expiryDate,
    expiry_ms:     sym.expiryMs,
    expiry_raw:    sym.expiryRaw,
    mark_price:    parseFloat(ticker.mark_price) || null,
    spot_price:    parseFloat(ticker.spot_price) || null,
    bid_price:     parseFloat(quotes.best_bid)   || null,
    ask_price:     parseFloat(quotes.best_ask)   || null,
    bid_iv:        parseFloat(quotes.bid_iv)     || null,
    ask_iv:        parseFloat(quotes.ask_iv)     || null,
    open_interest: parseFloat(ticker.oi)         || null,
    volume:        parseFloat(ticker.volume)     || null,
    delta:         parseFloat(greeks.delta)      || null,
    gamma:         parseFloat(greeks.gamma)      || null,
    theta:         parseFloat(greeks.theta)      || null,
    vega:          parseFloat(greeks.vega)       || null,
  };
}

export function normalizeOptionChain(tickers, minOpenInterest = 0) {
  const records = [];
  for (const t of tickers) {
    const r = normalizeTicker(t);
    if (!r) continue;
    if ((r.open_interest ?? 0) < minOpenInterest) continue;
    records.push(r);
  }
  return records;
}

// ─── Grouping ──────────────────────────────────────────────────────────────────

export function groupByExpiry(records) {
  const map = new Map();
  for (const row of records) {
    if (!map.has(row.expiry_ms)) map.set(row.expiry_ms, []);
    map.get(row.expiry_ms).push(row);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

export function topInstrumentsForCandles(records, optionType, topN) {
  return records
    .filter((r) => r.option_type === optionType)
    .sort((a, b) => (b.open_interest ?? 0) - (a.open_interest ?? 0))
    .slice(0, topN);
}

// ─── Chart Builders ────────────────────────────────────────────────────────────

export function buildStrikeSeriesForExpiry(rows, metric = 'mark_price') {
  const calls = rows
    .filter((r) => r.option_type === 'call' && r[metric] != null)
    .sort((a, b) => a.strike - b.strike);
  const puts = rows
    .filter((r) => r.option_type === 'put' && r[metric] != null)
    .sort((a, b) => a.strike - b.strike);

  const series = [];
  if (calls.length) {
    series.push({
      name: 'CE (Call)',
      data: calls.map((r) => [r.strike, r[metric]]),
      color: '#26a69a',
      marker: { enabled: calls.length < 30 },
    });
  }
  if (puts.length) {
    series.push({
      name: 'PE (Put)',
      data: puts.map((r) => [r.strike, r[metric]]),
      color: '#ef5350',
      marker: { enabled: puts.length < 30 },
    });
  }
  return series;
}

export function buildCandlestickSeries(chartData) {
  if (!chartData?.t?.length) return null;
  const { t, o, h, l, c, v } = chartData;
  return {
    ohlcData: t.map((time, i) => [time * 1000, o[i], h[i], l[i], c[i]]),
    volData:  t.map((time, i) => [time * 1000, v?.[i] ?? 0]),
  };
}
