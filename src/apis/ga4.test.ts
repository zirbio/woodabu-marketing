import { describe, it, expect, vi } from 'vitest';
import { GA4Client } from './ga4.js';

vi.mock('@google-analytics/data', () => {
  return {
    BetaAnalyticsDataClient: vi.fn().mockImplementation(function () {
      return {
        runReport: vi.fn().mockResolvedValue([
          {
            rows: [
              {
                dimensionValues: [{ value: 'Organic Search' }, { value: '20260315' }],
                metricValues: [{ value: '1500' }, { value: '45' }, { value: '3.2' }],
              },
              {
                dimensionValues: [{ value: 'Paid Search' }, { value: '20260315' }],
                metricValues: [{ value: '800' }, { value: '30' }, { value: '4.1' }],
              },
            ],
          },
        ]),
      };
    }),
  };
});

describe('GA4Client', () => {
  const config = { propertyId: 'properties/123', serviceAccountKeyPath: 'credentials/test.json' };

  it('fetches traffic by channel', async () => {
    const client = new GA4Client(config);
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data).toHaveLength(2);
    expect(data[0].channel).toBe('Organic Search');
    expect(data[0].sessions).toBe(1500);
  });

  it('sorts channels by sessions descending', async () => {
    const client = new GA4Client(config);
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data[0].sessions).toBeGreaterThanOrEqual(data[1].sessions);
  });
});
