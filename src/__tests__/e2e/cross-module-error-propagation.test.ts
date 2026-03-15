import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, createGA4Mock, createGoogleAdsMock } from './helpers/msw-server.js';
import { stubAllEnvVars, getEnvVarNames, ALL_ENV_VARS } from './helpers/env-stub.js';
import { createTmpInsightsDir, cleanupTmpInsightsDir } from './helpers/tmp-insights-dir.js';
import {
  headlinesWith3Invalid,
  validDescriptions4,
  validHeadlines15,
} from './helpers/fixtures.js';

vi.mock('@google-analytics/data', () => createGA4Mock());
vi.mock('google-ads-api', () => createGoogleAdsMock());

import { loadConfig } from '../../utils/auth.js';
import { MetaClient } from '../../apis/meta.js';
import { ShopifyClient } from '../../apis/shopify.js';
import { fetchWithRetry, ApiError } from '../../utils/api-retry.js';
import { validateRsaBatch } from '../../utils/validators.js';
import { InsightsStore, type InsightReport } from '../../analytics/insights-store.js';

const META_BASE = 'https://graph.facebook.com/v19.0';
const SHOPIFY_BASE = 'https://woodabu-test.myshopify.com/admin/api/2025-01/graphql.json';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe('Error Propagation — E2E', () => {
  describe('config loading failures', () => {
    const envVarNames = getEnvVarNames();

    for (const varName of envVarNames) {
      it(`throws when ${varName} is missing`, () => {
        // Stub all env vars first
        for (const [key, value] of Object.entries(ALL_ENV_VARS)) {
          vi.stubEnv(key, value);
        }
        // Then remove the one under test
        vi.stubEnv(varName, '');

        expect(() => loadConfig()).toThrow(varName);
      });
    }
  });

  describe('API errors through aggregation', () => {
    it('Meta 500 throws Error with status code', async () => {
      server.use(
        http.get(`${META_BASE}/:accountId/insights`, () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
        ),
      );

      const client = new MetaClient({
        systemUserToken: 'sut_test',
        tokenExpiry: '2026-12-31',
        adAccountId: 'act_e2e_123',
        pageId: 'page_e2e_456',
        pageAccessToken: 'pat_test',
      });

      await expect(client.getAdInsights()).rejects.toThrow('500');
    });

    it('Shopify 401 prevents email flow', async () => {
      server.use(
        http.post(SHOPIFY_BASE, () =>
          HttpResponse.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 }),
        ),
      );

      const client = new ShopifyClient({
        storeDomain: 'woodabu-test.myshopify.com',
        accessToken: 'bad_token',
      });

      await expect(client.getProducts()).rejects.toThrow('401');
    });

    it('fetchWithRetry preserves original status code in ApiError', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Rate limited', {
          status: 429,
          headers: { 'Retry-After': '1' },
        }),
      );

      try {
        await fetchWithRetry('https://example.com/api', {}, { retries: 0, baseDelayMs: 1, fetchFn: mockFetch });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(429);
      }
    });

    it('ApiError includes redacted URL', async () => {
      const url = 'https://api.example.com/data?access_token=secret123&campaign_id=abc';
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Rate limited', {
          status: 429,
          headers: { 'Retry-After': '1' },
        }),
      );

      try {
        await fetchWithRetry(url, {}, { retries: 0, baseDelayMs: 1, fetchFn: mockFetch });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.url).toContain('campaign_id=abc');
        expect(apiErr.url).not.toContain('secret123');
        // URL class may encode brackets: [REDACTED] → %5BREDACTED%5D
        expect(apiErr.url).toMatch(/REDACTED/);
      }
    });
  });

  describe('validation blocks publishing', () => {
    it('invalid headlines prevent creating RSA ad (validateRsaBatch returns valid:false)', () => {
      const result = validateRsaBatch(headlinesWith3Invalid, validDescriptions4);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Each of the 3 invalid headlines should produce an error
      const headlineErrors = result.errors.filter((e) => e.includes('Headline'));
      expect(headlineErrors.length).toBe(3);
    });

    it('invalid batch count prevents flow', () => {
      // Too few headlines
      const result = validateRsaBatch(validHeadlines15.slice(0, 5), validDescriptions4);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Expected 15 headlines'))).toBe(true);
    });
  });

  describe('InsightsStore errors', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTmpInsightsDir();
    });

    afterEach(() => {
      cleanupTmpInsightsDir();
    });

    it('invalid date format throws', () => {
      const store = new InsightsStore(tmpDir);
      const report: InsightReport = {
        date: '15-03-2026',
        type: 'weekly',
        channels: {},
        recommendations: [],
      };
      expect(() => store.save(report)).toThrow('Invalid date format');
    });

    it('invalid report type throws', () => {
      const store = new InsightsStore(tmpDir);
      const report = {
        date: '2026-03-15',
        type: 'invalid_type' as InsightReport['type'],
        channels: {},
        recommendations: [],
      };
      expect(() => store.save(report)).toThrow('Invalid report type');
    });

    it('corrupted JSON throws on read', () => {
      const store = new InsightsStore(tmpDir);
      // Save a valid report first
      const report: InsightReport = {
        date: '2026-03-15',
        type: 'weekly',
        channels: {},
        recommendations: [],
      };
      store.save(report);

      // Corrupt the file
      const fs = require('node:fs');
      const path = require('node:path');
      const filepath = path.join(tmpDir, '2026-03-15-weekly.json');
      fs.writeFileSync(filepath, '{ corrupted json !!!', 'utf-8');

      expect(() => store.getLatest(1)).toThrow();
    });

    it('type guard rejects malformed JSON', () => {
      const store = new InsightsStore(tmpDir);
      // Write a valid JSON file that does not match InsightReport shape
      const fs = require('node:fs');
      const path = require('node:path');
      const filepath = path.join(tmpDir, '2026-03-15-weekly.json');
      fs.writeFileSync(filepath, JSON.stringify({ foo: 'bar' }), 'utf-8');

      expect(() => store.getLatest(1)).toThrow('Invalid insight report format');
    });
  });
});
