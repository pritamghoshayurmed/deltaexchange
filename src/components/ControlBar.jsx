import { useState } from 'react';
import { RESOLUTIONS } from '../utils/dataUtils';
import { PROD_BASE_URL, TEST_BASE_URL } from '../api/deltaClient';
import styles from './ControlBar.module.css';
import {
  IconSettings, IconSwap, IconBolt, IconChevronLeft,
  IconChevronRight, IconRefresh,
} from './Icons';

const LOOKBACK_OPTIONS = [1, 2, 4, 6, 12, 24, 48, 72, 168];
const AVAILABLE_ASSETS = ['BTC', 'ETH'];

/**
 * Primary control bar — always visible (mobile-first, usable on desktop).
 *
 * Row 1: ⚙ gear  |  Res select  |  Lookback select  |  [Fetch]
 * Row 2: [ASSET⇄]  [CE/PE⇄]  strike-pill  spot-pill
 * Row 3: ‹  symbol-name  ›  (n / total)
 *
 * On gear expand: API url, assets checkboxes, candlestick toggle, min OI
 */
export default function ControlBar({
  settings,
  onChange,
  onFetch,
  loading,
  asset,
  onAssetToggle,
  optType,
  onOptTypeToggle,
  symbols,
  symIdx,
  onSymNav,
  spot,
}) {
  const [open, setOpen] = useState(false);

  function set(key, val) {
    onChange({ ...settings, [key]: val });
  }

  function toggleAssetInSettings(a) {
    const next = settings.assets.includes(a)
      ? settings.assets.filter((x) => x !== a)
      : [...settings.assets, a];
    if (next.length > 0) set('assets', next);
  }

  const sym    = symbols[symIdx] ?? null;
  const strike = sym?.strike;

  return (
    <div className={styles.bar}>

      {/* ── Row 1: Resolution · Lookback · Fetch ─────────────────── */}
      <div className={styles.row}>
        <div className={styles.group}>

          <button
            className={`${styles.iconBtn} ${open ? styles.active : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-label="Settings"
            title="Settings"
          >
            <IconSettings size={15} />
          </button>

          <label className={styles.labelWrap}>
            <span className={styles.hint}>Res</span>
            <select
              className={styles.select}
              value={settings.resolution}
              onChange={(e) => set('resolution', Number(e.target.value))}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.labelWrap}>
            <span className={styles.hint}>LB</span>
            <select
              className={styles.select}
              value={settings.lookbackHours}
              onChange={(e) => set('lookbackHours', Number(e.target.value))}
            >
              {LOOKBACK_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </select>
          </label>

        </div>

        <button className={styles.fetchBtn} onClick={onFetch} disabled={loading}>
          {loading
            ? <span className={styles.fetchSpinner} />
            : <><IconRefresh size={13} /> Fetch</>
          }
        </button>
      </div>

      {/* ── Expanded settings ────────────────────────────────────── */}
      {open && (
        <div className={styles.expanded}>
          <label className={styles.settingsRow}>
            <span className={styles.settingsLabel}>API</span>
            <select
              className={styles.settingsSelect}
              value={settings.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
            >
              <option value={PROD_BASE_URL}>Production (India CDN)</option>
              <option value={TEST_BASE_URL}>Testnet</option>
            </select>
          </label>

          <div className={styles.settingsRow}>
            <span className={styles.settingsLabel}>Assets</span>
            <div className={styles.assetChips}>
              {AVAILABLE_ASSETS.map((a) => (
                <button
                  key={a}
                  className={`${styles.chip} ${settings.assets.includes(a) ? styles.chipOn : ''}`}
                  onClick={() => toggleAssetInSettings(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <label className={`${styles.settingsRow} ${styles.checkRow}`}>
            <input
              type="checkbox"
              checked={settings.candlestick}
              onChange={(e) => set('candlestick', e.target.checked)}
            />
            <span className={styles.settingsLabel}>Fetch candlestick charts</span>
          </label>

          <label className={styles.settingsRow}>
            <span className={styles.settingsLabel}>Min OI</span>
            <input
              type="number"
              className={styles.settingsInput}
              min={0}
              step={1}
              value={settings.minOpenInterest}
              onChange={(e) => set('minOpenInterest', parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      )}

      {/* ── Row 2: Asset · Type · Strike / Spot pills ────────────── */}
      <div className={styles.row}>
        <button className={styles.assetBtn} onClick={onAssetToggle} title="Switch asset">
          {asset}<span className={styles.arrow}><IconSwap size={12} /></span>
        </button>

        <button
          className={`${styles.typeBtn} ${optType === 'call' ? styles.call : styles.put}`}
          onClick={onOptTypeToggle}
          title="Switch option type"
        >
          {optType === 'call' ? 'CE' : 'PE'}<span className={styles.arrow}><IconSwap size={12} /></span>
        </button>

        <div className={styles.pills}>
          {strike != null && (
            <span className={styles.strikePill}>
              <IconBolt size={10} />
              {Number(strike).toLocaleString()}
            </span>
          )}
          {spot != null && (
            <span className={styles.spotPill}>
              <span className={styles.spotDollar}>$</span>{Number(spot).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Row 3: Symbol navigator ──────────────────────────────── */}
      <div className={styles.symRow}>
        <button
          className={styles.navBtn}
          onClick={() => onSymNav(-1)}
          disabled={symIdx <= 0}
          aria-label="Previous symbol"
        >
          <IconChevronLeft size={18} />
        </button>

        <div className={styles.symCenter}>
          <span className={styles.symName}>
            {sym?.symbol ?? (symbols.length === 0 ? 'Tap Fetch to load' : '—')}
          </span>
          {symbols.length > 0 && (
            <span className={styles.symMeta}>
              {symIdx + 1}&thinsp;/&thinsp;{symbols.length}
              <span className={styles.symDot}>·</span>nearest expiry
              <span className={styles.symDot}>·</span>±20 strikes ATM
            </span>
          )}
        </div>

        <button
          className={styles.navBtn}
          onClick={() => onSymNav(1)}
          disabled={symIdx >= symbols.length - 1}
          aria-label="Next symbol"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

    </div>
  );
}
