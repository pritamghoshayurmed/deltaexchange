import { useState, useMemo, useEffect } from 'react';
import ControlBar       from './components/ControlBar';
import CandlestickChart from './components/CandlestickChart';
import StrikeChart      from './components/StrikeChart';
import useDeltaData     from './hooks/useDeltaData';
import { createDeltaClient, PROD_BASE_URL } from './api/deltaClient';
import './App.css';

const DEFAULT_SETTINGS = {
  baseUrl:         PROD_BASE_URL,
  assets:          ['BTC', 'ETH'],
  minOpenInterest: 0,
  candlestick:     true,
  resolution:      60,
  lookbackHours:   24,
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
  const asset           = effectiveAssets[assetIdx % effectiveAssets.length] ?? 'BTC';
  const data            = assetData.get(asset) ?? (assets.length > 0 ? assetData.get(assets[0]) : null);

  /* ── Symbols: nearest expiry, ±20 strikes around ATM = max 41 ── */
  const symbols = useMemo(() => {
    if (!data?.records?.length) return [];
    const spot = data.records.find((r) => r.spot_price)?.spot_price ?? 0;

    // 1. Nearest expiry for this option type
    const byType = data.records.filter((r) => r.option_type === optType);
    if (!byType.length) return [];
    const nearestExpiry = byType.reduce(
      (min, r) => (r.expiry_ms < min ? r.expiry_ms : min),
      byType[0].expiry_ms
    );

    // 2. All strikes for that expiry, sorted ascending
    const expiryRecords = byType
      .filter((r) => r.expiry_ms === nearestExpiry)
      .sort((a, b) => a.strike - b.strike);

    // 3. Find ATM index
    let atmIdx = 0;
    let minDist = Infinity;
    expiryRecords.forEach((r, i) => {
      const d = Math.abs(r.strike - spot);
      if (d < minDist) { minDist = d; atmIdx = i; }
    });

    // 4. Up to 20 below ATM + ATM + up to 20 above ATM = max 41
    const start = Math.max(0, atmIdx - 20);
    const end   = Math.min(expiryRecords.length, atmIdx + 21);
    return expiryRecords.slice(start, end);
  }, [data, optType]);

  /* ── Reset symbol index on asset / option type change ── */
  useEffect(() => { setSymIdx(0); }, [asset, optType]);
  useEffect(() => { if (!loading) setSymIdx(0); }, [loading]);

  const symbol        = symbols[symIdx] ?? null;
  const spot          = data?.records?.find((r) => r.spot_price)?.spot_price ?? null;
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
    const startSec = nowSec - settings.lookbackHours * 3600;

    client
      .getOhlcCandles(symbol.symbol, settings.resolution, startSec, nowSec)
      .then((cd) => {
        if (!cancelled)
          setCandleData({ symbol: symbol.symbol, option_type: symbol.option_type, chartData: cd });
      })
      .catch(() => {
        if (!cancelled)
          setCandleData({ symbol: symbol.symbol, option_type: symbol.option_type, chartData: null });
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
          {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
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
              asset={asset}
              symbol={candleData.symbol}
              optionType={candleData.option_type}
              resolution={settings.resolution}
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
            <div className="empty-icon">📊</div>
            <h2>No data yet</h2>
            <p>Tap <strong>Fetch</strong> to load the option chain.</p>
            <p className="empty-note">Uses the Delta Exchange public REST API — no auth required.</p>
          </div>
        )}

      </div>
    </div>
  );
}
