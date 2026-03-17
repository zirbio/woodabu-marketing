import type { PeriodMetrics } from './insights-store.js';

export interface Correlation {
  metricA: string;
  metricB: string;
  coefficient: number;
  interpretation: string;
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;
const MIN_PERIODS = 5;

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

export function computeCorrelations(metrics: PeriodMetrics[]): Correlation[] {
  if (metrics.length === 0) return [];

  const periods = new Set(metrics.map((m) => m.period));
  if (periods.size < MIN_PERIODS) return [];

  const sortedPeriods = [...periods].sort();

  // Build time series per channel:metric
  const series = new Map<string, Map<string, number>>();
  for (const m of metrics) {
    for (const key of METRIC_KEYS) {
      const val = m[key];
      if (val === null) continue;
      const label = `${m.channel}:${key}`;
      if (!series.has(label)) series.set(label, new Map());
      series.get(label)!.set(m.period, val);
    }
  }

  // Filter to series with enough data points and non-zero variance
  const validSeries: Array<{ label: string; periodMap: Map<string, number> }> = [];
  for (const [label, periodMap] of series) {
    const values = sortedPeriods.map((p) => periodMap.get(p)).filter((v): v is number => v !== undefined);
    if (values.length < MIN_PERIODS) continue;
    const allSame = values.every((v) => v === values[0]);
    if (allSame) continue;
    validSeries.push({ label, periodMap });
  }

  const results: Correlation[] = [];

  for (let i = 0; i < validSeries.length; i++) {
    for (let j = i + 1; j < validSeries.length; j++) {
      const a = validSeries[i];
      const b = validSeries[j];
      // Skip same-channel correlations
      const channelA = a.label.split(':')[0];
      const channelB = b.label.split(':')[0];
      if (channelA === channelB) continue;

      // Align on common periods
      const alignedA: number[] = [];
      const alignedB: number[] = [];
      for (const period of sortedPeriods) {
        const aVal = a.periodMap.get(period);
        const bVal = b.periodMap.get(period);
        if (aVal !== undefined && bVal !== undefined) {
          alignedA.push(aVal);
          alignedB.push(bVal);
        }
      }
      if (alignedA.length < MIN_PERIODS) continue;
      const r = pearson(alignedA, alignedB);

      if (Math.abs(r) > 0.7) {
        const direction = r > 0 ? 'positive' : 'negative';
        results.push({
          metricA: a.label,
          metricB: b.label,
          coefficient: Math.round(r * 1000) / 1000,
          interpretation: `Strong ${direction} correlation (r=${r.toFixed(2)}): when ${a.label} increases, ${b.label} ${r > 0 ? 'also increases' : 'decreases'}.`,
        });
      }
    }
  }

  return results;
}
