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
