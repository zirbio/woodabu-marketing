import { describe, it, expect } from 'vitest';
import { detectTrends } from './trends.js';
import type { PeriodMetrics } from './insights-store.js';

describe('detectTrends', () => {
  it('detects rising trend when values increase', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-13', channel: 'meta', spend: 120, conversions: 14, sessions: null, roas: 2.3 },
      { period: '2026-01-20', channel: 'meta', spend: 140, conversions: 18, sessions: null, roas: 2.6 },
      { period: '2026-01-27', channel: 'meta', spend: 160, conversions: 22, sessions: null, roas: 2.9 },
    ];
    const trends = detectTrends(metrics);
    const spendTrend = trends.find((t) => t.metric === 'spend' && t.channel === 'meta');
    expect(spendTrend?.direction).toBe('rising');
  });

  it('detects falling trend when values decrease', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'meta', spend: 200, conversions: 20, sessions: null, roas: 3.0 },
      { period: '2026-01-13', channel: 'meta', spend: 180, conversions: 16, sessions: null, roas: 2.5 },
      { period: '2026-01-20', channel: 'meta', spend: 150, conversions: 12, sessions: null, roas: 2.0 },
      { period: '2026-01-27', channel: 'meta', spend: 120, conversions: 8, sessions: null, roas: 1.5 },
    ];
    const trends = detectTrends(metrics);
    const roasTrend = trends.find((t) => t.metric === 'roas' && t.channel === 'meta');
    expect(roasTrend?.direction).toBe('falling');
  });

  it('returns stable when values are flat', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-13', channel: 'meta', spend: 101, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-20', channel: 'meta', spend: 99, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-27', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
    ];
    const trends = detectTrends(metrics);
    const convTrend = trends.find((t) => t.metric === 'conversions' && t.channel === 'meta');
    expect(convTrend?.direction).toBe('stable');
  });

  it('skips null values in metrics', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'ga4', spend: null, conversions: 50, sessions: 500, roas: null },
      { period: '2026-01-13', channel: 'ga4', spend: null, conversions: 60, sessions: 600, roas: null },
      { period: '2026-01-20', channel: 'ga4', spend: null, conversions: 70, sessions: 700, roas: null },
    ];
    const trends = detectTrends(metrics);
    expect(trends.find((t) => t.metric === 'spend')).toBeUndefined();
    expect(trends.find((t) => t.metric === 'sessions' && t.channel === 'ga4')).toBeDefined();
  });

  it('returns empty array for empty input', () => {
    expect(detectTrends([])).toEqual([]);
  });
});
