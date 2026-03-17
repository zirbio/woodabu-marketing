import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InsightsStore } from './insights-store.js';
import type { InsightReport } from './insights-store.js';
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

describe('InsightsStore — validation', () => {
  let tmpDir: string;
  let store: InsightsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-val-'));
    store = new InsightsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects invalid date format: "not-a-date"', () => {
    expect(() => store.save({ date: 'not-a-date', type: 'weekly', channels: {}, recommendations: [] })).toThrow('Invalid date format');
  });

  it('rejects invalid date format: "2026/03/15"', () => {
    expect(() => store.save({ date: '2026/03/15', type: 'weekly', channels: {}, recommendations: [] })).toThrow('Invalid date format');
  });

  it('rejects invalid date format: "15-03-2026"', () => {
    expect(() => store.save({ date: '15-03-2026', type: 'weekly', channels: {}, recommendations: [] })).toThrow('Invalid date format');
  });

  it('rejects invalid report type', () => {
    expect(() => store.save({ date: '2026-03-15', type: 'invalid' as any, channels: {}, recommendations: [] })).toThrow('Invalid report type');
  });

  it('rejects date with path traversal: "../../../etc/passwd"', () => {
    expect(() => store.save({ date: '../../../etc/passwd', type: 'weekly', channels: {}, recommendations: [] })).toThrow('Invalid date format');
  });
});

describe('InsightsStore — getLatest edge cases', () => {
  let tmpDir: string;
  let store: InsightsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-latest-'));
    store = new InsightsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no files exist', () => {
    const result = store.getLatest(5);
    expect(result).toEqual([]);
  });

  it('handles count greater than available files', () => {
    store.save({ date: '2026-03-15', type: 'weekly', channels: {}, recommendations: [] });
    const result = store.getLatest(100);
    expect(result).toHaveLength(1);
  });

  it('throws on corrupted JSON file', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-03-15-weekly.json'), 'not json', 'utf-8');
    expect(() => store.getLatest(1)).toThrow();
  });

  it('throws on file that fails isInsightReport type guard', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-03-15-weekly.json'), JSON.stringify({ wrong: 'shape' }), 'utf-8');
    expect(() => store.getLatest(1)).toThrow('Invalid insight report format');
  });
});

describe('InsightsStore — atomic writes', () => {
  let tmpDir: string;
  let store: InsightsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-atomic-'));
    store = new InsightsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('file exists after save (no orphaned .tmp)', () => {
    store.save({ date: '2026-03-15', type: 'weekly', channels: {}, recommendations: [] });
    const files = fs.readdirSync(tmpDir);
    expect(files).toContain('2026-03-15-weekly.json');
    expect(files.filter(f => f.endsWith('.tmp'))).toEqual([]);
  });
});

describe('InsightsStore — directory creation', () => {
  it('creates directory recursively if it does not exist', () => {
    const deepDir = path.join(os.tmpdir(), `insights-deep-${Date.now()}`, 'a', 'b', 'c');
    const store = new InsightsStore(deepDir);
    store.save({ date: '2026-03-15', type: 'weekly', channels: {}, recommendations: [] });
    expect(fs.existsSync(path.join(deepDir, '2026-03-15-weekly.json'))).toBe(true);
    fs.rmSync(path.join(os.tmpdir(), `insights-deep-${Date.now()}`), { recursive: true, force: true });
  });
});

describe('InsightsStore input validation', () => {
  let tmpDir: string;
  let store: InsightsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-inputval-'));
    store = new InsightsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects invalid date format', () => {
    expect(() => store.save({
      date: '../../etc/passwd',
      type: 'weekly',
      channels: {},
      recommendations: [],
    })).toThrow('Invalid date format');
  });

  it('rejects invalid report type', () => {
    expect(() => store.save({
      date: '2026-03-15',
      type: 'malicious' as 'weekly',
      channels: {},
      recommendations: [],
    })).toThrow('Invalid report type');
  });

  it('rejects malformed JSON files', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-03-15-weekly.json'), 'not json', 'utf-8');
    expect(() => store.getLatest(1)).toThrow();
  });

  it('rejects files with wrong schema', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-03-15-weekly.json'), JSON.stringify({ foo: 'bar' }), 'utf-8');
    expect(() => store.getLatest(1)).toThrow('Invalid insight report format');
  });
});
