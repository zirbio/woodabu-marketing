import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, createGA4Mock, createGoogleAdsMock } from './helpers/msw-server.js';
import { createTmpInsightsDir, cleanupTmpInsightsDir } from './helpers/tmp-insights-dir.js';
import {
  metaInsightsResponse,
  sampleInsightReport,
  emailProducts,
} from './helpers/fixtures.js';

vi.mock('@google-analytics/data', () => createGA4Mock());
vi.mock('google-ads-api', () => createGoogleAdsMock());

import { MetaClient } from '../../apis/meta.js';
import { aggregateWeekly, type AggregatorInput } from '../../analytics/aggregator.js';
import { InsightsStore, type InsightReport } from '../../analytics/insights-store.js';
import { generateEmailHtml, type EmailInput } from '../../staging/html-preview.js';

const META_BASE = 'https://graph.facebook.com/v19.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Data Integrity — E2E', () => {
  describe('API → aggregator mapping', () => {
    it('Meta: spend summed correctly across multiple campaigns', async () => {
      // Fixture has 3 campaigns: spend 250, 180, 300
      const client = new MetaClient({
        systemUserToken: 'sut_test',
        tokenExpiry: '2026-12-31',
        adAccountId: 'act_e2e_123',
        pageId: 'page_e2e_456',
        pageAccessToken: 'pat_test',
      });

      const insights = await client.getAdInsights();
      const metaInputs = insights.map((i) => ({
        campaignName: i.campaignName,
        impressions: i.impressions,
        clicks: i.clicks,
        spend: i.spend,
        conversions: i.conversions,
        ctr: i.ctr,
      }));

      const result = aggregateWeekly({
        googleAds: [],
        meta: metaInputs,
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      // 250 + 180 + 300 = 730
      expect(result.totalSpend).toBe(730);
    });

    it('Google Ads: spend summed correctly', () => {
      const googleInputs = [
        { campaignName: 'Brand', clicks: 100, spend: 150, conversions: 5, ctr: 0.05 },
        { campaignName: 'Generic', clicks: 200, spend: 350, conversions: 10, ctr: 0.04 },
      ];

      const result = aggregateWeekly({
        googleAds: googleInputs,
        meta: [],
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      expect(result.totalSpend).toBe(500);
    });

    it('Conversions extracted only from purchase actions (not link_click etc)', async () => {
      const client = new MetaClient({
        systemUserToken: 'sut_test',
        tokenExpiry: '2026-12-31',
        adAccountId: 'act_e2e_123',
        pageId: 'page_e2e_456',
        pageAccessToken: 'pat_test',
      });

      const insights = await client.getAdInsights();
      // Campaign c1 has purchase=15 and link_click=200 → conversions should be 15
      const c1 = insights.find((i) => i.campaignId === 'c1')!;
      expect(c1.conversions).toBe(15);

      // Campaign c3 has only link_click=150 → conversions should be 0
      const c3 = insights.find((i) => i.campaignId === 'c3')!;
      expect(c3.conversions).toBe(0);
    });

    it('0 conversions when no purchase actions', async () => {
      server.use(
        http.get(`${META_BASE}/:accountId/insights`, () =>
          HttpResponse.json({
            data: [
              {
                campaign_id: 'c1',
                campaign_name: 'Test',
                impressions: '1000',
                clicks: '50',
                ctr: '0.05',
                spend: '100',
                actions: [{ action_type: 'link_click', value: '50' }],
              },
            ],
          }),
        ),
      );

      const client = new MetaClient({
        systemUserToken: 'sut_test',
        tokenExpiry: '2026-12-31',
        adAccountId: 'act_e2e_123',
        pageId: 'page_e2e_456',
        pageAccessToken: 'pat_test',
      });

      const insights = await client.getAdInsights();
      expect(insights[0].conversions).toBe(0);
    });

    it('0 conversions when no actions array', async () => {
      server.use(
        http.get(`${META_BASE}/:accountId/insights`, () =>
          HttpResponse.json({
            data: [
              {
                campaign_id: 'c1',
                campaign_name: 'Test',
                impressions: '1000',
                clicks: '50',
                ctr: '0.05',
                spend: '100',
              },
            ],
          }),
        ),
      );

      const client = new MetaClient({
        systemUserToken: 'sut_test',
        tokenExpiry: '2026-12-31',
        adAccountId: 'act_e2e_123',
        pageId: 'page_e2e_456',
        pageAccessToken: 'pat_test',
      });

      const insights = await client.getAdInsights();
      expect(insights[0].conversions).toBe(0);
      expect(typeof insights[0].conversions).toBe('number');
    });

    it('Numeric strings from Meta → numbers in aggregator', async () => {
      const client = new MetaClient({
        systemUserToken: 'sut_test',
        tokenExpiry: '2026-12-31',
        adAccountId: 'act_e2e_123',
        pageId: 'page_e2e_456',
        pageAccessToken: 'pat_test',
      });

      const insights = await client.getAdInsights();
      // All fixture values are strings in the JSON response
      for (const insight of insights) {
        expect(typeof insight.spend).toBe('number');
        expect(typeof insight.impressions).toBe('number');
        expect(typeof insight.clicks).toBe('number');
        expect(typeof insight.ctr).toBe('number');
        expect(typeof insight.conversions).toBe('number');
      }

      const metaInputs = insights.map((i) => ({
        campaignName: i.campaignName,
        impressions: i.impressions,
        clicks: i.clicks,
        spend: i.spend,
        conversions: i.conversions,
        ctr: i.ctr,
      }));

      const result = aggregateWeekly({
        googleAds: [],
        meta: metaInputs,
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      expect(typeof result.totalSpend).toBe('number');
      expect(typeof result.totalConversions).toBe('number');
    });

    it('No floating point precision loss in spend totals', () => {
      // Use values that commonly cause floating point issues
      const metaInputs = [
        { campaignName: 'A', impressions: 100, clicks: 10, spend: 0.1, conversions: 1, ctr: 0.1 },
        { campaignName: 'B', impressions: 200, clicks: 20, spend: 0.2, conversions: 2, ctr: 0.1 },
      ];
      const googleInputs = [
        { campaignName: 'C', clicks: 30, spend: 0.3, conversions: 3, ctr: 0.1 },
      ];

      const result = aggregateWeekly({
        googleAds: googleInputs,
        meta: metaInputs,
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      // 0.1 + 0.2 + 0.3 = 0.6000000000000001 in JS, but result should be close
      expect(result.totalSpend).toBeCloseTo(0.6, 10);
    });
  });

  describe('Shopify → email mapping', () => {
    it('Product imageUrl null handled in email (no crash)', () => {
      const input: EmailInput = {
        subject: 'Test',
        preheader: 'Preview text',
        bodyMjml: '<mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section>',
        products: [
          { title: 'Mesa', price: '1299', imageUrl: '', url: 'https://woodabu.com/mesa' },
        ],
      };

      // Should not throw even with empty imageUrl
      const result = generateEmailHtml(input);
      expect(result.html).toBeDefined();
      expect(typeof result.html).toBe('string');
    });

    it('Product price "0" preserved as string', () => {
      const input: EmailInput = {
        subject: 'Test',
        preheader: 'Preview',
        bodyMjml: '<mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section>',
        products: [
          { title: 'Free Item', price: '0', imageUrl: 'https://cdn.shopify.com/img.jpg', url: 'https://woodabu.com/free' },
        ],
      };

      const result = generateEmailHtml(input);
      expect(result.html).toContain('0');
    });

    it('HTML entities in product titles escaped in email HTML', () => {
      const input: EmailInput = {
        subject: 'Test',
        preheader: 'Preview',
        bodyMjml: '<mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section>',
        products: [
          {
            title: 'Mesa & Silla <Edition>',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      };

      const result = generateEmailHtml(input);
      // The raw < and > and & should be escaped
      expect(result.html).not.toContain('<Edition>');
      expect(result.html).toContain('&amp;');
      expect(result.html).toContain('&lt;Edition&gt;');
    });
  });

  describe('ROAS calculation integrity', () => {
    it('ROAS = conversions / spend', () => {
      const result = aggregateWeekly({
        googleAds: [{ campaignName: 'Brand', clicks: 100, spend: 200, conversions: 10, ctr: 0.05 }],
        meta: [],
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      const googleChannel = result.channels.find((c) => c.name === 'google_ads')!;
      expect(googleChannel.roas).toBe(10 / 200);
    });

    it('ROAS = 0 when conversions = 0', () => {
      const result = aggregateWeekly({
        googleAds: [{ campaignName: 'Brand', clicks: 100, spend: 200, conversions: 0, ctr: 0.05 }],
        meta: [],
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      const googleChannel = result.channels.find((c) => c.name === 'google_ads')!;
      expect(googleChannel.roas).toBe(0);
    });

    it('ROAS = null for organic', () => {
      const result = aggregateWeekly({
        googleAds: [],
        meta: [],
        ga4: [{ channel: 'Organic Search', sessions: 500, conversions: 20, conversionRate: 0.04 }],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      const organic = result.channels.find((c) => c.name === 'organic')!;
      expect(organic.roas).toBeNull();
      expect(organic.spend).toBe(0);
    });

    it('No Infinity when spend = 0', () => {
      // When spend is 0 but conversions > 0, aggregator only adds channel if spend > 0 or conversions > 0
      // roas = conversions / spend would be Infinity, but code uses: spend > 0 ? conv/spend : 0
      const result = aggregateWeekly({
        googleAds: [{ campaignName: 'Free', clicks: 10, spend: 0, conversions: 5, ctr: 0.1 }],
        meta: [],
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      });

      const googleChannel = result.channels.find((c) => c.name === 'google_ads')!;
      expect(googleChannel.roas).toBe(0);
      expect(Number.isFinite(googleChannel.roas)).toBe(true);
    });
  });

  describe('InsightsStore round-trip', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTmpInsightsDir();
    });

    afterEach(() => {
      cleanupTmpInsightsDir();
    });

    it('Complex report survives save → read', () => {
      const store = new InsightsStore(tmpDir);
      store.save(sampleInsightReport);

      const loaded = store.getLatest(1);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(sampleInsightReport);
    });

    it('Unicode in patterns survives round-trip', () => {
      const store = new InsightsStore(tmpDir);
      const report: InsightReport = {
        date: '2026-03-15',
        type: 'weekly',
        channels: {
          meta: {
            top_performers: [{ id: 'ad_1', text: 'Artesanía española en madera de castaño' }],
            patterns: ['Los títulos con "ñ" y acentos (é, á, ü) rinden mejor', 'Emojis 🌳🪵 aumentan engagement'],
          },
        },
        recommendations: [
          { action: 'crear_contenido', target: 'instagram_reels', reason: 'Contenido "detrás de cámaras" gusta más' },
        ],
      };

      store.save(report);
      const loaded = store.getLatest(1);
      expect(loaded[0]).toEqual(report);
      expect(loaded[0].channels.meta.patterns[0]).toContain('ñ');
      expect(loaded[0].channels.meta.patterns[1]).toContain('🌳');
    });

    it('Nested recommendation objects preserved', () => {
      const store = new InsightsStore(tmpDir);
      const report: InsightReport = {
        date: '2026-03-15',
        type: 'channel',
        channels: {},
        recommendations: [
          { action: 'increase_budget', target: 'google_ads_brand', reason: 'ROAS > 3.0' },
          { action: 'pause_campaign', target: 'meta_generic', reason: 'CTR < 0.01' },
          { action: 'create_similar', target: 'meta_sustainability', reason: 'High engagement rate 8%' },
        ],
      };

      store.save(report);
      const loaded = store.getLatest(1);
      expect(loaded[0].recommendations).toHaveLength(3);
      expect(loaded[0].recommendations[0]).toEqual({ action: 'increase_budget', target: 'google_ads_brand', reason: 'ROAS > 3.0' });
      expect(loaded[0].recommendations[2].reason).toBe('High engagement rate 8%');
    });

    it('Date and type fields match exactly', () => {
      const store = new InsightsStore(tmpDir);

      const types: InsightReport['type'][] = ['weekly', 'channel', 'product', 'compare'];
      const dates = ['2026-01-01', '2026-06-15', '2026-12-31', '2025-03-08'];

      for (let i = 0; i < types.length; i++) {
        const report: InsightReport = {
          date: dates[i],
          type: types[i],
          channels: {},
          recommendations: [],
        };
        store.save(report);
      }

      const loaded = store.getLatest(4);
      // getLatest returns sorted reverse by filename, so newest date first
      const loadedDates = loaded.map((r) => r.date);
      const loadedTypes = loaded.map((r) => r.type);

      // All original dates and types should be present
      for (let i = 0; i < types.length; i++) {
        expect(loadedDates).toContain(dates[i]);
        expect(loadedTypes).toContain(types[i]);
      }
    });
  });
});
