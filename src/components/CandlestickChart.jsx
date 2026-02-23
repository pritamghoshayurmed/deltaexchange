import { useMemo, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import _HighchartsReact from 'highcharts-react-official';
import { buildCandlestickSeries } from '../utils/dataUtils';

const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;

function buildOptions(symbol, optionType, resolution, chartData) {
  const parsed = buildCandlestickSeries(chartData);
  const label  = optionType === 'call' ? 'CE' : 'PE';

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
        },
        {
          type: 'column',
          name: 'Volume',
          data: parsed.volData,
          color: '#546e7a',
          opacity: 0.8,
          yAxis: 1,
          dataGrouping: { enabled: false },
        },
      ]
    : [{ type: 'candlestick', name: 'No data', data: [] }];

  return {
    chart: {
      backgroundColor: '#131722',
      style: { fontFamily: 'inherit' },
      height: null,   // filled by CSS flex container
      width: null,
      margin: [32, 72, 0, 0],
      spacing: [4, 4, 4, 4],
    },
    rangeSelector: { enabled: false },
    navigator: {
      enabled: true,
      maskFill: 'rgba(38,166,154,0.15)',
      height: 30,
      margin: 6,
      xAxis: { labels: { style: { color: '#9598a1', fontSize: '10px' } } },
    },
    scrollbar: { enabled: false },
    title: { text: '' },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: '#9598a1', fontSize: '10px' } },
      gridLineColor: '#2a2e39',
      lineColor: '#2a2e39',
      tickColor: '#2a2e39',
    },
    yAxis: [
      {
        title: { text: null },
        labels: {
          style: { color: '#9598a1', fontSize: '10px' },
          align: 'left', x: 4, y: 3,
        },
        gridLineColor: '#2a2e39',
        height: '72%',
        resize: { enabled: true, lineColor: '#2a2e39', lineWidth: 1 },
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
      },
      {
        title: { text: null },
        labels: {
          style: { color: '#9598a1', fontSize: '10px' },
          align: 'left', x: 4, y: 3,
          formatter() {
            const v = this.value;
            if (v === 0) return '0';
            return v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);
          },
        },
        gridLineColor: '#2a2e39',
        top: '74%',
        height: '26%',
        offset: 0,
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
        maxPadding: 0.05,
      },
    ],
    tooltip: {
      split: false,
      shared: false,
      backgroundColor: '#1e222d',
      borderColor: '#2a2e39',
      borderRadius: 6,
      shadow: false,
      style: { color: '#d1d4dc', fontSize: '12px' },
      valueDecimals: 2,
    },
    plotOptions: {
      candlestick: { groupPadding: 0.1, pointPadding: 0.02 },
      column:      { groupPadding: 0.05, pointPadding: 0 },
    },
    legend:      { enabled: false },
    credits:     { enabled: false },
    accessibility:{ enabled: false },
    series,
  };
}

export default function CandlestickChart({ asset, symbol, optionType, resolution, chartData }) {
  const chartRef = useRef(null);
  const label    = optionType === 'call' ? 'CE' : 'PE';

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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Header strip */}
      <div style={{
        fontSize: 11, color: '#9598a1', padding: '4px 8px',
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0, overflow: 'hidden', whiteSpace: 'nowrap',
        background: '#1a1d27', borderBottom: '1px solid #2a2e39',
      }}>
        <span style={{ color: optionType === 'call' ? '#26a69a' : '#ef5350', fontWeight: 700 }}>
          {asset} {label}
        </span>
        <span style={{ color: '#5a5e6b' }}>|</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
          {symbol}
        </span>
        <span style={{ color: '#5a5e6b' }}>|</span>
        <span>{resolution}m</span>
        {noData && <span style={{ color: '#ef5350', marginLeft: 4 }}>(no data)</span>}
      </div>

      {/* Chart fills remaining flex height */}
      <div ref={chartRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
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
