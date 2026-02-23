import { useMemo, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import _HighchartsReact from 'highcharts-react-official';
import { buildCandlestickSeries } from '../utils/dataUtils';
import { IconCandlestick } from './Icons';

const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;

function buildOptions(symbol, optionType, resolution, chartData) {
  const parsed = buildCandlestickSeries(chartData);
  const isCall = optionType === 'call';
  const accentColor = isCall ? '#26a69a' : '#ef5350';

  const series = parsed
    ? [
        {
          type: 'candlestick',
          name: symbol,
          data: parsed.ohlcData,
          upColor:     '#26a69a',
          color:       '#ef5350',
          upLineColor: '#26a69a',
          lineColor:   '#ef5350',
          dataGrouping: { enabled: false },
          yAxis: 0,
          states: {
            hover: { lineWidth: 2 },
          },
        },
        {
          type: 'column',
          name: 'Volume',
          data: parsed.volData,
          color: 'rgba(84,110,122,0.55)',
          yAxis: 1,
          dataGrouping: { enabled: false },
          borderWidth: 0,
          pointPadding: 0.05,
          groupPadding: 0.03,
        },
      ]
    : [{ type: 'candlestick', name: 'No data', data: [] }];

  const resLabel = resolution >= 60 ? `${resolution / 60}h` : `${resolution}m`;

  return {
    chart: {
      backgroundColor: '#0f1119',
      style: { fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' },
      height: null,
      width: null,
      margin: [24, 68, 0, 0],
      spacing: [4, 4, 4, 4],
      animation: { duration: 200 },
      plotBorderColor: '#1e2236',
      plotBorderWidth: 0,
    },
    rangeSelector: { enabled: false },
    navigator: {
      enabled: true,
      maskFill: `rgba(${isCall ? '38,166,154' : '239,83,80'},0.1)`,
      outlineColor: '#2a2e3e',
      outlineWidth: 1,
      height: 28,
      margin: 8,
      handles: {
        backgroundColor: '#2a2e3e',
        borderColor: '#4a5070',
      },
      series: {
        type: 'line',
        color: accentColor,
        lineWidth: 1,
        fillOpacity: 0.04,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${accentColor}20`],
            [1, `${accentColor}00`],
          ],
        },
      },
      xAxis: { labels: { style: { color: '#4a4e5e', fontSize: '9px' } } },
    },
    scrollbar: { enabled: false },
    title: { text: '' },
    xAxis: {
      type: 'datetime',
      labels: {
        style: { color: '#737890', fontSize: '10px' },
        format: '{value:%b %d<br>%H:%M}',
      },
      gridLineColor: '#1a1e2e',
      gridLineWidth: 1,
      lineColor: '#2a2e3e',
      tickColor: '#2a2e3e',
      crosshair: {
        color: '#3a4060',
        width: 1,
        dashStyle: 'Dot',
      },
    },
    yAxis: [
      {
        title: { text: null },
        labels: {
          style: { color: '#737890', fontSize: '10px' },
          align: 'left', x: 5, y: 3,
          formatter() {
            const v = this.value;
            if (v >= 10000) return (v / 1000).toFixed(0) + 'k';
            if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
            return String(v);
          },
        },
        gridLineColor: '#1a1e2e',
        height: '72%',
        resize: {
          enabled: true,
          lineColor: '#2e3248',
          lineWidth: 1,
        },
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
        crosshair: {
          color: '#3a4060',
          width: 1,
          dashStyle: 'Dot',
          snap: false,
          label: {
            enabled: true,
            backgroundColor: '#2a2e3e',
            borderRadius: 4,
            style: { color: '#c8cbda', fontSize: '10px' },
            formatter() { return this.value.toFixed(2); },
          },
        },
      },
      {
        title: { text: null },
        labels: {
          style: { color: '#4a4e5e', fontSize: '9px' },
          align: 'left', x: 5, y: 3,
          formatter() {
            const v = this.value;
            if (v === 0) return '0';
            return v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);
          },
        },
        gridLineColor: '#141720',
        top: '74%',
        height: '26%',
        offset: 0,
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
        maxPadding: 0.08,
      },
    ],
    tooltip: {
      split: false,
      shared: false,
      useHTML: true,
      backgroundColor: '#1a1e2c',
      borderColor: '#2e3248',
      borderRadius: 8,
      borderWidth: 1,
      shadow: { color: 'rgba(0,0,0,0.5)', offsetX: 0, offsetY: 4, opacity: 0.4, width: 12 },
      style: { color: '#c8cbda', fontSize: '12px' },
      formatter() {
        const p = this.point;
        if (p.open !== undefined) {
          const color = p.close >= p.open ? '#26a69a' : '#ef5350';
          const chg = p.open > 0 ? ((p.close - p.open) / p.open * 100).toFixed(2) : '—';
          const dt = Highcharts.dateFormat('%b %d %H:%M', this.x);
          return `
            <div style="font-size:10px;color:#4a4e5e;margin-bottom:5px">${dt}</div>
            <table style="border-collapse:collapse;font-size:11px">
              <tr><td style="color:#4a4e5e;padding-right:8px">O</td><td style="color:#c8cbda">${p.open.toFixed(2)}</td></tr>
              <tr><td style="color:#4a4e5e">H</td><td style="color:#26a69a">${p.high.toFixed(2)}</td></tr>
              <tr><td style="color:#4a4e5e">L</td><td style="color:#ef5350">${p.low.toFixed(2)}</td></tr>
              <tr><td style="color:#4a4e5e">C</td><td style="color:${color};font-weight:700">${p.close.toFixed(2)}</td></tr>
            </table>
            <div style="margin-top:4px;font-size:10px;color:${color}">${chg > 0 ? '+' : ''}${chg}%</div>
          `;
        }
        return `Vol: <b>${this.y}</b>`;
      },
    },
    plotOptions: {
      candlestick: {
        groupPadding: 0.08,
        pointPadding: 0.02,
        lineWidth: 1.5,
      },
      column: { borderRadius: 0 },
    },
    legend:      { enabled: false },
    credits:     { enabled: false },
    accessibility:{ enabled: false },
    series,
  };
}

export default function CandlestickChart({ asset, symbol, optionType, resolution, chartData }) {
  const chartRef = useRef(null);
  const isCall   = optionType === 'call';
  const label    = isCall ? 'CE' : 'PE';
  const accentColor = isCall ? '#26a69a' : '#ef5350';
  const resLabel = resolution >= 60 ? `${resolution / 60}h` : `${resolution}m`;

  const onChartCreated = useCallback((chart) => {
    requestAnimationFrame(() => {
      try { chart.reflow(); } catch (_) {/* ignore */}
    });
  }, []);

  const options = useMemo(
    () => buildOptions(symbol, optionType, resolution, chartData),
    [symbol, optionType, resolution, chartData]
  );

  const noData = !chartData || !chartData.t?.length;
  const candleCount = chartData?.t?.length ?? 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* ── Header strip ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px 5px 12px',
        background: 'linear-gradient(180deg, #181b27 0%, #131622 100%)',
        borderBottom: '1px solid #1e2236',
        flexShrink: 0,
        gap: 8,
        overflow: 'hidden',
      }}>
        {/* Left: icon + type + symbol */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden' }}>
          <span style={{ flexShrink: 0, color: accentColor, display: 'flex', alignItems: 'center' }}>
            <IconCandlestick size={15} color={accentColor} />
          </span>
          <span style={{
            color: accentColor,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}>
            {asset} {label}
          </span>
          <span style={{ color: '#2a2e3e', fontSize: 10 }}>│</span>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: 'Courier New, monospace',
            fontSize: 11,
            color: '#9ea3b8',
            whiteSpace: 'nowrap',
          }}>
            {symbol}
          </span>
        </div>
        {/* Right: resolution + candle count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            background: '#1a1e2c',
            border: '1px solid #2a2e3e',
            borderRadius: 5,
            padding: '2px 7px',
            fontSize: 10,
            color: '#737890',
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}>
            {resLabel}
          </span>
          {noData
            ? <span style={{ color: '#ef5350', fontSize: 10, fontWeight: 600 }}>NO DATA</span>
            : <span style={{ color: '#4a4e5e', fontSize: 10 }}>{candleCount} candles</span>
          }
        </div>
      </div>

      {/* ── Chart fills remaining flex height ── */}
      <div ref={chartRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#0f1119' }}>
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          constructorType="stockChart"
          containerProps={{ style: { position: 'absolute', inset: 0 } }}
          callback={onChartCreated}
        />
      </div>
    </div>
  );
}

