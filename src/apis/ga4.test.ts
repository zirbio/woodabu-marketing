import { describe, it, expect, vi } from 'vitest';
import { GA4Client } from './ga4.js';

const ga4RunReportMock = vi.fn().mockResolvedValue([
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
]);

vi.mock('@google-analytics/data', () => {
  return {
    BetaAnalyticsDataClient: vi.fn().mockImplementation(function () {
      return { runReport: ga4RunReportMock };
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

describe('GA4Client — edge cases', () => {
  it('returns empty array when response has no rows', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{ rows: undefined }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data).toEqual([]);
  });

  it('returns empty array when response rows is null', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{ rows: null }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data).toEqual([]);
  });

  it('handles missing dimensionValues gracefully', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{
      rows: [{ dimensionValues: undefined, metricValues: [{ value: '100' }, { value: '5' }, { value: '5.0' }] }],
    }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data[0].channel).toBe('Unknown');
  });

  it('handles missing metricValues gracefully', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{
      rows: [{ dimensionValues: [{ value: 'Test' }, { value: '20260315' }], metricValues: undefined }],
    }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data[0].sessions).toBe(0);
    expect(data[0].conversions).toBe(0);
    expect(data[0].conversionRate).toBe(0);
  });

  it('handles single channel response', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{
      rows: [{ dimensionValues: [{ value: 'Direct' }, { value: '20260315' }], metricValues: [{ value: '300' }, { value: '10' }, { value: '3.3' }] }],
    }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data).toHaveLength(1);
  });

  it('sorts many channels by sessions descending', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{
      rows: [
        { dimensionValues: [{ value: 'A' }, { value: '20260315' }], metricValues: [{ value: '100' }, { value: '5' }, { value: '5.0' }] },
        { dimensionValues: [{ value: 'B' }, { value: '20260315' }], metricValues: [{ value: '500' }, { value: '25' }, { value: '5.0' }] },
        { dimensionValues: [{ value: 'C' }, { value: '20260315' }], metricValues: [{ value: '300' }, { value: '15' }, { value: '5.0' }] },
        { dimensionValues: [{ value: 'D' }, { value: '20260315' }], metricValues: [{ value: '50' }, { value: '2' }, { value: '4.0' }] },
        { dimensionValues: [{ value: 'E' }, { value: '20260315' }], metricValues: [{ value: '1000' }, { value: '50' }, { value: '5.0' }] },
      ],
    }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    for (let i = 0; i < data.length - 1; i++) {
      expect(data[i].sessions).toBeGreaterThanOrEqual(data[i + 1].sessions);
    }
  });

  it('converts string metric values to numbers', async () => {
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(typeof data[0].sessions).toBe('number');
    expect(typeof data[0].conversions).toBe('number');
    expect(typeof data[0].conversionRate).toBe('number');
  });

  it('handles zero values correctly', async () => {
    ga4RunReportMock.mockResolvedValueOnce([{
      rows: [{ dimensionValues: [{ value: 'Test' }, { value: '20260315' }], metricValues: [{ value: '0' }, { value: '0' }, { value: '0' }] }],
    }]);
    const client = new GA4Client({ propertyId: 'properties/123', serviceAccountKeyPath: 'test.json' });
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data[0].sessions).toBe(0);
    expect(data[0].conversions).toBe(0);
    expect(Number.isNaN(data[0].sessions)).toBe(false);
  });
});
