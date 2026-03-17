import { describe, it, expect } from 'vitest';
import { computeCorrelations } from './correlations.js';
import type { PeriodMetrics } from './insights-store.js';

function makeMetrics(channel: string, periods: number, values: Record<string, number[]>): PeriodMetrics[] {
  return Array.from({ length: periods }, (_, i) => ({
    period: `2026-01-${String(i + 1).padStart(2, '0')}`,
    channel,
    spend: values.spend?.[i] ?? null,
    conversions: values.conversions?.[i] ?? null,
    sessions: values.sessions?.[i] ?? null,
    roas: values.roas?.[i] ?? null,
  }));
}

describe('computeCorrelations', () => {
  it('detects strong positive correlation', () => {
    const meta = makeMetrics('meta', 6, { spend: [100, 200, 300, 400, 500, 600] });
    const ga4 = makeMetrics('ga4', 6, { sessions: [50, 100, 150, 200, 250, 300] });
    const results = computeCorrelations([...meta, ...ga4]);
    const found = results.find((r) => r.metricA.includes('meta') && r.metricB.includes('ga4'));
    expect(found).toBeDefined();
    expect(found!.coefficient).toBeGreaterThan(0.9);
  });

  it('returns empty array for fewer than 5 periods', () => {
    const meta = makeMetrics('meta', 3, { spend: [100, 200, 300] });
    const ga4 = makeMetrics('ga4', 3, { sessions: [50, 100, 150] });
    expect(computeCorrelations([...meta, ...ga4])).toEqual([]);
  });

  it('skips zero-variance vectors', () => {
    const meta = makeMetrics('meta', 6, { spend: [100, 100, 100, 100, 100, 100] });
    const ga4 = makeMetrics('ga4', 6, { sessions: [50, 100, 150, 200, 250, 300] });
    const results = computeCorrelations([...meta, ...ga4]);
    expect(results.find((r) => r.metricA === 'meta:spend')).toBeUndefined();
  });

  it('only returns correlations with |r| > 0.7', () => {
    const meta = makeMetrics('meta', 6, { spend: [100, 300, 200, 500, 150, 400] });
    const ga4 = makeMetrics('ga4', 6, { sessions: [200, 100, 300, 50, 250, 150] });
    const results = computeCorrelations([...meta, ...ga4]);
    for (const r of results) {
      expect(Math.abs(r.coefficient)).toBeGreaterThan(0.7);
    }
  });

  it('returns empty array for empty input', () => {
    expect(computeCorrelations([])).toEqual([]);
  });
});
