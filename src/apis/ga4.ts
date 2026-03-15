import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GA4Config {
  propertyId: string;
  serviceAccountKeyPath: string;
}

export interface ChannelTraffic {
  channel: string;
  date: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
}

export class GA4Client {
  private readonly client: BetaAnalyticsDataClient;
  private readonly propertyId: string;

  constructor(config: GA4Config) {
    this.client = new BetaAnalyticsDataClient({
      keyFilename: config.serviceAccountKeyPath,
    });
    this.propertyId = config.propertyId;
  }

  async getTrafficByChannel(startDate: string, endDate: string): Promise<ChannelTraffic[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'sessionConversionRate' }],
    });

    if (!response.rows) return [];

    const results = response.rows.map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? 'Unknown',
      date: row.dimensionValues?.[1]?.value ?? '',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      conversions: Number(row.metricValues?.[1]?.value ?? 0),
      conversionRate: Number(row.metricValues?.[2]?.value ?? 0),
    }));

    return results.sort((a, b) => b.sessions - a.sessions);
  }
}
