/**
 * Delta Exchange public API client (v2).
 * Reference: https://docs.delta.exchange/
 */

export const PROD_BASE_URL = 'https://cdn.india.deltaex.org';
export const TEST_BASE_URL = 'https://cdn-ind.testnet.deltaex.org';

async function _get(baseUrl, path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);

  const payload = await res.json();
  if (!payload.success) throw new Error(`Delta API error: ${JSON.stringify(payload.error ?? payload)}`);
  return payload.result ?? [];
}

async function _getChartHistory(baseUrl, path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);

  const payload = await res.json();
  if (!payload.success) throw new Error(`Delta API error: ${JSON.stringify(payload.error ?? payload)}`);

  const chartData = payload.result;
  if (chartData.s && chartData.s !== 'ok') throw new Error(`Chart error: ${chartData.s}`);
  return chartData;
}

export function createDeltaClient(baseUrl = PROD_BASE_URL) {
  const base = baseUrl.replace(/\/$/, '');

  return {
    /** Fetch option chain tickers for a given underlying asset (all expiries). */
    getOptionChain(underlyingAssetSymbol) {
      return _get(base, '/v2/tickers', {
        contract_types: 'call_options,put_options',
        underlying_asset_symbols: underlyingAssetSymbol,
      });
    },

    /**
     * Fetch OHLC candlestick data.
     * from / to are Unix timestamps in seconds.
     * Resolution is in minutes (e.g. 1, 5, 15, 30, 60, 240, 1440).
     */
    getOhlcCandles(symbol, resolution, fromSec, toSec) {
      const markSymbol = symbol.startsWith('MARK:') ? symbol : `MARK:${symbol}`;
      return _getChartHistory(base, '/v2/chart/history', {
        symbol: markSymbol,
        resolution,
        from: String(fromSec),
        to:   String(toSec),
        cache_ttl: '10m',
      });
    },
  };
}
