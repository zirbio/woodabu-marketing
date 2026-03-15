import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  server,
  resetToDefaults,
  ga4RunReportMock,
  googleAdsReportMock,
} from './helpers/msw-server.js';

vi.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: vi.fn().mockImplementation(function () {
    return { runReport: ga4RunReportMock };
  }),
}));

vi.mock('google-ads-api', () => {
  const mockCustomer = {
    report: googleAdsReportMock,
    mutateResources: vi.fn().mockResolvedValue({ results: [{ resource_name: 'customers/123/adGroupAds/456' }] }),
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
import { stubAllEnvVars, ALL_ENV_VARS } from './helpers/env-stub.js';
import { createTmpInsightsDir, cleanupTmpInsightsDir } from './helpers/tmp-insights-dir.js';
import {
  metaInsightsResponse,
  metaInsightsEmptyResponse,
  shopifyOrdersResponse,
  ga4TrafficResponse,
  ga4EmptyResponse,
  googleAdsPerformanceRows,
  sampleInsightReport,
  sampleInsightReportMinimal,
  shopifyProductsEmptyResponse,
} from './helpers/fixtures.js';

import { loadConfig } from '../../utils/auth.js';
import { MetaClient, type AdInsight } from '../../apis/meta.js';
import { ShopifyClient, type Order } from '../../apis/shopify.js';
import { GA4Client } from '../../apis/ga4.js';
import { GoogleAdsClient, type AdPerformance } from '../../apis/google-ads.js';
import {
  aggregateWeekly,
  formatWeeklySummary,
  type AggregatorInput,
  type GoogleAdsInput,
  type MetaInput,
  type GA4Input,
  type ShopifyInput,
} from '../../analytics/aggregator.js';
import { InsightsStore, type InsightReport } from '../../analytics/insights-store.js';
import { parsePeriod, parseCompareArg } from '../../utils/date-parser.js';

const META_BASE = 'https://graph.facebook.com/v19.0';
const SHOPIFY_BASE = 'https://woodabu-test.myshopify.com/admin/api/2025-01/graphql.json';

describe('Analytics Weekly — E2E', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
    stubAllEnvVars();
  });

  afterEach(() => {
    resetToDefaults();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    stubAllEnvVars();
    ga4RunReportMock.mockResolvedValue(ga4TrafficResponse);
    googleAdsReportMock.mockResolvedValue(googleAdsPerformanceRows);
  });

  afterAll(() => {
    server.close();
  });

  describe('happy path — full pipeline', () => {
    it('loads config from env vars successfully', () => {
      const config = loadConfig();
      expect(config.shopify.storeDomain).toBe(ALL_ENV_VARS.SHOPIFY_STORE_DOMAIN);
      expect(config.meta.systemUserToken).toBe(ALL_ENV_VARS.META_SYSTEM_USER_TOKEN);
      expect(config.googleAds.customerId).toBe(ALL_ENV_VARS.GOOGLE_ADS_CUSTOMER_ID);
      expect(config.ga4.propertyId).toBe(ALL_ENV_VARS.GA4_PROPERTY_ID);
    });

    it('fetches Meta ad insights and maps to MetaInput', async () => {
      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      const insights = await metaClient.getAdInsights();

      expect(insights).toHaveLength(3);
      const metaInputs: MetaInput[] = insights.map((i) => ({
        campaignName: i.campaignName,
        impressions: i.impressions,
        clicks: i.clicks,
        spend: i.spend,
        conversions: i.conversions,
        ctr: i.ctr,
      }));
      expect(metaInputs[0].campaignName).toBe('Spring Sale');
      expect(metaInputs[0].spend).toBe(250);
      expect(metaInputs[0].conversions).toBe(15);
    });

    it('fetches Shopify orders and computes ShopifyInput', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const orders = await shopifyClient.getRecentOrders();

      expect(orders).toHaveLength(2);
      const totalSales = orders.reduce((s, o) => s + Number(o.totalPrice), 0);
      const totalOrders = orders.length;
      const aov = totalSales / totalOrders;

      const productUnits = new Map<string, number>();
      for (const order of orders) {
        for (const li of order.lineItems) {
          productUnits.set(li.title, (productUnits.get(li.title) ?? 0) + li.quantity);
        }
      }
      const topProducts = [...productUnits.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([title, units]) => ({ title, units }));

      const shopifyInput: ShopifyInput = { totalSales, totalOrders, aov, topProducts };
      expect(shopifyInput.totalSales).toBe(2797);
      expect(shopifyInput.totalOrders).toBe(2);
      expect(shopifyInput.aov).toBe(1398.5);
      expect(shopifyInput.topProducts[0].title).toBe('Cabecero Castaño');
    });

    it('fetches GA4 traffic by channel', async () => {
      const config = loadConfig();
      const ga4Client = new GA4Client(config.ga4);
      const traffic = await ga4Client.getTrafficByChannel('2026-03-08', '2026-03-14');

      expect(traffic).toHaveLength(4);
      const ga4Inputs: GA4Input[] = traffic.map((t) => ({
        channel: t.channel,
        sessions: t.sessions,
        conversions: t.conversions,
        conversionRate: t.conversionRate,
      }));
      expect(ga4Inputs[0].channel).toBe('Organic Search');
      expect(ga4Inputs[0].sessions).toBe(2500);
    });

    it('fetches Google Ads campaign performance', async () => {
      const config = loadConfig();
      const gadsClient = new GoogleAdsClient(config.googleAds);
      const ads = await gadsClient.getCampaignPerformance();

      expect(ads).toHaveLength(5);
      const gadsInputs: GoogleAdsInput[] = ads.map((a) => ({
        campaignName: a.campaignName,
        clicks: a.metrics.clicks,
        spend: a.metrics.costMicros / 1_000_000,
        conversions: a.metrics.conversions,
        ctr: a.metrics.ctr,
      }));
      expect(gadsInputs[0].campaignName).toBe('Brand Search');
      expect(gadsInputs[0].clicks).toBe(250);
    });

    it('aggregates all channel data into WeeklyAggregate', async () => {
      const config = loadConfig();

      const metaClient = new MetaClient(config.meta);
      const insights = await metaClient.getAdInsights();
      const metaInputs: MetaInput[] = insights.map((i) => ({
        campaignName: i.campaignName,
        impressions: i.impressions,
        clicks: i.clicks,
        spend: i.spend,
        conversions: i.conversions,
        ctr: i.ctr,
      }));

      const gadsClient = new GoogleAdsClient(config.googleAds);
      const ads = await gadsClient.getCampaignPerformance();
      const gadsInputs: GoogleAdsInput[] = ads.map((a) => ({
        campaignName: a.campaignName,
        clicks: a.metrics.clicks,
        spend: a.metrics.costMicros / 1_000_000,
        conversions: a.metrics.conversions,
        ctr: a.metrics.ctr,
      }));

      const ga4Client = new GA4Client(config.ga4);
      const traffic = await ga4Client.getTrafficByChannel('2026-03-08', '2026-03-14');
      const ga4Inputs: GA4Input[] = traffic.map((t) => ({
        channel: t.channel,
        sessions: t.sessions,
        conversions: t.conversions,
        conversionRate: t.conversionRate,
      }));

      const shopifyClient = new ShopifyClient(config.shopify);
      const orders = await shopifyClient.getRecentOrders();
      const totalSales = orders.reduce((s, o) => s + Number(o.totalPrice), 0);
      const shopifyInput: ShopifyInput = {
        totalSales,
        totalOrders: orders.length,
        aov: totalSales / orders.length,
        topProducts: [{ title: 'Mesa Roble Macizo', units: 1 }, { title: 'Cabecero Castaño', units: 2 }],
      };

      const input: AggregatorInput = {
        googleAds: gadsInputs,
        meta: metaInputs,
        ga4: ga4Inputs,
        shopify: shopifyInput,
      };

      const aggregate = aggregateWeekly(input);
      expect(aggregate.totalSpend).toBeGreaterThan(0);
      expect(aggregate.totalConversions).toBeGreaterThan(0);
      expect(aggregate.channels.length).toBeGreaterThanOrEqual(2);
      expect(aggregate.topChannels.length).toBeGreaterThan(0);
      expect(aggregate.topContent).toHaveLength(2);
    });

    it('formats aggregate into readable summary', () => {
      const input: AggregatorInput = {
        googleAds: [{ campaignName: 'Brand', clicks: 250, spend: 12.5, conversions: 12, ctr: 0.05 }],
        meta: [{ campaignName: 'Spring', impressions: 12000, clicks: 600, spend: 250, conversions: 15, ctr: 0.05 }],
        ga4: [{ channel: 'Organic', sessions: 2500, conversions: 75, conversionRate: 3.0 }],
        shopify: { totalSales: 2797, totalOrders: 2, aov: 1398.5, topProducts: [{ title: 'Mesa', units: 1 }] },
      };
      const aggregate = aggregateWeekly(input);
      const summary = formatWeeklySummary(aggregate);

      expect(summary).toContain('# Weekly Marketing Summary');
      expect(summary).toContain('Total spend');
      expect(summary).toContain('Total conversions');
      expect(summary).toContain('Top Channels');
    });

    it('saves aggregate as InsightReport and retrieves it (round-trip)', () => {
      const tmpDir = createTmpInsightsDir();
      try {
        const store = new InsightsStore(tmpDir);
        const report: InsightReport = { ...sampleInsightReport };
        store.save(report);

        const latest = store.getLatest(1);
        expect(latest).toHaveLength(1);
        expect(latest[0].date).toBe('2026-03-15');
        expect(latest[0].type).toBe('weekly');
        expect(latest[0].channels.google_ads.top_performers).toHaveLength(1);
        expect(latest[0].recommendations).toHaveLength(2);
      } finally {
        cleanupTmpInsightsDir();
      }
    });

    it('FULL PIPELINE: config -> fetch all APIs -> aggregate -> format -> save -> retrieve', async () => {
      const tmpDir = createTmpInsightsDir();
      try {
        // 1. Load config
        const config = loadConfig();

        // 2. Fetch from all APIs
        const metaClient = new MetaClient(config.meta);
        const metaInsights = await metaClient.getAdInsights();

        const gadsClient = new GoogleAdsClient(config.googleAds);
        const gadsPerf = await gadsClient.getCampaignPerformance();

        const ga4Client = new GA4Client(config.ga4);
        const ga4Traffic = await ga4Client.getTrafficByChannel('2026-03-08', '2026-03-14');

        const shopifyClient = new ShopifyClient(config.shopify);
        const orders = await shopifyClient.getRecentOrders();

        // 3. Map to aggregator input
        const totalSales = orders.reduce((s, o) => s + Number(o.totalPrice), 0);
        const input: AggregatorInput = {
          googleAds: gadsPerf.map((a) => ({
            campaignName: a.campaignName,
            clicks: a.metrics.clicks,
            spend: a.metrics.costMicros / 1_000_000,
            conversions: a.metrics.conversions,
            ctr: a.metrics.ctr,
          })),
          meta: metaInsights.map((i) => ({
            campaignName: i.campaignName,
            impressions: i.impressions,
            clicks: i.clicks,
            spend: i.spend,
            conversions: i.conversions,
            ctr: i.ctr,
          })),
          ga4: ga4Traffic.map((t) => ({
            channel: t.channel,
            sessions: t.sessions,
            conversions: t.conversions,
            conversionRate: t.conversionRate,
          })),
          shopify: {
            totalSales,
            totalOrders: orders.length,
            aov: totalSales / orders.length,
            topProducts: [{ title: 'Mesa Roble Macizo', units: 1 }],
          },
        };

        // 4. Aggregate
        const aggregate = aggregateWeekly(input);
        expect(aggregate.totalSpend).toBeGreaterThan(0);

        // 5. Format
        const summary = formatWeeklySummary(aggregate);
        expect(summary).toContain('# Weekly Marketing Summary');

        // 6. Save to InsightsStore
        const store = new InsightsStore(tmpDir);
        const report: InsightReport = {
          date: '2026-03-15',
          type: 'weekly',
          channels: {
            google_ads: {
              top_performers: [{ id: 'ad_1', headline: 'Muebles Sostenibles', ctr: 0.05 }],
              patterns: ['Brand terms perform best'],
            },
            meta: {
              top_performers: [{ id: 'ad_2', text: 'Spring Sale', engagement_rate: 0.05 }],
              patterns: ['Seasonal campaigns convert well'],
            },
          },
          recommendations: [
            { action: 'increase_budget', target: 'google_ads', reason: `ROAS ${aggregate.topChannels[0]?.roas?.toFixed(1) ?? 'N/A'}` },
          ],
        };
        store.save(report);

        // 7. Retrieve and verify
        const latest = store.getLatest(1);
        expect(latest).toHaveLength(1);
        expect(latest[0].date).toBe('2026-03-15');
        expect(latest[0].type).toBe('weekly');
      } finally {
        cleanupTmpInsightsDir();
      }
    });
  });

  describe('date range integration', () => {
    it('parsePeriod("last-week") produces a valid Monday-to-Sunday range', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 15)); // 2026-03-15 is a Sunday

      const range = parsePeriod('last-week');
      expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const startDate = new Date(range.start);
      const endDate = new Date(range.end);
      // last-week should be Mon-Sun
      expect(startDate.getDay()).toBe(1); // Monday
      expect(endDate.getDay()).toBe(0); // Sunday
      // 7 day span
      const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(6);
    });

    it('parsePeriod("last-week") range works as GA4 date inputs', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 15));

      const range = parsePeriod('last-week');
      // Both must be valid YYYY-MM-DD strings that GA4 accepts
      expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Start must be before end
      expect(range.start < range.end).toBe(true);
    });

    it('parseCompareArg produces two valid date ranges', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 15));

      const result = parseCompareArg('last-week vs last-month');
      expect(result.period1.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.period1.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.period2.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.period2.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('explicit date range format parses correctly', () => {
      const range = parsePeriod('2026-03-01:2026-03-07');
      expect(range.start).toBe('2026-03-01');
      expect(range.end).toBe('2026-03-07');
    });
  });

  describe('empty data scenarios', () => {
    it('aggregates correctly with zero Google Ads campaigns', () => {
      googleAdsReportMock.mockResolvedValue([]);
      const input: AggregatorInput = {
        googleAds: [],
        meta: [{ campaignName: 'Spring Sale', impressions: 12000, clicks: 600, spend: 250, conversions: 15, ctr: 0.05 }],
        ga4: [{ channel: 'Organic', sessions: 2500, conversions: 75, conversionRate: 3.0 }],
        shopify: { totalSales: 2797, totalOrders: 2, aov: 1398.5, topProducts: [] },
      };
      const aggregate = aggregateWeekly(input);
      expect(aggregate.totalSpend).toBe(250);
      expect(aggregate.totalConversions).toBe(15);
      // No google_ads channel
      expect(aggregate.channels.find((c) => c.name === 'google_ads')).toBeUndefined();
    });

    it('aggregates correctly with zero Meta campaigns', () => {
      const input: AggregatorInput = {
        googleAds: [{ campaignName: 'Brand', clicks: 250, spend: 12.5, conversions: 12, ctr: 0.05 }],
        meta: [],
        ga4: [{ channel: 'Organic', sessions: 2500, conversions: 75, conversionRate: 3.0 }],
        shopify: { totalSales: 2797, totalOrders: 2, aov: 1398.5, topProducts: [] },
      };
      const aggregate = aggregateWeekly(input);
      expect(aggregate.totalSpend).toBe(12.5);
      expect(aggregate.totalConversions).toBe(12);
      expect(aggregate.channels.find((c) => c.name === 'meta')).toBeUndefined();
    });

    it('aggregates correctly with empty GA4 data', () => {
      ga4RunReportMock.mockResolvedValue(ga4EmptyResponse);
      const input: AggregatorInput = {
        googleAds: [{ campaignName: 'Brand', clicks: 250, spend: 12.5, conversions: 12, ctr: 0.05 }],
        meta: [{ campaignName: 'Spring', impressions: 12000, clicks: 600, spend: 250, conversions: 15, ctr: 0.05 }],
        ga4: [],
        shopify: { totalSales: 2797, totalOrders: 2, aov: 1398.5, topProducts: [] },
      };
      const aggregate = aggregateWeekly(input);
      expect(aggregate.channels.find((c) => c.name === 'organic')).toBeUndefined();
    });

    it('aggregates correctly with empty Shopify orders', () => {
      const input: AggregatorInput = {
        googleAds: [{ campaignName: 'Brand', clicks: 250, spend: 12.5, conversions: 12, ctr: 0.05 }],
        meta: [{ campaignName: 'Spring', impressions: 12000, clicks: 600, spend: 250, conversions: 15, ctr: 0.05 }],
        ga4: [{ channel: 'Organic', sessions: 2500, conversions: 75, conversionRate: 3.0 }],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      };
      const aggregate = aggregateWeekly(input);
      expect(aggregate.topContent).toEqual([]);
    });

    it('aggregates correctly when ALL sources are empty', () => {
      const input: AggregatorInput = {
        googleAds: [],
        meta: [],
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      };
      const aggregate = aggregateWeekly(input);
      expect(aggregate.totalSpend).toBe(0);
      expect(aggregate.totalConversions).toBe(0);
      expect(aggregate.channels).toEqual([]);
      expect(aggregate.topChannels).toEqual([]);
      expect(aggregate.bottomChannels).toEqual([]);
      expect(aggregate.topContent).toEqual([]);
      expect(aggregate.recommendations).toEqual([]);
    });

    it('formats a summary even when everything is empty', () => {
      const input: AggregatorInput = {
        googleAds: [],
        meta: [],
        ga4: [],
        shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
      };
      const aggregate = aggregateWeekly(input);
      const summary = formatWeeklySummary(aggregate);
      expect(summary).toContain('Total spend');
      expect(summary).toContain('0.00');
      expect(summary).toContain('Total conversions');
    });
  });

  describe('insights store retention integration', () => {
    it('saving 14 reports enforces 12-limit, oldest deleted first', () => {
      const tmpDir = createTmpInsightsDir();
      try {
        const store = new InsightsStore(tmpDir);

        // Save 14 reports with consecutive dates
        for (let i = 1; i <= 14; i++) {
          const day = String(i).padStart(2, '0');
          const report: InsightReport = {
            date: `2026-03-${day}`,
            type: 'weekly',
            channels: {},
            recommendations: [],
          };
          store.save(report);
        }

        // Only the most recent 12 should remain
        const latest = store.getLatest(20);
        expect(latest).toHaveLength(12);

        // Oldest surviving should be 2026-03-03 (days 01 and 02 were pruned)
        const dates = latest.map((r) => r.date).sort();
        expect(dates[0]).toBe('2026-03-03');
        expect(dates[dates.length - 1]).toBe('2026-03-14');
      } finally {
        cleanupTmpInsightsDir();
      }
    });

    it('getLatest returns reports sorted by date descending', () => {
      const tmpDir = createTmpInsightsDir();
      try {
        const store = new InsightsStore(tmpDir);

        store.save({ ...sampleInsightReportMinimal, date: '2026-03-01' });
        store.save({ ...sampleInsightReportMinimal, date: '2026-03-08' });
        store.save({ ...sampleInsightReport });

        const latest = store.getLatest(3);
        expect(latest).toHaveLength(3);
        // File sort is alphabetical desc, so newest first
        expect(latest[0].date).toBe('2026-03-15');
        expect(latest[1].date).toBe('2026-03-08');
        expect(latest[2].date).toBe('2026-03-01');
      } finally {
        cleanupTmpInsightsDir();
      }
    });

    it('getLatest(4) returns only available reports when fewer exist', () => {
      const tmpDir = createTmpInsightsDir();
      try {
        const store = new InsightsStore(tmpDir);
        store.save({ ...sampleInsightReportMinimal });
        const latest = store.getLatest(4);
        expect(latest).toHaveLength(1);
      } finally {
        cleanupTmpInsightsDir();
      }
    });
  });
});
