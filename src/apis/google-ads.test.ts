import { describe, it, expect, vi } from 'vitest';
import { GoogleAdsClient } from './google-ads.js';

vi.mock('google-ads-api', () => {
  const mockCustomer = {
    report: vi.fn().mockResolvedValue([
      {
        ad_group_ad: { ad: { id: '1', responsive_search_ad: { headlines: [{ text: 'Test' }] } } },
        metrics: { clicks: 100, impressions: 2000, ctr: 0.05, cost_micros: 5000000, conversions: 10 },
        campaign: { id: '1', name: 'Campaign 1' },
      },
    ]),
    mutateResources: vi.fn().mockResolvedValue({ results: [{ resource_name: 'customers/123/adGroupAds/456' }] }),
    credentials: { customer_id: '123' },
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

  it('creates ads in PAUSED state', async () => {
    const client = new GoogleAdsClient(config);
    const result = await client.createRsaAd({
      adGroupId: 'ag_1',
      headlines: ['Headline 1'],
      descriptions: ['Description 1'],
    });
    expect(result.resourceName).toContain('adGroupAds');
  });

  it('returns top and bottom performers', async () => {
    const client = new GoogleAdsClient(config);
    const perf = await client.getCampaignPerformance();
    const { top, bottom } = GoogleAdsClient.rankPerformers(perf);
    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
  });
});
