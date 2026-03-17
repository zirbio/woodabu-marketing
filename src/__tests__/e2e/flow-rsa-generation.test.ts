import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  server,
  resetToDefaults,
  googleAdsReportMock,
  googleAdsMutateMock,
} from './helpers/msw-server.js';

vi.mock('google-ads-api', () => {
  const mockCustomer = {
    report: googleAdsReportMock,
    mutateResources: googleAdsMutateMock,
  };
  return {
    GoogleAdsApi: vi.fn().mockImplementation(function () {
      return {
        Customer: vi.fn().mockImplementation(function () {
          return mockCustomer;
        }),
      };
    }),
  };
});
import { stubAllEnvVars } from './helpers/env-stub.js';
import {
  googleAdsPerformanceRows,
  googleAdsMutateResponse,
  shopifyProductsResponse,
  validHeadlines15,
  validDescriptions4,
  headlinesWith3Invalid,
} from './helpers/fixtures.js';

import { GoogleAdsClient, type AdPerformance } from '../../apis/google-ads.js';
import { ShopifyClient } from '../../apis/shopify.js';
import { loadConfig } from '../../utils/auth.js';
import {
  validateHeadline,
  validateDescription,
  validateRsaBatch,
  HEADLINE_MAX,
  DESCRIPTION_MAX,
} from '../../utils/validators.js';
import {
  formatAdTable,
} from '../../staging/reviewer.js';

