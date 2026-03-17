import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  server,
  resetToDefaults,
} from './helpers/msw-server.js';
import { stubAllEnvVars, stubExpiredToken, stubWarningToken } from './helpers/env-stub.js';
import {
  metaInsightsResponse,
  metaInsightsEmptyResponse,
  shopifyProductsResponse,
} from './helpers/fixtures.js';

import { loadConfig, checkMetaTokenExpiry, type TokenExpiryCheck } from '../../utils/auth.js';
import { MetaClient, type AdInsight } from '../../apis/meta.js';
import { ShopifyClient } from '../../apis/shopify.js';
import {
  formatAdTable,
} from '../../staging/reviewer.js';

const META_BASE = 'https://graph.facebook.com/v19.0';

describe('Meta Ads — E2E', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
    stubAllEnvVars();
  });

  afterEach(() => {
    resetToDefaults();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    stubAllEnvVars();
  });

  afterAll(() => {
    server.close();
  });

  describe('token expiry gate', () => {
    it('token with >7 days remaining returns "ok" status', () => {
      const check = checkMetaTokenExpiry('2026-12-31');
      expect(check.status).toBe('ok');
      expect(check.daysRemaining).toBeGreaterThan(7);
      expect(check.message).toBeUndefined();
    });

    it('token with <=7 days remaining returns "warning" status', () => {
      const warn = new Date();
      warn.setDate(warn.getDate() + 5);
      const expiryDate = warn.toISOString().slice(0, 10);
      const check = checkMetaTokenExpiry(expiryDate);
      expect(check.status).toBe('warning');
      expect(check.daysRemaining).toBeLessThanOrEqual(7);
      expect(check.message).toContain('expires in');
    });

    it('expired token returns "expired" status', () => {
      const check = checkMetaTokenExpiry('2026-01-01');
      expect(check.status).toBe('expired');
      expect(check.daysRemaining).toBeLessThanOrEqual(0);
      expect(check.message).toContain('expired');
    });

    it('boundary: exactly 7 days returns "warning"', () => {
      const boundary = new Date();
      boundary.setDate(boundary.getDate() + 7);
      const expiryDate = boundary.toISOString().slice(0, 10);
      const check = checkMetaTokenExpiry(expiryDate);
      expect(check.status).toBe('warning');
      expect(check.daysRemaining).toBe(7);
    });

    it('token expiry check integrates with loadConfig', () => {
      const config = loadConfig();
      const check = checkMetaTokenExpiry(config.meta.tokenExpiry);
      // Default stubbed expiry is 2026-12-31
      expect(check.status).toBe('ok');
    });

    it('expired token from env stub is detected', () => {
      vi.unstubAllEnvs();
      stubExpiredToken();
      const config = loadConfig();
      const check = checkMetaTokenExpiry(config.meta.tokenExpiry);
      expect(check.status).toBe('expired');
    });

    it('warning token from env stub is detected', () => {
      vi.unstubAllEnvs();
      stubWarningToken();
      const config = loadConfig();
      const check = checkMetaTokenExpiry(config.meta.tokenExpiry);
      expect(check.status).toBe('warning');
    });
  });

  describe('happy path', () => {
    it('fetches Meta ad insights', async () => {
      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      const insights = await metaClient.getAdInsights();

      expect(insights).toHaveLength(3);
      expect(insights[0].campaignId).toBe('c1');
      expect(insights[0].spend).toBe(250);
      expect(insights[0].conversions).toBe(15);
      // Brand Awareness campaign has no purchase actions
      expect(insights[2].conversions).toBe(0);
    });

    it('fetches products from Shopify for ad copy', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();

      expect(products).toHaveLength(3);
      expect(products[0].title).toBe('Mesa Roble Macizo');
    });

    it('formats review tables for Meta ad headlines', () => {
      const headlines = ['Mesa artesanal', 'Madera sostenible', 'Diseño español'];
      const table = formatAdTable(headlines, 'headline');
      expect(table).toContain('Headline');
      expect(table).toContain('OK');
      for (const h of headlines) {
        expect(table).toContain(h);
      }
    });

    it('FULL PIPELINE: check token -> fetch insights -> fetch products -> review', async () => {
      const config = loadConfig();

      // 1. Token check
      const tokenCheck = checkMetaTokenExpiry(config.meta.tokenExpiry);
      expect(tokenCheck.status).toBe('ok');

      // 2. Fetch insights
      const metaClient = new MetaClient(config.meta);
      const insights = await metaClient.getAdInsights();
      expect(insights.length).toBeGreaterThan(0);

      // 3. Fetch products
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();
      expect(products.length).toBeGreaterThan(0);
    });
  });

  describe('error scenarios', () => {
    it('401 response throws and stops the flow', async () => {
      server.use(
        http.get(`${META_BASE}/:accountId/insights`, () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
      );

      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      await expect(metaClient.getAdInsights()).rejects.toThrow('401');
    });

    it('500 after retry exhaustion throws', async () => {
      server.use(
        http.get(`${META_BASE}/:accountId/insights`, () =>
          HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
        ),
      );

      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      // fetchWithRetry with default retries=1 will retry once on 500, then return the 500 response
      // MetaClient checks response.ok and throws
      await expect(metaClient.getAdInsights()).rejects.toThrow('500');
    });

    it('empty insights response returns empty array', async () => {
      server.use(
        http.get(`${META_BASE}/:accountId/insights`, () =>
          HttpResponse.json(metaInsightsEmptyResponse),
        ),
      );

      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      const insights = await metaClient.getAdInsights();
      expect(insights).toEqual([]);
    });

  });
});
