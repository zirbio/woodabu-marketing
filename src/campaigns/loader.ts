import type { CampaignDefinition, CampaignAdSet, CampaignAd } from './schema.js';
import type { StagedItem } from '../staging/reviewer.js';

export interface LoadResult {
  campaignName: string;
  platform: 'meta' | 'google_ads';
  objective: string;
  campaignId: string | undefined;
  adSet: CampaignAdSet;
  stagedAds: StagedItem[];
  ads: CampaignAd[];
}

export function loadCampaign(definition: CampaignDefinition): LoadResult {
  const stagedAds: StagedItem[] = definition.ads.map((ad, index) => ({
    id: `${definition.campaign.name.toLowerCase().replace(/\s+/g, '-')}-ad-${index + 1}`,
    content: formatAdContent(ad),
  }));

  return {
    campaignName: definition.campaign.name,
    platform: definition.campaign.platform,
    objective: definition.campaign.objective,
    campaignId: definition.campaign.campaign_id,
    adSet: definition.ad_set,
    stagedAds,
    ads: definition.ads,
  };
}

function formatAdContent(ad: CampaignAd): string {
  return [
    `Name: ${ad.name}`,
    `Primary text: ${ad.primary_text}`,
    `Headline: ${ad.headline}`,
    `Description: ${ad.description}`,
    `CTA: ${ad.cta}`,
    `Link: ${ad.link}`,
    ad.image ? `Image: ${ad.image}` : null,
  ].filter(Boolean).join('\n');
}

export function formatCampaignPreview(definition: CampaignDefinition): string {
  const { campaign, ad_set, ads } = definition;
  const budgetEuros = (ad_set.daily_budget_cents / 100).toFixed(2);
  const { targeting } = ad_set;

  const lines: string[] = [
    `# Campaign: ${campaign.name}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Platform | ${campaign.platform} |`,
    `| Objective | ${campaign.objective} |`,
    `| Status | ${campaign.status ?? 'PAUSED'} |`,
    `| Budget | €${budgetEuros}/day |`,
    `| Targeting | Ages ${targeting.age_min}-${targeting.age_max}, ${targeting.countries.join(', ')} |`,
    `| Platforms | ${targeting.platforms.join(', ')} |`,
    `| Interests | ${targeting.interests.map(i => i.name).join(', ')} |`,
    '',
    `## Ads (${ads.length})`,
    '',
    `| # | Name | Headline | Chars | Primary Text | Chars | CTA |`,
    `|---|------|----------|-------|--------------|-------|-----|`,
    ...ads.map((ad, i) =>
      `| ${i + 1} | ${ad.name} | ${ad.headline} | ${[...ad.headline].length} | ${[...ad.primary_text].slice(0, 40).join('')}${[...ad.primary_text].length > 40 ? '...' : ''} | ${[...ad.primary_text].length} | ${ad.cta} |`
    ),
  ];

  return lines.join('\n');
}
