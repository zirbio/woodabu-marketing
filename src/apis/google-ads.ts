import { GoogleAdsApi } from 'google-ads-api';

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;
}

export interface AdPerformance {
  adId: string;
  campaignId: string;
  campaignName: string;
  headlines: string[];
  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    costMicros: number;
    conversions: number;
  };
}

export interface CreateRsaInput {
  adGroupId: string;
  headlines: string[];
  descriptions: string[];
}

interface ReportRow {
  ad_group_ad: {
    ad: {
      id: string;
      responsive_search_ad?: {
        headlines: Array<{ text: string }>;
      };
    };
  };
  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    cost_micros: number;
    conversions: number;
  };
  campaign: {
    id: string;
    name: string;
  };
}

export class GoogleAdsClient {
  private readonly customer: ReturnType<InstanceType<typeof GoogleAdsApi>['Customer']>;
  private readonly customerId: string;

  constructor(config: GoogleAdsConfig) {
    const api = new GoogleAdsApi({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      developer_token: config.developerToken,
    });

    this.customerId = config.customerId;
    this.customer = api.Customer({
      customer_id: config.customerId,
      refresh_token: config.refreshToken,
    });
  }

  async getCampaignPerformance(): Promise<AdPerformance[]> {
    const rows = await this.customer.report<ReportRow[]>({
      entity: 'ad_group_ad',
      attributes: [
        'ad_group_ad.ad.id',
        'ad_group_ad.ad.responsive_search_ad.headlines',
        'campaign.id',
        'campaign.name',
      ],
      metrics: ['metrics.clicks', 'metrics.impressions', 'metrics.ctr', 'metrics.cost_micros', 'metrics.conversions'],
      date_constant: 'LAST_30_DAYS',
    });

    return rows.map((row) => ({
      adId: String(row.ad_group_ad.ad.id),
      campaignId: String(row.campaign.id),
      campaignName: String(row.campaign.name),
      headlines: row.ad_group_ad.ad.responsive_search_ad
        ? row.ad_group_ad.ad.responsive_search_ad.headlines.map((h) => h.text)
        : [],
      metrics: {
        clicks: row.metrics.clicks,
        impressions: row.metrics.impressions,
        ctr: row.metrics.ctr,
        costMicros: row.metrics.cost_micros,
        conversions: row.metrics.conversions,
      },
    }));
  }

  async createRsaAd(input: CreateRsaInput): Promise<{ resourceName: string }> {
    const adGroupAd = {
      ad_group: `customers/${this.customerId}/adGroups/${input.adGroupId}`,
      status: 'PAUSED',
      ad: {
        responsive_search_ad: {
          headlines: input.headlines.map((text) => ({
            text,
            // Don't pin — let Google Ads optimize automatically
          })),
          descriptions: input.descriptions.map((text) => ({ text })),
        },
      },
    };

    const response = await this.customer.mutateResources([
      {
        entity: 'ad_group_ad',
        operation: 'create',
        resource: adGroupAd,
        ...adGroupAd,
      },
    ]);

    const mutateResponse = response as unknown as {
      results?: Array<{ resource_name: string }>;
      mutate_operation_responses?: Array<{ ad_group_ad_result?: { resource_name: string } }>;
    };

    if (mutateResponse.results && mutateResponse.results.length > 0) {
      return { resourceName: mutateResponse.results[0].resource_name };
    }

    if (mutateResponse.mutate_operation_responses && mutateResponse.mutate_operation_responses.length > 0) {
      const adGroupAdResult = mutateResponse.mutate_operation_responses[0].ad_group_ad_result;
      if (adGroupAdResult) {
        return { resourceName: adGroupAdResult.resource_name };
      }
    }

    throw new Error('Unexpected mutate response format');
  }

  static rankPerformers(ads: AdPerformance[]): { top: AdPerformance[]; bottom: AdPerformance[] } {
    const sorted = [...ads].sort((a, b) => b.metrics.ctr - a.metrics.ctr);
    const top = sorted.slice(0, 3);
    const bottom = sorted.slice(-3).reverse();
    return { top, bottom };
  }
}
