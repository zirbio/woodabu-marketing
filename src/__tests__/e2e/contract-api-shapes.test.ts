import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, resetToDefaults, ga4RunReportMock, createGA4Mock, googleAdsReportMock, googleAdsMutateMock, createGoogleAdsMock } from './helpers/msw-server.js';
import { metaInsightsResponse, shopifyProductsResponse, shopifyOrdersResponse, shopifySegmentsResponse, shopifyEmailSuccessResponse, ga4TrafficResponse, googleAdsPerformanceRows, googleAdsMutateResponse } from './helpers/fixtures.js';
import { MetaClient } from '../../apis/meta.js';
import { ShopifyClient } from '../../apis/shopify.js';
import { GA4Client } from '../../apis/ga4.js';
import { GoogleAdsClient } from '../../apis/google-ads.js';
import { aggregateWeekly } from '../../analytics/aggregator.js';

// Mock GA4 and GoogleAds at module level
vi.mock('@google-analytics/data', () => createGA4Mock());
vi.mock('google-ads-api', () => createGoogleAdsMock());

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { resetToDefaults(); });
afterAll(() => server.close());

const metaConfig = { systemUserToken: 'sut_test', tokenExpiry: '2026-12-31', adAccountId: 'act_e2e_123', pageId: 'page_e2e_456', pageAccessToken: 'pat_test' };
const shopifyConfig = { storeDomain: 'woodabu-test.myshopify.com', accessToken: 'shpat_test' };
const ga4Config = { propertyId: 'properties/e2e_123', serviceAccountKeyPath: 'test.json' };
const gadsConfig = { clientId: 'test', clientSecret: 'test', refreshToken: 'test', developerToken: 'test', customerId: 'gads_e2e_customer_123' };

