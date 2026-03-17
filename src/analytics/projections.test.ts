import { describe, it, expect } from 'vitest';
import { computeProjections } from './projections.js';
import type { PeriodMetrics } from './insights-store.js';

describe('computeProjections', () => {
  it('projects increasing trend forward', () => {
    const metrics: PeriodMetrics[] = Array.from({ length: 6 }, (_, i) => ({
      period: `2026-01-${String((i + 1) * 7).padStart(2, '0')}`,
      channel: 'meta',
      spend: 100 + i * 20,
      conversions: 10 + i * 2,
      sessions: null,
      roas: 2.0 + i * 0.2,
    }));
    const results = computeProjections(metrics);
    const spendProj = results.find((p) => p.metric === 'spend' && p.channel === 'meta');
    expect(spendProj).toBeDefined();
    expect(spendProj!.twoWeek).toBeGreaterThan(200);
    expect(spendProj!.fourWeek).toBeGreaterThan(spendProj!.twoWeek);
  });

  it('returns empty for fewer than 3 data points', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-07', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-14', channel: 'meta', spend: 120, conversions: 12, sessions: null, roas: 2.2 },
    ];
    expect(computeProjections(metrics)).toEqual([]);
  });

  it('skips null metrics', () => {
    const metrics: PeriodMetrics[] = Array.from({ length: 4 }, (_, i) => ({
      period: `2026-01-${String((i + 1) * 7).padStart(2, '0')}`,
      channel: 'ga4',
      spend: null,
      conversions: 10 + i * 3,
      sessions: 100 + i * 20,
      roas: null,
    }));
    const results = computeProjections(metrics);
    expect(results.find((p) => p.metric === 'spend')).toBeUndefined();
    expect(results.find((p) => p.metric === 'sessions')).toBeDefined();
  });

  it('includes disclaimer in each projection', () => {
    const metrics: PeriodMetrics[] = Array.from({ length: 4 }, (_, i) => ({
      period: `2026-01-${String((i + 1) * 7).padStart(2, '0')}`,
      channel: 'meta',
      spend: 100 + i * 10,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    }));
    const results = computeProjections(metrics);
    for (const p of results) {
      expect(p.disclaimer).toContain('estimate');
    }
  });
});
