import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InsightsStore } from './insights-store.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('InsightsStore', () => {
  let tmpDir: string;
  let store: InsightsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-'));
    store = new InsightsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and reads an insight report', () => {
    const report = {
      date: '2026-03-15',
      type: 'weekly' as const,
      channels: {
        google_ads: {
          top_performers: [{ id: 'ad_1', headline: 'Test', ctr: 0.05, roas: 3.0 }],
          patterns: ['Pattern A'],
        },
      },
      recommendations: [{ action: 'increase_budget', target: 'campaign_X', reason: 'High ROAS' }],
    };

    store.save(report);

    const loaded = store.getLatest(1);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].date).toBe('2026-03-15');
    expect(loaded[0].channels.google_ads.patterns).toContain('Pattern A');
  });

  it('returns latest N reports sorted by date desc', () => {
    for (const date of ['2026-03-01', '2026-03-08', '2026-03-15']) {
      store.save({ date, type: 'weekly', channels: {}, recommendations: [] });
    }

    const latest2 = store.getLatest(2);
    expect(latest2).toHaveLength(2);
    expect(latest2[0].date).toBe('2026-03-15');
    expect(latest2[1].date).toBe('2026-03-08');
  });

  it('enforces retention limit of 12 reports', () => {
    for (let i = 1; i <= 14; i++) {
      const date = `2026-${String(i).padStart(2, '0')}-01`;
      store.save({ date, type: 'weekly', channels: {}, recommendations: [] });
    }

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeLessThanOrEqual(12);
  });

  it('does not store PII fields', () => {
    const report = {
      date: '2026-03-15',
      type: 'weekly' as const,
      channels: {},
      recommendations: [],
    };

    store.save(report);
    const raw = fs.readFileSync(path.join(tmpDir, '2026-03-15-weekly.json'), 'utf-8');
    expect(raw).not.toContain('email');
    expect(raw).not.toContain('@');
  });
});
