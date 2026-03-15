export interface GoogleAdsInput {
  campaignName: string;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
}

export interface MetaInput {
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
}

export interface GA4Input {
  channel: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
}

export interface ShopifyInput {
  totalSales: number;
  totalOrders: number;
  aov: number;
  topProducts: Array<{ title: string; units: number }>;
}

export interface ChannelSummary {
  name: string;
  spend: number;
  conversions: number;
  roas: number;
}

export interface WeeklyAggregate {
  totalSpend: number;
  totalConversions: number;
  channels: ChannelSummary[];
  topChannels: ChannelSummary[];
  bottomChannels: ChannelSummary[];
  topContent: Array<{ name: string; metric: string; value: number }>;
  recommendations: string[];
}

export interface AggregatorInput {
  googleAds: GoogleAdsInput[];
  meta: MetaInput[];
  ga4: GA4Input[];
  shopify: ShopifyInput;
}

export function aggregateWeekly(input: AggregatorInput): WeeklyAggregate {
  const googleSpend = input.googleAds.reduce((s, a) => s + a.spend, 0);
  const googleConv = input.googleAds.reduce((s, a) => s + a.conversions, 0);
  const metaSpend = input.meta.reduce((s, a) => s + a.spend, 0);
  const metaConv = input.meta.reduce((s, a) => s + a.conversions, 0);

  const totalSpend = googleSpend + metaSpend;
  const totalConversions = googleConv + metaConv;

  const channels: ChannelSummary[] = [];

  if (googleSpend > 0 || googleConv > 0) {
    channels.push({
      name: 'google_ads',
      spend: googleSpend,
      conversions: googleConv,
      roas: googleSpend > 0 ? googleConv / googleSpend : 0,
    });
  }

  if (metaSpend > 0 || metaConv > 0) {
    channels.push({
      name: 'meta',
      spend: metaSpend,
      conversions: metaConv,
      roas: metaSpend > 0 ? metaConv / metaSpend : 0,
    });
  }

  if (input.ga4.length > 0) {
    const ga4Conv = input.ga4.reduce((s, c) => s + c.conversions, 0);
    channels.push({ name: 'organic', spend: 0, conversions: ga4Conv, roas: Infinity });
  }

  const sorted = [...channels].sort((a, b) => b.roas - a.roas);
  const topChannels = sorted.slice(0, 3);
  const bottomChannels = [...channels].sort((a, b) => a.roas - b.roas).slice(0, 3);

  const recommendations: string[] = [];
  if (topChannels.length > 0 && topChannels[0].roas > 2) {
    recommendations.push(`Increase budget on ${topChannels[0].name} — ROAS of ${topChannels[0].roas.toFixed(1)}`);
  }

  return {
    totalSpend,
    totalConversions,
    channels,
    topChannels,
    bottomChannels,
    topContent: input.shopify.topProducts.map((p) => ({ name: p.title, metric: 'units_sold', value: p.units })),
    recommendations,
  };
}

export function formatWeeklySummary(data: WeeklyAggregate): string {
  const channelNames: Record<string, string> = { google_ads: 'Google Ads', meta: 'Meta Ads', organic: 'Organic' };
  const lines: string[] = [
    '# Weekly Marketing Summary',
    '',
    `**Total spend:** €${data.totalSpend.toFixed(2)}`,
    `**Total conversions:** ${data.totalConversions}`,
    '',
    '## Top Channels (by ROAS)',
    ...data.topChannels.map((c, i) => `${i + 1}. **${channelNames[c.name] ?? c.name}** — ${c.conversions} conversions, €${c.spend.toFixed(2)} spend, ROAS ${c.roas === Infinity ? '∞' : c.roas.toFixed(1)}`),
    '',
    '## Recommendations',
    ...data.recommendations.map((r) => `- ${r}`),
  ];

  return lines.join('\n');
}
