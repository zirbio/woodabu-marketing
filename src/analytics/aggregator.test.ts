import { describe, it, expect } from 'vitest';
import { aggregateWeekly, formatWeeklySummary } from './aggregator.js';

describe('aggregateWeekly', () => {
  it('combines data from multiple channels', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'Spring', clicks: 500, spend: 200, conversions: 20, ctr: 0.04 }],
      meta: [{ campaignName: 'IG Spring', impressions: 10000, clicks: 300, spend: 150, conversions: 8, ctr: 0.03 }],
      ga4: [{ channel: 'Organic', sessions: 2000, conversions: 50, conversionRate: 0.025 }],
      shopify: { totalSales: 15000, totalOrders: 25, aov: 600, topProducts: [{ title: 'Mesa Roble', units: 8 }] },
    });

    expect(result.totalSpend).toBe(350);
    expect(result.totalConversions).toBe(28);
    expect(result.channels).toHaveLength(3);
  });

  it('ranks channels by ROAS', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [{ campaignName: 'B', impressions: 1000, clicks: 50, spend: 50, conversions: 10, ctr: 0.05 }],
      ga4: [],
      shopify: { totalSales: 5000, totalOrders: 15, aov: 333, topProducts: [] },
    });

    expect(result.topChannels[0].name).toBe('meta');
  });
});

describe('formatWeeklySummary', () => {
  it('produces readable markdown summary', () => {
    const summary = formatWeeklySummary({
      totalSpend: 350,
      totalConversions: 28,
      channels: [],
      topChannels: [{ name: 'google_ads', spend: 200, conversions: 20, roas: 2.5 }],
      bottomChannels: [],
      topContent: [],
      recommendations: ['Increase Google Ads budget'],
    });

    expect(summary).toContain('350');
    expect(summary).toContain('28');
    expect(summary).toContain('Google Ads');
  });
});

describe('aggregateWeekly — ROAS calculation', () => {
  it('ROAS = conversions / spend', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    const google = result.channels.find(c => c.name === 'google_ads');
    expect(google!.roas).toBe(5 / 100);
  });

  it('ROAS = 0 when conversions = 0 and spend > 0', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 0, ctr: 0.05 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    const google = result.channels.find(c => c.name === 'google_ads');
    expect(google!.roas).toBe(0);
  });

  it('ROAS = null for organic channel', () => {
    const result = aggregateWeekly({
      googleAds: [],
      meta: [],
      ga4: [{ channel: 'Organic', sessions: 1000, conversions: 50, conversionRate: 0.05 }],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    const organic = result.channels.find(c => c.name === 'organic');
    expect(organic!.roas).toBeNull();
  });

  it('no Infinity when spend = 0 but conversions > 0', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 0, spend: 0, conversions: 5, ctr: 0 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    const google = result.channels.find(c => c.name === 'google_ads');
    expect(google!.roas).toBe(0);
    expect(Number.isFinite(google!.roas)).toBe(true);
  });
});

describe('aggregateWeekly — channel filtering', () => {
  it('excludes google_ads when spend=0 and conversions=0', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 0, spend: 0, conversions: 0, ctr: 0 }],
      meta: [{ campaignName: 'B', impressions: 1000, clicks: 50, spend: 50, conversions: 5, ctr: 0.05 }],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.channels.find(c => c.name === 'google_ads')).toBeUndefined();
  });

  it('excludes meta when spend=0 and conversions=0', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [{ campaignName: 'B', impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: 0 }],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.channels.find(c => c.name === 'meta')).toBeUndefined();
  });

  it('excludes organic when ga4 is empty', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.channels.find(c => c.name === 'organic')).toBeUndefined();
  });

  it('includes all 3 channels when all have data', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [{ campaignName: 'B', impressions: 1000, clicks: 50, spend: 50, conversions: 3, ctr: 0.05 }],
      ga4: [{ channel: 'Organic', sessions: 500, conversions: 10, conversionRate: 0.02 }],
      shopify: { totalSales: 5000, totalOrders: 10, aov: 500, topProducts: [] },
    });
    expect(result.channels).toHaveLength(3);
  });

  it('handles only google_ads data', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].name).toBe('google_ads');
  });

  it('handles only organic data', () => {
    const result = aggregateWeekly({
      googleAds: [],
      meta: [],
      ga4: [{ channel: 'Organic', sessions: 1000, conversions: 50, conversionRate: 0.05 }],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].name).toBe('organic');
  });
});

describe('aggregateWeekly — recommendations', () => {
  it('generates recommendation when top channel ROAS > 2', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 300, ctr: 0.05 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toContain('google_ads');
  });

  it('no recommendation when all ROAS <= 2', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 1, ctr: 0.05 }],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.recommendations).toEqual([]);
  });

  it('no recommendation when no channels', () => {
    const result = aggregateWeekly({
      googleAds: [],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.recommendations).toEqual([]);
  });
});

describe('aggregateWeekly — topContent', () => {
  it('maps shopify topProducts to topContent', () => {
    const result = aggregateWeekly({
      googleAds: [],
      meta: [],
      ga4: [],
      shopify: { totalSales: 5000, totalOrders: 10, aov: 500, topProducts: [{ title: 'Mesa', units: 5 }, { title: 'Silla', units: 3 }, { title: 'Banco', units: 2 }] },
    });
    expect(result.topContent).toHaveLength(3);
    expect(result.topContent[0]).toEqual({ name: 'Mesa', metric: 'units_sold', value: 5 });
  });

  it('handles empty topProducts', () => {
    const result = aggregateWeekly({
      googleAds: [],
      meta: [],
      ga4: [],
      shopify: { totalSales: 0, totalOrders: 0, aov: 0, topProducts: [] },
    });
    expect(result.topContent).toEqual([]);
  });
});

describe('formatWeeklySummary — edge cases', () => {
  it('formats organic channel with ROAS N/A', () => {
    const summary = formatWeeklySummary({
      totalSpend: 0, totalConversions: 50,
      channels: [{ name: 'organic', spend: 0, conversions: 50, roas: null }],
      topChannels: [{ name: 'organic', spend: 0, conversions: 50, roas: null }],
      bottomChannels: [], topContent: [], recommendations: [],
    });
    expect(summary).toContain('N/A (organic)');
  });

  it('formats empty recommendations section', () => {
    const summary = formatWeeklySummary({
      totalSpend: 100, totalConversions: 5,
      channels: [], topChannels: [], bottomChannels: [],
      topContent: [], recommendations: [],
    });
    expect(summary).toContain('## Recommendations');
  });

  it('includes euro symbol in spend formatting', () => {
    const summary = formatWeeklySummary({
      totalSpend: 350.50, totalConversions: 28,
      channels: [],
      topChannels: [{ name: 'google_ads', spend: 350.50, conversions: 28, roas: 2.5 }],
      bottomChannels: [], topContent: [], recommendations: [],
    });
    expect(summary).toContain('€350.50');
  });

  it('handles channel names not in the lookup map', () => {
    const summary = formatWeeklySummary({
      totalSpend: 100, totalConversions: 5,
      channels: [],
      topChannels: [{ name: 'unknown_channel', spend: 100, conversions: 5, roas: 1.0 }],
      bottomChannels: [], topContent: [], recommendations: [],
    });
    expect(summary).toContain('unknown_channel');
  });
});
