import type { PeriodMetrics } from './insights-store.js';

export interface Anomaly {
  metric: string;
  channel: string;
  value: number;
  mean: number;
  stddev: number;
  severity: 'warning' | 'critical';
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function detectAnomalies(current: PeriodMetrics, historical: PeriodMetrics[]): Anomaly[] {
  const sameChannel = historical.filter((m) => m.channel === current.channel);
  if (sameChannel.length < 3) return [];

  const anomalies: Anomaly[] = [];

  for (const key of METRIC_KEYS) {
    const currentVal = current[key];
    if (currentVal === null) continue;

    const historicalVals = sameChannel.map((m) => m[key]).filter((v): v is number => v !== null);
    if (historicalVals.length < 3) continue;

    const avg = mean(historicalVals);
    const sd = stddev(historicalVals, avg);
    if (sd === 0) continue;

    const zScore = Math.abs((currentVal - avg) / sd);
    if (zScore > 2) {
      anomalies.push({
        metric: key,
        channel: current.channel,
        value: currentVal,
        mean: avg,
        stddev: sd,
        severity: zScore > 3 ? 'critical' : 'warning',
      });
    }
  }

  return anomalies;
}
