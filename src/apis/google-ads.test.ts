import { describe, it, expect, vi } from 'vitest';
import { GoogleAdsClient } from './google-ads.js';

const googleAdsReportMock = vi.fn().mockResolvedValue([
  {
    ad_group_ad: { ad: { id: '1', responsive_search_ad: { headlines: [{ text: 'Test' }] } } },
    metrics: { clicks: 100, impressions: 2000, ctr: 0.05, cost_micros: 5000000, conversions: 10 },
    campaign: { id: '1', name: 'Campaign 1' },
  },
]);

vi.mock('google-ads-api', () => {
  return {
    GoogleAdsApi: vi.fn().mockImplementation(function () {
      return {
        Customer: vi.fn().mockImplementation(function () {
          return {
            report: googleAdsReportMock,
            credentials: { customer_id: '123' },
          };
        }),
      };
    }),
  };
});

describe('GoogleAdsClient', () => {
  const config = {
    clientId: 'test-id',
    clientSecret: 'test-secret',
    refreshToken: 'test-refresh',
    developerToken: 'test-dev',
    customerId: '123',
  };

  it('fetches campaign performance', async () => {
    const client = new GoogleAdsClient(config);
    const results = await client.getCampaignPerformance();
    expect(results).toHaveLength(1);
    expect(results[0].metrics.ctr).toBe(0.05);
  });

  it('returns top and bottom performers', async () => {
    const client = new GoogleAdsClient(config);
    const perf = await client.getCampaignPerformance();
    const { top, bottom } = GoogleAdsClient.rankPerformers(perf);
    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
  });
});

describe('GoogleAdsClient — getCampaignPerformance edge cases', () => {
  const config = {
    clientId: 'test-id', clientSecret: 'test-secret', refreshToken: 'test-refresh',
    developerToken: 'test-dev', customerId: '123',
  };

  it('handles ads without responsive_search_ad', async () => {
    googleAdsReportMock.mockResolvedValueOnce([
      { ad_group_ad: { ad: { id: '1' } }, metrics: { clicks: 10, impressions: 200, ctr: 0.05, cost_micros: 500000, conversions: 1 }, campaign: { id: 'c1', name: 'Test' } },
    ]);
    const client = new GoogleAdsClient(config);
    const results = await client.getCampaignPerformance();
    expect(results[0].headlines).toEqual([]);
  });

  it('handles multiple ads across campaigns', async () => {
    googleAdsReportMock.mockResolvedValueOnce(Array.from({ length: 5 }, (_, i) => ({
      ad_group_ad: { ad: { id: String(i), responsive_search_ad: { headlines: [{ text: `H${i}` }] } } },
      metrics: { clicks: 10, impressions: 200, ctr: 0.05, cost_micros: 500000, conversions: 1 },
      campaign: { id: `c${i % 2}`, name: `Campaign ${i % 2}` },
    })));
    const client = new GoogleAdsClient(config);
    const results = await client.getCampaignPerformance();
    expect(results).toHaveLength(5);
  });
});

describe('GoogleAdsClient — rankPerformers', () => {
  it('returns top 3 and bottom 3 by CTR', () => {
    const ads = Array.from({ length: 10 }, (_, i) => ({
      adId: String(i), campaignId: 'c1', campaignName: 'Test', headlines: ['H'],
      metrics: { clicks: 10, impressions: 100, ctr: (i + 1) * 0.01, costMicros: 100000, conversions: 1 },
    }));
    const { top, bottom } = GoogleAdsClient.rankPerformers(ads);
    expect(top).toHaveLength(3);
    expect(bottom).toHaveLength(3);
    expect(top[0].metrics.ctr).toBe(0.1);
    expect(bottom[0].metrics.ctr).toBe(0.01);
  });

  it('handles array with fewer than 3 items', () => {
    const ads = [
      { adId: '1', campaignId: 'c1', campaignName: 'Test', headlines: [] as string[], metrics: { clicks: 10, impressions: 100, ctr: 0.1, costMicros: 100000, conversions: 1 } },
      { adId: '2', campaignId: 'c1', campaignName: 'Test', headlines: [] as string[], metrics: { clicks: 5, impressions: 100, ctr: 0.05, costMicros: 50000, conversions: 0 } },
    ];
    const { top, bottom } = GoogleAdsClient.rankPerformers(ads);
    expect(top).toHaveLength(2);
    expect(bottom).toHaveLength(2);
  });

  it('handles empty array', () => {
    const { top, bottom } = GoogleAdsClient.rankPerformers([]);
    expect(top).toEqual([]);
    expect(bottom).toEqual([]);
  });

  it('handles ads with equal CTR', () => {
    const ads = Array.from({ length: 5 }, (_, i) => ({
      adId: String(i), campaignId: 'c1', campaignName: 'Test', headlines: [] as string[],
      metrics: { clicks: 10, impressions: 200, ctr: 0.05, costMicros: 100000, conversions: 1 },
    }));
    const { top, bottom } = GoogleAdsClient.rankPerformers(ads);
    expect(top).toHaveLength(3);
    expect(bottom).toHaveLength(3);
  });
});
