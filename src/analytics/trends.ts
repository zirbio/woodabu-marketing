import type { PeriodMetrics } from './insights-store.js';

export interface TrendResult {
  channel: string;
  metric: string;
  direction: 'rising' | 'falling' | 'stable';
  magnitude: number;
  periodCount: number;
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;

function simpleMovingAverageSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const windowSize = Math.min(3, values.length);
  const smaValues: number[] = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    smaValues.push(window.reduce((a, b) => a + b, 0) / windowSize);
  }
  if (smaValues.length < 2) return 0;
  return (smaValues[smaValues.length - 1] - smaValues[0]) / smaValues[0];
}

export function detectTrends(metrics: PeriodMetrics[]): TrendResult[] {
  if (metrics.length === 0) return [];

  const byChannel = new Map<string, PeriodMetrics[]>();
  for (const m of metrics) {
    const arr = byChannel.get(m.channel) ?? [];
    arr.push(m);
    byChannel.set(m.channel, arr);
  }

  const results: TrendResult[] = [];

  for (const [channel, channelMetrics] of byChannel) {
    const sorted = [...channelMetrics].sort((a, b) => a.period.localeCompare(b.period));

    for (const key of METRIC_KEYS) {
      const values = sorted.map((m) => m[key]).filter((v): v is number => v !== null);
      if (values.length < 2) continue;

      const slope = simpleMovingAverageSlope(values);
      const threshold = 0.05;

      let direction: 'rising' | 'falling' | 'stable';
      if (slope > threshold) direction = 'rising';
      else if (slope < -threshold) direction = 'falling';
      else direction = 'stable';

      results.push({ channel, metric: key, direction, magnitude: Math.abs(slope), periodCount: values.length });
    }
  }

  return results;
}
