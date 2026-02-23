import { useMemo } from 'react';
import Highcharts from 'highcharts';
import _HighchartsReact from 'highcharts-react-official';
import { buildStrikeSeriesForExpiry, groupByExpiry } from '../utils/dataUtils';

const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;

const METRIC_LABELS = {
  mark_price:    'Mark Price',
  open_interest: 'Open Interest',
  volume:        'Volume',
  delta:         'Delta',
  gamma:         'Gamma',
  theta:         'Theta',
};

function buildOptions(asset, rows, metric, expiryDate) {
  return {
    chart: {
      type: 'line',
      backgroundColor: '#131722',
      style: { fontFamily: 'inherit' },
      height: 300,
    },
    title: {
      text: `${asset} — Expiry ${expiryDate}`,
      style: { color: '#d1d4dc', fontSize: '12px' },
    },
    xAxis: {
      title: { text: 'Strike Price', style: { color: '#9598a1', fontSize: '11px' } },
      labels: { style: { color: '#9598a1', fontSize: '10px' } },
      gridLineColor: '#2a2e39',
      lineColor: '#2a2e39',
      tickColor: '#2a2e39',
    },
    yAxis: {
      title: { text: METRIC_LABELS[metric] ?? metric, style: { color: '#9598a1', fontSize: '11px' } },
      labels: { style: { color: '#9598a1', fontSize: '10px' } },
      gridLineColor: '#2a2e39',
    },
    legend: {
      itemStyle: { color: '#d1d4dc', fontSize: '11px' },
      itemHoverStyle: { color: '#fff' },
    },
    tooltip: {
      backgroundColor: '#1e222d',
      borderColor: '#2a2e39',
      style: { color: '#d1d4dc', fontSize: '12px' },
      formatter() {
        return `<b>Strike:</b> ${this.x.toLocaleString()}<br/><b>${this.series.name}:</b> ${
          typeof this.y === 'number' ? this.y.toFixed(4) : this.y
        }`;
      },
    },
    plotOptions: {
      line: { lineWidth: 2, states: { hover: { lineWidth: 3 } } },
    },
    credits:      { enabled: false },
    accessibility:{ enabled: false },
    series: buildStrikeSeriesForExpiry(rows, metric),
  };
}

export default function StrikeChart({ asset, records, metric = 'mark_price' }) {
  const byExpiry = useMemo(() => {
    return [...groupByExpiry(records).entries()];
  }, [records]);

  if (!byExpiry.length) return null;

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      {byExpiry.map(([ts, rows]) => (
        <div key={ts} style={{ marginBottom: 16 }}>
          <HighchartsReact
            highcharts={Highcharts}
            options={buildOptions(asset, rows, metric, rows[0]?.expiry_date ?? '')}
          />
        </div>
      ))}
    </div>
  );
}