describe('RSA Generation — E2E', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
    stubAllEnvVars();
  });

  afterEach(() => {
    resetToDefaults();
    vi.unstubAllEnvs();
    stubAllEnvVars();
    googleAdsReportMock.mockResolvedValue(googleAdsPerformanceRows);
    googleAdsMutateMock.mockResolvedValue(googleAdsMutateResponse);
  });

  afterAll(() => {
    server.close();
  });

  describe('happy path', () => {
    it('fetches ad performance from Google Ads', async () => {
      const config = loadConfig();
      const client = new GoogleAdsClient(config.googleAds);
      const ads = await client.getCampaignPerformance();

      expect(ads).toHaveLength(5);
      expect(ads[0].adId).toBe('1');
      expect(ads[0].campaignName).toBe('Brand Search');
      expect(ads[0].metrics.clicks).toBe(250);
    });

    it('ranks top and bottom performers by CTR', async () => {
      const config = loadConfig();
      const client = new GoogleAdsClient(config.googleAds);
      const ads = await client.getCampaignPerformance();

      const { top, bottom } = GoogleAdsClient.rankPerformers(ads);
      expect(top).toHaveLength(3);
      expect(bottom).toHaveLength(3);
      // Top is sorted by CTR descending, first should have highest CTR
      expect(top[0].metrics.ctr).toBeGreaterThanOrEqual(top[1].metrics.ctr);
      expect(top[1].metrics.ctr).toBeGreaterThanOrEqual(top[2].metrics.ctr);
    });

    it('fetches products from Shopify for ad copy inspiration', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();

      expect(products).toHaveLength(3);
      expect(products[0].title).toBe('Mesa Roble Macizo');
      expect(products[0].price).toBe('1299.00');
      expect(products[0].imageUrl).toContain('mesa-roble');
    });

    it('validates a complete batch of 15 headlines + 4 descriptions', () => {
      const result = validateRsaBatch(validHeadlines15, validDescriptions4);
      expect(result.valid).toBe(true);
      expect(result.headlines).toHaveLength(15);
      expect(result.descriptions).toHaveLength(4);
      expect(result.errors).toEqual([]);
    });

    it('formats headlines into a review table', () => {
      const table = formatAdTable(validHeadlines15, 'headline');
      expect(table).toContain('Headline');
      expect(table).toContain('Chars');
      expect(table).toContain('Status');
      // Each headline should appear as a row
      expect(table).toContain('Muebles hechos a mano');
      expect(table).toContain('OK');
    });

    it('formats descriptions into a review table', () => {
      const table = formatAdTable(validDescriptions4, 'description');
      expect(table).toContain('Description');
      expect(table).toContain('Chars');
      // All valid descriptions should be OK
      for (const desc of validDescriptions4) {
        expect(table).toContain(desc);
      }
    });

    it('FULL PIPELINE: fetch perf -> rank -> validate -> format', async () => {
      const config = loadConfig();

      // 1. Fetch performance
      const gadsClient = new GoogleAdsClient(config.googleAds);
      const ads = await gadsClient.getCampaignPerformance();
      expect(ads.length).toBeGreaterThan(0);

      // 2. Rank
      const { top } = GoogleAdsClient.rankPerformers(ads);
      expect(top.length).toBeGreaterThan(0);

      // 3. Fetch products for copy inspiration
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();
      expect(products.length).toBeGreaterThan(0);

      // 4. Validate batch
      const batchResult = validateRsaBatch(validHeadlines15, validDescriptions4);
      expect(batchResult.valid).toBe(true);

      // 5. Format review tables
      const headlineTable = formatAdTable(validHeadlines15, 'headline');
      const descTable = formatAdTable(validDescriptions4, 'description');
      expect(headlineTable).toContain('OK');
      expect(descTable).toContain('OK');
    });
  });

  describe('validation failures blocking publish', () => {
    it('headlines >30 chars prevent creation', () => {
      const longHeadline = 'Este headline es demasiado largo para Google Ads';
      const result = validateHeadline(longHeadline);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
      expect(result.charCount).toBeGreaterThan(HEADLINE_MAX);
    });

    it('wrong headline count fails batch validation', () => {
      const result = validateRsaBatch(validHeadlines15.slice(0, 10), validDescriptions4);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Expected 15 headlines'))).toBe(true);
    });

    it('wrong description count fails batch validation', () => {
      const result = validateRsaBatch(validHeadlines15, validDescriptions4.slice(0, 2));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Expected 4 descriptions'))).toBe(true);
    });

    it('empty headlines fail validation', () => {
      const result = validateHeadline('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('batch with 3 invalid headlines reports all errors', () => {
      const result = validateRsaBatch(headlinesWith3Invalid, validDescriptions4);
      expect(result.valid).toBe(false);
      // Should have errors for the 3 over-limit headlines
      const headlineErrors = result.errors.filter((e) => e.includes('Headline'));
      expect(headlineErrors.length).toBe(3);
    });

    it('mixed valid/invalid in batch: valid items are still valid', () => {
      const result = validateRsaBatch(headlinesWith3Invalid, validDescriptions4);
      // First 12 headlines are valid
      for (let i = 0; i < 12; i++) {
        expect(result.headlines[i].valid).toBe(true);
      }
      // Last 3 are invalid
      for (let i = 12; i < 15; i++) {
        expect(result.headlines[i].valid).toBe(false);
      }
    });

    it('descriptions >90 chars prevent creation', () => {
      const longDesc = 'A'.repeat(91);
      const result = validateDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });
  });

  describe('Unicode character counting integration', () => {
    it('counts Spanish accented characters correctly', () => {
      // "año" has 3 characters despite potential multibyte encoding
      const result = validateHeadline('Muebles de diseño artesanal');
      expect(result.charCount).toBe([...'Muebles de diseño artesanal'].length);
      expect(result.valid).toBe(true);
    });

    it('counts emoji as single characters', () => {
      const withEmoji = 'Mesa roble ';
      const result = validateHeadline(withEmoji);
      // Spread operator counts emoji correctly
      expect(result.charCount).toBe([...withEmoji].length);
    });

    it('validates mixed multibyte text correctly', () => {
      // 30-char headline with accented chars
      const text = 'Diseño único español café más';
      const charCount = [...text].length;
      const result = validateHeadline(text);
      expect(result.charCount).toBe(charCount);
      if (charCount <= HEADLINE_MAX) {
        expect(result.valid).toBe(true);
      }
    });

    it('formatAdTable shows correct char count for Unicode', () => {
      const items = ['Diseño único español'];
      const table = formatAdTable(items, 'headline');
      const expectedCount = [...'Diseño único español'].length;
      expect(table).toContain(String(expectedCount));
    });
  });

  describe('staging table boundary values', () => {
    it('exactly 30 chars headline shows WARN status', () => {
      // Build a headline that is exactly 30 characters
      const headline = 'A'.repeat(30);
      const table = formatAdTable([headline], 'headline');
      expect(table).toContain('WARN');
      expect(table).toContain('30');
    });

    it('29 chars headline shows WARN status (within threshold)', () => {
      const headline = 'A'.repeat(29);
      const table = formatAdTable([headline], 'headline');
      // charCount >= maxChars - 2 => 29 >= 28 => WARN
      expect(table).toContain('WARN');
    });

    it('28 chars headline shows WARN status (at threshold boundary)', () => {
      const headline = 'A'.repeat(28);
      const table = formatAdTable([headline], 'headline');
      // charCount >= maxChars - 2 => 28 >= 28 => WARN
      expect(table).toContain('WARN');
    });

    it('27 chars headline shows OK status', () => {
      const headline = 'A'.repeat(27);
      const table = formatAdTable([headline], 'headline');
      expect(table).toContain('OK');
      expect(table).not.toContain('WARN');
      expect(table).not.toContain('OVER');
    });

    it('31 chars headline shows OVER status', () => {
      const headline = 'A'.repeat(31);
      const table = formatAdTable([headline], 'headline');
      expect(table).toContain('OVER');
    });
  });
});
