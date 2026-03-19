import { useState, useMemo, useEffect } from 'react';
import ControlBar       from './components/ControlBar';
import CandlestickChart from './components/CandlestickChart';
import StrikeChart      from './components/StrikeChart';
import useDeltaData     from './hooks/useDeltaData';
import { createDeltaClient, PROD_BASE_URL } from './api/deltaClient';
import { IconAlertTriangle, IconBarChart } from './components/Icons';
import './App.css';

const DEFAULT_SETTINGS = {
  baseUrl:         PROD_BASE_URL,
  assets:          ['ETH', 'BTC'],
  minOpenInterest: 0,
  candlestick:     true,
  resolution:      240,
  lookbackHours:   720,
  topPerType:      5,
};

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [assetIdx, setAssetIdx] = useState(0);
  const [optType,  setOptType]  = useState('call');
  const [symIdx,   setSymIdx]   = useState(0);

  // On-demand candle state
  const [candleData,    setCandleData]    = useState(null);
  const [candleLoading, setCandleLoading] = useState(false);
  const [fetchVersion,  setFetchVersion]  = useState(0);

  const { assetData, loading, errors, fetchAll } = useDeltaData();

  /* ── Fetch ── */
  async function handleFetch() {
    await fetchAll(settings);
    setAssetIdx(0);
    setSymIdx(0);
    setCandleData(null);
    setFetchVersion((v) => v + 1);
  }

  /* ── Derived data ── */
  const assets          = [...assetData.keys()];
  const effectiveAssets = assets.length > 0 ? assets : settings.assets;
  const asset           = effectiveAssets[assetIdx % effectiveAssets.length] ?? 'ETH';
  const data            = assetData.get(asset) ?? (assets.length > 0 ? assetData.get(assets[0]) : null);

  /* ── Symbols: expiry chosen for configured lookback, ±20 strikes around ATM = max 41 ── */
  const symbols = useMemo(() => {
    if (!data?.records?.length) return [];
    const spot = data.records.find((r) => r.spot_price)?.spot_price ?? 0;

    // 1. Pick an expiry that is far enough out for the selected lookback.
    //    If none match, fall back to the farthest listed expiry.
    const byType = data.records.filter((r) => r.option_type === optType);
    if (!byType.length) return [];

    const nowMs = Date.now();
    const minExpiryForLookback = nowMs + settings.lookbackHours * 3600 * 1000;
    const expiries = [...new Set(byType.map((r) => r.expiry_ms))].sort((a, b) => a - b);
    const targetExpiry = expiries.find((expiryMs) => expiryMs >= minExpiryForLookback)
      ?? expiries[expiries.length - 1];

    // 2. All strikes for that expiry, sorted ascending
    const expiryRecords = byType
      .filter((r) => r.expiry_ms === targetExpiry)
      .sort((a, b) => a.strike - b.strike);

    // 3. Find ATM index
    let atmIdx = 0;
    let minDist = Infinity;
    expiryRecords.forEach((r, i) => {
      const d = Math.abs(r.strike - spot);
      if (d < minDist) { minDist = d; atmIdx = i; }
    });

    // 4. Up to 20 below ATM + ATM + up to 20 above ATM = max 41
    //    Rebalance: if ATM is near an edge, extend the opposite side
    const TARGET = 41;
    let start = Math.max(0, atmIdx - 20);
    let end   = Math.min(expiryRecords.length, atmIdx + 21);
    const have = end - start;
    if (have < Math.min(TARGET, expiryRecords.length)) {
      if (start === 0) {
        end = Math.min(expiryRecords.length, TARGET);
      } else {
        start = Math.max(0, end - TARGET);
      }
    }
    return expiryRecords.slice(start, end);
  }, [data, optType, settings.lookbackHours]);

  /* ── Reset symbol index on asset / option type change ── */
  useEffect(() => { setSymIdx(0); }, [asset, optType]);
  useEffect(() => { if (!loading) setSymIdx(0); }, [loading]);

  const symbol        = symbols[symIdx] ?? null;
  const spot          = data?.records?.find((r) => r.spot_price != null)?.spot_price ?? null;
  const strikeRecords = useMemo(
    () => data?.records?.filter((r) => r.option_type === optType) ?? [],
    [data, optType]
  );

  /* ── On-demand candle fetch when symbol changes ── */
  useEffect(() => {
    if (!symbol || !settings.candlestick || !data) {
      setCandleData(null);
      return;
    }
    let cancelled = false;
    setCandleLoading(true);
    setCandleData(null);

    const client   = createDeltaClient(settings.baseUrl);
    const nowSec   = Math.floor(Date.now() / 1000);
    const visibleStartSec = nowSec - settings.lookbackHours * 3600;
    const rsiWarmupSec = settings.resolution * 60 * 14;
    const fetchStartSec = visibleStartSec - rsiWarmupSec;

    client
      .getOhlcCandles(symbol.symbol, settings.resolution, fetchStartSec, nowSec)
      .then((cd) => {
        if (!cancelled)
          setCandleData({
            symbol: symbol.symbol,
            option_type: symbol.option_type,
            visibleFromMs: visibleStartSec * 1000,
            chartData: cd,
          });
      })
      .catch(() => {
        if (!cancelled)
          setCandleData({
            symbol: symbol.symbol,
            option_type: symbol.option_type,
            visibleFromMs: visibleStartSec * 1000,
            chartData: null,
          });
      })
      .finally(() => { if (!cancelled) setCandleLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol?.symbol, settings.resolution, settings.lookbackHours, settings.baseUrl, settings.candlestick, fetchVersion]);

  return (
    <div className="app">

      <ControlBar
        settings={settings}
        onChange={setSettings}
        onFetch={handleFetch}
        loading={loading}
        asset={asset}
        onAssetToggle={() => setAssetIdx((i) => (i + 1) % effectiveAssets.length)}
        optType={optType}
        onOptTypeToggle={() => setOptType((t) => (t === 'call' ? 'put' : 'call'))}
        symbols={symbols}
        symIdx={symIdx}
        onSymNav={(dir) => setSymIdx((i) => Math.max(0, Math.min(symbols.length - 1, i + dir)))}
        spot={spot}
      />

      {/* Error banner */}
      {errors.length > 0 && (
        <div className="banner-error">
          {errors.map((e, i) => (
            <div key={i} className="banner-error-row">
              <IconAlertTriangle size={13} color="#ef5350" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Summary strip — shows after data loads */}
      {!loading && data && (
        <div className="summary-strip">
          <div className="summary-item">
            <span className="s-label">Asset</span>
            <span className="s-value">{asset}</span>
          </div>
          <div className="summary-item">
            <span className="s-label">Type</span>
            <span className={`s-value ${optType === 'call' ? 's-call' : 's-put'}`}>
              {optType === 'call' ? 'CE' : 'PE'}
            </span>
          </div>
          <div className="summary-item">
            <span className="s-label">Spot</span>
            <span className="s-value s-spot">
              {spot != null ? `$${Number(spot).toLocaleString()}` : '—'}
            </span>
          </div>
          <div className="summary-item">
            <span className="s-label">Strikes</span>
            <span className="s-value">{symbols.length}</span>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div className="chart-area">

        {/* Global loading state */}
        {loading && (
          <div className="spinner-wrap">
            <div className="spinner" />
            <span>Fetching option chain…</span>
          </div>
        )}

        {/* Candle chart */}
        {!loading && data && symbol && settings.candlestick && (
          candleLoading ? (
            <div className="spinner-wrap">
              <div className="spinner" />
              <span>Loading chart…</span>
            </div>
          ) : candleData ? (
            <CandlestickChart
              key={candleData.symbol}
              asset={asset}
              symbol={candleData.symbol}
              optionType={candleData.option_type}
              resolution={settings.resolution}
              visibleFromMs={candleData.visibleFromMs}
              chartData={candleData.chartData}
            />
          ) : (
            <div className="no-data">No candle data for this symbol.</div>
          )
        )}

        {/* Strike chart — shown when candlestick disabled or no symbol */}
        {!loading && data && (!settings.candlestick || !symbol) && (
          strikeRecords.length > 0 ? (
            <StrikeChart asset={asset} records={strikeRecords} />
          ) : (
            <div className="no-data">
              No {optType === 'call' ? 'CE' : 'PE'} data for {asset}.
            </div>
          )
        )}

        {/* Empty state */}
        {!loading && !data && (
          <div className="empty">
            <div className="empty-icon">
              <IconBarChart size={48} color="#2a2e3e" />
            </div>
            <h2>No data yet</h2>
            <p>Tap <strong>Fetch</strong> to load the option chain.</p>
            <p className="empty-note">Uses the Delta Exchange public REST API — no auth required.</p>
          </div>
        )}

      </div>
    </div>
  );
}
