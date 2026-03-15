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

export interface CreateAdInput {
  campaignId: string;
  primaryText: string;
  headline: string;
  description: string;
}

export interface SchedulePostInput {
  message: string;
  scheduledTime: number;
  link?: string;
}

export class MetaClient {
  constructor(private readonly config: MetaConfig) {}

  async getAdInsights(): Promise<AdInsight[]> {
    const url = `${BASE_URL}/${this.config.adAccountId}/insights?access_token=${this.config.systemUserToken}&fields=campaign_id,campaign_name,impressions,clicks,ctr,spend,actions&date_preset=last_30d&level=campaign`;

    const response = await fetch(url);
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

  async createAdDraft(input: CreateAdInput): Promise<{ adId: string }> {
    const url = `${BASE_URL}/${this.config.adAccountId}/ads`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: this.config.systemUserToken,
        status: 'PAUSED',
        creative: {
          object_story_spec: {
            page_id: this.config.pageId,
            link_data: {
              message: input.primaryText,
              name: input.headline,
              description: input.description,
            },
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`Meta API error: ${response.status}`);
    const json = await response.json() as { id: string };
    return { adId: json.id };
  }

  async schedulePost(input: SchedulePostInput): Promise<{ postId: string }> {
    const url = `${BASE_URL}/${this.config.pageId}/feed`;
    const body: Record<string, unknown> = {
      access_token: this.config.pageAccessToken,
      message: input.message,
      published: false,
      scheduled_publish_time: input.scheduledTime,
    };
    if (input.link) body.link = input.link;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Meta API error: ${response.status}`);
    const json = await response.json() as { id: string };
    return { postId: json.id };
  }

  async getPageInsights(): Promise<Record<string, unknown>> {
    const url = `${BASE_URL}/${this.config.pageId}/insights?access_token=${this.config.pageAccessToken}&metric=page_impressions,page_engaged_users&period=week`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Meta API error: ${response.status}`);
    return response.json();
  }
}
