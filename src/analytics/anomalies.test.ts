import { describe, it, expect } from 'vitest';
import { detectAnomalies } from './anomalies.js';
import type { PeriodMetrics } from './insights-store.js';

describe('detectAnomalies', () => {
  it('flags value beyond 2 standard deviations as anomaly', () => {
    const historical: PeriodMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      period: `2026-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'meta',
      spend: 100 + (i % 3) * 2,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    }));
    const current: PeriodMetrics = {
      period: '2026-01-15',
      channel: 'meta',
      spend: 300,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    };
    const anomalies = detectAnomalies(current, historical);
    const spendAnomaly = anomalies.find((a) => a.metric === 'spend');
    expect(spendAnomaly).toBeDefined();
    expect(spendAnomaly!.severity).toBe('critical');
  });

  it('does not flag normal values within 2 stddev', () => {
    const historical: PeriodMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      period: `2026-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'meta',
      spend: 95 + i * 2,
      conversions: 10 + (i % 3),
      sessions: null,
      roas: 2.0,
    }));
    const current: PeriodMetrics = {
      period: '2026-01-15',
      channel: 'meta',
      spend: 108,
      conversions: 11,
      sessions: null,
      roas: 2.0,
    };
    const anomalies = detectAnomalies(current, historical);
    expect(anomalies.find((a) => a.metric === 'spend')).toBeUndefined();
  });

  it('skips null metric values', () => {
    const historical: PeriodMetrics[] = Array.from({ length: 5 }, (_, i) => ({
      period: `2026-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'ga4',
      spend: null,
      conversions: 10,
      sessions: 100,
      roas: null,
    }));
    const current: PeriodMetrics = {
      period: '2026-01-10',
      channel: 'ga4',
      spend: null,
      conversions: 10,
      sessions: 500,
      roas: null,
    };
    const anomalies = detectAnomalies(current, historical);
    expect(anomalies.find((a) => a.metric === 'spend')).toBeUndefined();
  });

  it('returns empty for empty historical data', () => {
    const current: PeriodMetrics = {
      period: '2026-01-15',
      channel: 'meta',
      spend: 100,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    };
    expect(detectAnomalies(current, [])).toEqual([]);
  });
});
