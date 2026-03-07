import { useMemo, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import _HighchartsReact from 'highcharts-react-official';
import { buildCandlestickSeries } from '../utils/dataUtils';
import { IconCandlestick } from './Icons';

const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;

function formatFixed(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '';
}

function buildOptions(symbol, optionType, resolution, chartData) {
  const parsed = buildCandlestickSeries(chartData);
  const isCall = optionType === 'call';
  const accentColor = isCall ? '#26a69a' : '#ef5350';
  const rsiColor = '#7f63ff';

  const series = parsed
    ? [
        {
          id: 'price-series',
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
          type: 'line',
          name: 'RSI 14',
          data: parsed.rsiData,
          color: rsiColor,
          yAxis: 1,
          dataGrouping: { enabled: false },
          lineWidth: 1.8,
          marker: { enabled: false },
          states: {
            hover: { lineWidthPlus: 0 },
          },
          lastPrice: {
            enabled: true,
            color: rsiColor,
            label: {
              enabled: true,
              backgroundColor: rsiColor,
              borderColor: rsiColor,
              borderRadius: 4,
              style: { color: '#f5f4ff', fontSize: '10px', fontWeight: 700 },
              padding: 4,
            },
          },
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
      zooming: {
        type: 'x',
        pinchType: 'x',
        mouseWheel: { enabled: true },
      },
      panning: { enabled: true, type: 'x' },
      panKey: 'shift',
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
      minPadding: 0.05,
      maxPadding: 0.05,
      minRange: resolution * 5 * 60 * 1000,
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
        height: '74%',
        resize: {
          enabled: true,
          lineColor: '#2e3248',
          lineWidth: 1,
        },
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
        // Prevent Highcharts from auto-rescaling the price axis on X-pan/zoom
        startOnTick: false,
        endOnTick: false,
        minPadding: 0,
        maxPadding: 0,
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
            formatter() { return formatFixed(this.value, 2); },
          },
        },
      },
      {
        title: {
          text: 'RSI 14',
          align: 'high',
          offset: 0,
          rotation: 0,
          x: -10,
          y: 12,
          style: { color: '#9b8cff', fontSize: '10px', fontWeight: 600 },
        },
        labels: {
          style: { color: '#8c84ae', fontSize: '9px' },
          align: 'left', x: 5, y: 3,
          formatter() { return formatFixed(this.value, 2); },
        },
        gridLineColor: '#141720',
        top: '76%',
        height: '24%',
        offset: 0,
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
        min: 20,
        max: 100,
        startOnTick: false,
        endOnTick: false,
        minPadding: 0,
        maxPadding: 0,
        tickPositions: [20, 30, 40, 50, 60, 70, 80],
        plotBands: [
          {
            from: 20,
            to: 100,
            color: 'rgba(89, 70, 164, 0.12)',
          },
        ],
        plotLines: [
          { value: 30, color: '#8577c9', width: 1, dashStyle: 'Dash' },
          { value: 50, color: '#3a2f66', width: 1, dashStyle: 'Dot' },
          { value: 70, color: '#8577c9', width: 1, dashStyle: 'Dash' },
        ],
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
        return `RSI 14: <b>${Number(this.y).toFixed(2)}</b>`;
      },
    },
    plotOptions: {
      candlestick: {
        groupPadding: 0.08,
        pointPadding: 0.02,
        lineWidth: 1.5,
      },
      series: {
        animation: false,
        turboThreshold: 0,
      },
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

    const container = chart.container;
    container.style.touchAction = 'none';

    let pinchState = null;

    function normalizeTouch(touch) {
      return chart.pointer.normalize(touch);
    }

    function clampRange(axis, nextMin, nextMax) {
      const extremes = axis.getExtremes();
      const totalRange = Math.max((extremes.dataMax ?? 0) - (extremes.dataMin ?? 0), axis.minRange || 1);
      const minRange = axis.minRange || axis.options.minRange || 1;
      const range = Math.min(Math.max(nextMax - nextMin, minRange), totalRange);

      let min = nextMin;
      let max = min + range;

      if (extremes.dataMin != null && min < extremes.dataMin) {
        min = extremes.dataMin;
        max = min + range;
      }
      if (extremes.dataMax != null && max > extremes.dataMax) {
        max = extremes.dataMax;
        min = max - range;
      }

      return { min, max };
    }

    function handleTouchStart(event) {
      if (event.touches.length !== 2) {
        pinchState = null;
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const axis = chart.xAxis[0];
      const first = normalizeTouch(event.touches[0]);
      const second = normalizeTouch(event.touches[1]);
      const midpoint = (first.chartX + second.chartX) / 2;
      const currentRatio = Math.min(Math.max((midpoint - chart.plotLeft) / chart.plotWidth, 0), 1);
      const { min, max } = axis.getExtremes();

      pinchState = {
        axis,
        startDistance: Math.max(Math.abs(first.chartX - second.chartX), 8),
        startMin: min,
        startMax: max,
        startRange: max - min,
        startRatio: currentRatio,
      };
    }

    function handleTouchMove(event) {
      if (!pinchState || event.touches.length !== 2) return;

      event.preventDefault();
      event.stopPropagation();

      const first = normalizeTouch(event.touches[0]);
      const second = normalizeTouch(event.touches[1]);
      const distance = Math.max(Math.abs(first.chartX - second.chartX), 8);
      const midpoint = (first.chartX + second.chartX) / 2;
      const currentRatio = Math.min(Math.max((midpoint - chart.plotLeft) / chart.plotWidth, 0), 1);
      const scale = pinchState.startDistance / distance;
      const nextRange = pinchState.startRange * scale;
      const anchorValue = pinchState.startMin + pinchState.startRange * currentRatio;
      const rawMin = anchorValue - nextRange * currentRatio;
      const rawMax = anchorValue + nextRange * (1 - currentRatio);
      const { min, max } = clampRange(pinchState.axis, rawMin, rawMax);

      pinchState.axis.setExtremes(min, max, true, false, { trigger: 'pinch' });
    }

    function handleTouchEnd(event) {
      if (pinchState && event) {
        event.stopPropagation();
      }
      if (pinchState && chart.pointer) {
        chart.pointer.hasDragged = false;
      }
      pinchState = null;
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true, capture: true });

    const origDestroy = chart.destroy.bind(chart);
    chart.destroy = () => {
      container.removeEventListener('touchstart', handleTouchStart, true);
      container.removeEventListener('touchmove', handleTouchMove, true);
      container.removeEventListener('touchend', handleTouchEnd, true);
      container.removeEventListener('touchcancel', handleTouchEnd, true);
      origDestroy();
    };
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

