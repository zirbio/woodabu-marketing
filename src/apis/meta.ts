import { fetchWithRetry } from '../utils/api-retry.js';

const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export interface MetaConfig {
  systemUserToken: string;
  tokenExpiry: string;
  adAccountId: string;
  pageId: string;
  pageAccessToken: string;
}

export interface AdInsight {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
}

export class MetaClient {
  constructor(private readonly config: MetaConfig) {}

  async getAdInsights(): Promise<AdInsight[]> {
    const url = `${BASE_URL}/${this.config.adAccountId}/insights?fields=campaign_id,campaign_name,impressions,clicks,ctr,spend,actions&date_preset=last_30d&level=campaign`;

    const response = await fetchWithRetry(url, {
      headers: { 'Authorization': `Bearer ${this.config.systemUserToken}` },
    });
    if (!response.ok) throw new Error(`Meta API error: ${response.status}`);
    const json = await response.json() as { data: Record<string, unknown>[] };

    return json.data.map((row) => {
      const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? [];
      const purchases = actions.find((a) => a.action_type === 'purchase');
      return {
        campaignId: String(row.campaign_id),
        campaignName: String(row.campaign_name),
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        ctr: Number(row.ctr),
        spend: Number(row.spend),
        conversions: purchases ? Number(purchases.value) : 0,
      };
    });
  }

  async getPageInsights(): Promise<Record<string, unknown>> {
    const url = `${BASE_URL}/${this.config.pageId}/insights?metric=page_impressions,page_engaged_users&period=week`;
    const response = await fetchWithRetry(url, {
      headers: { 'Authorization': `Bearer ${this.config.pageAccessToken}` },
    });
    if (!response.ok) throw new Error(`Meta API error: ${response.status}`);
    return response.json();
  }
}