describe('API Contract Tests', () => {
  describe('Meta API response contract', () => {
    it('getAdInsights returns AdInsight[] with all required fields', async () => {
      const client = new MetaClient(metaConfig);
      const insights = await client.getAdInsights();
      expect(Array.isArray(insights)).toBe(true);
      for (const insight of insights) {
        expect(insight).toHaveProperty('campaignId');
        expect(insight).toHaveProperty('campaignName');
        expect(insight).toHaveProperty('impressions');
        expect(insight).toHaveProperty('clicks');
        expect(insight).toHaveProperty('ctr');
        expect(insight).toHaveProperty('spend');
        expect(insight).toHaveProperty('conversions');
      }
    });

    it('AdInsight.impressions is number, not string', async () => {
      const client = new MetaClient(metaConfig);
      const insights = await client.getAdInsights();
      expect(typeof insights[0].impressions).toBe('number');
    });

    it('AdInsight.conversions is number (0 when no purchases)', async () => {
      server.use(
        http.get('https://graph.facebook.com/v19.0/act_e2e_123/insights', () =>
          HttpResponse.json({ data: [{ campaign_id: 'c1', campaign_name: 'Test', impressions: '100', clicks: '10', ctr: '0.1', spend: '50', actions: [{ action_type: 'link_click', value: '50' }] }] }),
        ),
      );
      const client = new MetaClient(metaConfig);
      const insights = await client.getAdInsights();
      expect(typeof insights[0].conversions).toBe('number');
      expect(insights[0].conversions).toBe(0);
    });

    it('createAdDraft returns { adId: string }', async () => {
      const client = new MetaClient(metaConfig);
      const result = await client.createAdDraft({ campaignId: 'c1', primaryText: 'text', headline: 'head', description: 'desc' });
      expect(typeof result.adId).toBe('string');
      expect(result.adId.length).toBeGreaterThan(0);
    });

    it('schedulePost returns { postId: string }', async () => {
      const client = new MetaClient(metaConfig);
      const result = await client.schedulePost({ message: 'Test', scheduledTime: 12345 });
      expect(typeof result.postId).toBe('string');
    });
  });

  describe('Shopify API response contract', () => {
    it('getProducts returns Product[] with all required fields', async () => {
      const client = new ShopifyClient(shopifyConfig);
      const products = await client.getProducts();
      expect(Array.isArray(products)).toBe(true);
      for (const p of products) {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('title');
        expect(p).toHaveProperty('handle');
        expect(p).toHaveProperty('description');
        expect(p).toHaveProperty('imageUrl');
        expect(p).toHaveProperty('price');
      }
    });

    it('Product.imageUrl is string | null', async () => {
      const client = new ShopifyClient(shopifyConfig);
      const products = await client.getProducts();
      for (const p of products) {
        expect(typeof p.imageUrl === 'string' || p.imageUrl === null).toBe(true);
      }
    });

    it('getRecentOrders returns Order[] with lineItems', async () => {
      const client = new ShopifyClient(shopifyConfig);
      const orders = await client.getRecentOrders();
      expect(Array.isArray(orders)).toBe(true);
      for (const o of orders) {
        expect(o).toHaveProperty('id');
        expect(o).toHaveProperty('totalPrice');
        expect(Array.isArray(o.lineItems)).toBe(true);
      }
    });

    it('getCustomerSegments returns CustomerSegment[]', async () => {
      const client = new ShopifyClient(shopifyConfig);
      const segments = await client.getCustomerSegments();
      expect(Array.isArray(segments)).toBe(true);
      for (const s of segments) {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('query');
      }
    });

    it('createEmailDraft returns EmailDraftResult shape', async () => {
      const client = new ShopifyClient(shopifyConfig);
      const result = await client.createEmailDraft({ subject: 'Test', body: '<html></html>' });
      expect(result).toHaveProperty('campaignId');
      expect(result).toHaveProperty('fallback');
      expect(typeof result.fallback).toBe('boolean');
    });
  });

  describe('Google Ads API response contract', () => {
    it('getCampaignPerformance returns AdPerformance[]', async () => {
      const client = new GoogleAdsClient(gadsConfig);
      const results = await client.getCampaignPerformance();
      expect(Array.isArray(results)).toBe(true);
      for (const r of results) {
        expect(r).toHaveProperty('adId');
        expect(r).toHaveProperty('campaignId');
        expect(r).toHaveProperty('campaignName');
        expect(r).toHaveProperty('headlines');
        expect(r).toHaveProperty('metrics');
        expect(Array.isArray(r.headlines)).toBe(true);
      }
    });

    it('AdPerformance.headlines is string[]', async () => {
      const client = new GoogleAdsClient(gadsConfig);
      const results = await client.getCampaignPerformance();
      for (const r of results) {
        for (const h of r.headlines) {
          expect(typeof h).toBe('string');
        }
      }
    });

    it('createRsaAd returns { resourceName: string }', async () => {
      const client = new GoogleAdsClient(gadsConfig);
      const result = await client.createRsaAd({ adGroupId: 'ag_1', headlines: ['H1'], descriptions: ['D1'] });
      expect(typeof result.resourceName).toBe('string');
    });
  });

  describe('GA4 API response contract', () => {
    it('getTrafficByChannel returns ChannelTraffic[]', async () => {
      const client = new GA4Client(ga4Config);
      const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
      expect(Array.isArray(data)).toBe(true);
      for (const d of data) {
        expect(d).toHaveProperty('channel');
        expect(d).toHaveProperty('date');
        expect(d).toHaveProperty('sessions');
        expect(d).toHaveProperty('conversions');
        expect(d).toHaveProperty('conversionRate');
      }
    });

    it('ChannelTraffic fields are all correct types', async () => {
      const client = new GA4Client(ga4Config);
      const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
      for (const d of data) {
        expect(typeof d.channel).toBe('string');
        expect(typeof d.date).toBe('string');
        expect(typeof d.sessions).toBe('number');
        expect(typeof d.conversions).toBe('number');
        expect(typeof d.conversionRate).toBe('number');
      }
    });
  });

  describe('Aggregator contract', () => {
    it('aggregateWeekly returns WeeklyAggregate with all fields', () => {
      const result = aggregateWeekly({
        googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
        meta: [{ campaignName: 'B', impressions: 1000, clicks: 50, spend: 50, conversions: 3, ctr: 0.05 }],
        ga4: [{ channel: 'Organic', sessions: 500, conversions: 10, conversionRate: 0.02 }],
        shopify: { totalSales: 5000, totalOrders: 10, aov: 500, topProducts: [{ title: 'Mesa', units: 5 }] },
      });
      expect(result).toHaveProperty('totalSpend');
      expect(result).toHaveProperty('totalConversions');
      expect(result).toHaveProperty('channels');
      expect(result).toHaveProperty('topChannels');
      expect(result).toHaveProperty('bottomChannels');
      expect(result).toHaveProperty('topContent');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.channels)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});
