import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { validateHeadline, validateDescription, validateRsaBatch } from '../../utils/validators.js';
import { InsightsStore } from '../../analytics/insights-store.js';
import { checkMetaTokenExpiry } from '../../utils/auth.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Boundary Value Analysis', () => {
  describe('headline character limits', () => {
    it('0 chars → invalid (empty)', () => {
      expect(validateHeadline('').valid).toBe(false);
    });

    it('1 char → valid', () => {
      expect(validateHeadline('A').valid).toBe(true);
    });

    it('27 chars → valid, no warning', () => {
      const r = validateHeadline('A'.repeat(27));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeUndefined();
    });

    it('28 chars → valid, warning', () => {
      const r = validateHeadline('A'.repeat(28));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it('29 chars → valid, warning', () => {
      const r = validateHeadline('A'.repeat(29));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it('30 chars → valid, warning', () => {
      const r = validateHeadline('A'.repeat(30));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it('31 chars → invalid', () => {
      expect(validateHeadline('A'.repeat(31)).valid).toBe(false);
    });
  });

  describe('description character limits', () => {
    it('0 chars → invalid', () => {
      expect(validateDescription('').valid).toBe(false);
    });

    it('1 char → valid', () => {
      expect(validateDescription('A').valid).toBe(true);
    });

    it('87 chars → valid, no warning', () => {
      const r = validateDescription('A'.repeat(87));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeUndefined();
    });

    it('88 chars → valid, warning', () => {
      const r = validateDescription('A'.repeat(88));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it('89 chars → valid, warning', () => {
      const r = validateDescription('A'.repeat(89));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it('90 chars → valid, warning', () => {
      const r = validateDescription('A'.repeat(90));
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it('91 chars → invalid', () => {
      expect(validateDescription('A'.repeat(91)).valid).toBe(false);
    });
  });

  describe('RSA batch counts', () => {
    it('14 headlines → error', () => {
      const r = validateRsaBatch(Array(14).fill('H'), Array(4).fill('D'));
      expect(r.valid).toBe(false);
    });

    it('15 headlines → valid (assuming all individually valid)', () => {
      const r = validateRsaBatch(Array.from({length: 15}, (_, i) => `Headline ${i+1}`), Array.from({length: 4}, (_, i) => `Description number ${i+1} here`));
      expect(r.errors.filter(e => e.includes('headlines')).length).toBe(0);
    });

    it('16 headlines → error', () => {
      const r = validateRsaBatch(Array(16).fill('H'), Array(4).fill('D'));
      expect(r.valid).toBe(false);
    });

    it('3 descriptions → error', () => {
      const r = validateRsaBatch(Array(15).fill('H'), Array(3).fill('D'));
      expect(r.valid).toBe(false);
    });

    it('4 descriptions → valid count', () => {
      const r = validateRsaBatch(Array.from({length: 15}, (_, i) => `H ${i}`), Array.from({length: 4}, (_, i) => `D ${i}`));
      expect(r.errors.filter(e => e.includes('descriptions')).length).toBe(0);
    });

    it('5 descriptions → error', () => {
      const r = validateRsaBatch(Array(15).fill('H'), Array(5).fill('D'));
      expect(r.valid).toBe(false);
    });
  });

  describe('InsightsStore retention', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-insights-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('11 reports → all kept', () => {
      const store = new InsightsStore(tmpDir);
      for (let i = 1; i <= 11; i++) {
        store.save({ date: `2026-${String(i).padStart(2, '0')}-01`, type: 'weekly', channels: {}, recommendations: [] });
      }
      expect(fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'))).toHaveLength(11);
    });

    it('12 reports → all kept', () => {
      const store = new InsightsStore(tmpDir);
      for (let i = 1; i <= 12; i++) {
        store.save({ date: `2026-${String(i).padStart(2, '0')}-01`, type: 'weekly', channels: {}, recommendations: [] });
      }
      expect(fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'))).toHaveLength(12);
    });

    it('13 reports → oldest deleted, 12 remain', () => {
      const store = new InsightsStore(tmpDir);
      for (let i = 1; i <= 13; i++) {
        const month = ((i - 1) % 12) + 1;
        const year = i <= 12 ? 2025 : 2026;
        store.save({ date: `${year}-${String(month).padStart(2, '0')}-01`, type: 'weekly', channels: {}, recommendations: [] });
      }
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(12);
    });
  });

  describe('Meta token expiry boundaries', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('8 days remaining → ok', () => {
      vi.setSystemTime(new Date('2026-05-07'));
      expect(checkMetaTokenExpiry('2026-05-15').status).toBe('ok');
    });

    it('7 days remaining → warning', () => {
      vi.setSystemTime(new Date('2026-05-08'));
      expect(checkMetaTokenExpiry('2026-05-15').status).toBe('warning');
    });

    it('1 day remaining → warning', () => {
      vi.setSystemTime(new Date('2026-05-14'));
      expect(checkMetaTokenExpiry('2026-05-15').status).toBe('warning');
    });

    it('0 days remaining → expired', () => {
      vi.setSystemTime(new Date('2026-05-15'));
      expect(checkMetaTokenExpiry('2026-05-15').status).toBe('expired');
    });

    it('-1 days remaining → expired', () => {
      vi.setSystemTime(new Date('2026-05-16'));
      const result = checkMetaTokenExpiry('2026-05-15');
      expect(result.status).toBe('expired');
      expect(result.daysRemaining).toBeLessThan(0);
    });
  });
});
