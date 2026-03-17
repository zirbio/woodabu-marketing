import type { PeriodMetrics } from './insights-store.js';

export interface Projection {
  channel: string;
  metric: string;
  twoWeek: number;
  fourWeek: number;
  disclaimer: string;
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: values[0] ?? 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function computeProjections(metrics: PeriodMetrics[]): Projection[] {
  if (metrics.length === 0) return [];

  const byChannel = new Map<string, PeriodMetrics[]>();
  for (const m of metrics) {
    const arr = byChannel.get(m.channel) ?? [];
    arr.push(m);
    byChannel.set(m.channel, arr);
  }

  const results: Projection[] = [];

  for (const [channel, channelMetrics] of byChannel) {
    const sorted = [...channelMetrics].sort((a, b) => a.period.localeCompare(b.period));

    for (const key of METRIC_KEYS) {
      const values = sorted.map((m) => m[key]).filter((v): v is number => v !== null);
      if (values.length < 3) continue;

      const { slope, intercept } = linearRegression(values);
      const n = values.length;

      results.push({
        channel,
        metric: key,
        twoWeek: Math.round((slope * (n + 1) + intercept) * 100) / 100,
        fourWeek: Math.round((slope * (n + 3) + intercept) * 100) / 100,
        disclaimer: 'This is an estimate based on historical trend. Actual results may vary due to seasonality, market conditions, or strategy changes.',
      });
    }
  }

  return results;
}
