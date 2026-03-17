import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, createGA4Mock, createGoogleAdsMock } from './helpers/msw-server.js';

vi.mock('@google-analytics/data', () => createGA4Mock());
vi.mock('google-ads-api', () => createGoogleAdsMock());

import { MetaClient } from '../../apis/meta.js';
import { ShopifyClient } from '../../apis/shopify.js';
import { fetchWithRetry, ApiError } from '../../utils/api-retry.js';

const META_BASE = 'https://graph.facebook.com/v19.0';
const SHOPIFY_BASE = 'https://woodabu-test.myshopify.com/admin/api/2025-01/graphql.json';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const metaConfig = {
  systemUserToken: 'sut_test',
  tokenExpiry: '2026-12-31',
  adAccountId: 'act_e2e_123',
  pageId: 'page_e2e_456',
  pageAccessToken: 'pat_test',
};

const shopifyConfig = {
  storeDomain: 'woodabu-test.myshopify.com',
  accessToken: 'shpat_e2e_test_token',
};

describe('Resilience — E2E', () => {
  describe('fetchWithRetry in real flows', () => {
    it('Meta: retry on network error then succeed', async () => {
      let attempt = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          throw new TypeError('fetch failed');
        }
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const response = await fetchWithRetry(
        `${META_BASE}/act_e2e_123/insights`,
        { headers: { Authorization: 'Bearer sut_test' } },
        { retries: 1, baseDelayMs: 1, fetchFn: mockFetch },
      );

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('Meta: retry on 500 then succeed', async () => {
      let attempt = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          return new Response('Internal Server Error', { status: 500 });
        }
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const response = await fetchWithRetry(
        `${META_BASE}/act_e2e_123/insights`,
        {},
        { retries: 1, baseDelayMs: 1, fetchFn: mockFetch },
      );

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('429 with Retry-After header respected', async () => {
      let attempt = 0;
      const timestamps: number[] = [];

      const mockFetch = vi.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        attempt++;
        if (attempt === 1) {
          return new Response('Rate limited', {
            status: 429,
            headers: { 'Retry-After': '1' },
          });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const response = await fetchWithRetry(
        'https://api.example.com/data',
        {},
        { retries: 1, baseDelayMs: 1, fetchFn: mockFetch },
      );

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Retry-After: 1 means 1000ms wait. Check that there was a delay.
      const elapsed = timestamps[1] - timestamps[0];
      expect(elapsed).toBeGreaterThanOrEqual(900);
    });

    it('429 without Retry-After uses exponential backoff', async () => {
      let attempt = 0;

      const mockFetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt <= 1) {
          return new Response('Rate limited', { status: 429 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const response = await fetchWithRetry(
        'https://api.example.com/data',
        {},
        { retries: 1, baseDelayMs: 1, fetchFn: mockFetch },
      );

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('Persistent 429 → ApiError after exhaustion', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => {
        return new Response('Rate limited', {
          status: 429,
          headers: { 'Retry-After': '0' },
        });
      });

      await expect(
        fetchWithRetry(
          'https://api.example.com/data',
          {},
          { retries: 2, baseDelayMs: 1, fetchFn: mockFetch },
        ),
      ).rejects.toThrow(ApiError);

      // 1 initial + 2 retries = 3 attempts total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('Persistent network error → ApiError after exhaustion', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

      await expect(
        fetchWithRetry(
          'https://api.example.com/data',
          {},
          { retries: 2, baseDelayMs: 1, fetchFn: mockFetch },
        ),
      ).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('400 Bad Request NOT retried', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Bad Request', { status: 400 }),
      );

      const response = await fetchWithRetry(
        'https://api.example.com/data',
        {},
        { retries: 2, baseDelayMs: 1, fetchFn: mockFetch },
      );

      // 400 is not >= 500 and not 429, so it is returned immediately
      expect(response.status).toBe(400);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('401 NOT retried', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const response = await fetchWithRetry(
        'https://api.example.com/data',
        {},
        { retries: 2, baseDelayMs: 1, fetchFn: mockFetch },
      );

      expect(response.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limit isolation', () => {
    it('Meta 429 does not affect Shopify calls', async () => {
      // Meta returns 429
      const metaFetch = vi.fn().mockResolvedValue(
        new Response('Rate limited', { status: 429 }),
      );

      // Attempt Meta call — should fail
      await expect(
        fetchWithRetry(
          `${META_BASE}/act_e2e_123/insights`,
          { headers: { Authorization: 'Bearer sut_test' } },
          { retries: 0, baseDelayMs: 1, fetchFn: metaFetch },
        ),
      ).rejects.toThrow(ApiError);

      // Shopify call should still work independently via MSW
      const shopifyClient = new ShopifyClient(shopifyConfig);
      const products = await shopifyClient.getProducts();
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].title).toBe('Mesa Roble Macizo');
    });

    it('Shopify error does not affect Meta calls', async () => {
      // Override Shopify to return error
      server.use(
        http.post(SHOPIFY_BASE, () =>
          HttpResponse.json({ errors: [{ message: 'Service unavailable' }] }, { status: 503 }),
        ),
      );

      const shopifyClient = new ShopifyClient(shopifyConfig);
      await expect(shopifyClient.getProducts()).rejects.toThrow('503');

      // Meta call should still work via default MSW handlers
      const metaClient = new MetaClient(metaConfig);
      const insights = await metaClient.getAdInsights();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].campaignName).toBe('Spring Sale');
    });
  });
});
