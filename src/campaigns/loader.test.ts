import { describe, it, expect, vi } from 'vitest';
import { loadCampaign, formatCampaignPreview, type LoadResult } from './loader.js';
import type { CampaignDefinition } from './schema.js';

const validDefinition: CampaignDefinition = {
  campaign: {
    name: 'Spring Sale 2026',
    platform: 'meta',
    objective: 'OUTCOME_SALES',
    status: 'PAUSED',
  },
  ad_set: {
    name: 'Spring - Eco',
    daily_budget_cents: 1500,
    targeting: {
      age_min: 25,
      age_max: 55,
      genders: [0],
      countries: ['ES'],
      interests: [{ id: '6003139266461', name: 'Sustainable living' }],
      platforms: ['facebook', 'instagram'],
    },
  },
  ads: [
    {
      name: 'Spring Ad 1',
      primary_text: 'Muebles artesanales de madera maciza.',
      headline: 'Madera con propósito',
      description: 'Hecho a mano',
      cta: 'SHOP_NOW',
      link: 'https://woodabu.com',
    },
    {
      name: 'Spring Ad 2',
      primary_text: 'Cada pieza es única, hecha en nuestro taller.',
      headline: 'Artesanía real',
      description: 'Desde Madrid',
      cta: 'LEARN_MORE',
      link: 'https://woodabu.com/taller',
    },
  ],
};

describe('formatCampaignPreview', () => {
  it('formats campaign as readable markdown table', () => {
    const preview = formatCampaignPreview(validDefinition);
    expect(preview).toContain('Spring Sale 2026');
    expect(preview).toContain('meta');
    expect(preview).toContain('PAUSED');
    expect(preview).toContain('Spring Ad 1');
    expect(preview).toContain('Spring Ad 2');
    expect(preview).toContain('Madera con propósito');
  });

  it('includes targeting summary', () => {
    const preview = formatCampaignPreview(validDefinition);
    expect(preview).toContain('25-55');
    expect(preview).toContain('ES');
    expect(preview).toContain('€15.00/day');
  });

  it('shows character counts for ad copy', () => {
    const preview = formatCampaignPreview(validDefinition);
    // headline "Madera con propósito" = 20 chars
    expect(preview).toMatch(/20/);
  });
});

describe('loadCampaign', () => {
  it('returns staged items from campaign definition', () => {
    const result = loadCampaign(validDefinition);
    expect(result.campaignName).toBe('Spring Sale 2026');
    expect(result.platform).toBe('meta');
    expect(result.stagedAds).toHaveLength(2);
    expect(result.stagedAds[0].id).toBeDefined();
    expect(result.stagedAds[0].content).toContain('Madera con propósito');
  });

  it('generates unique ids for each staged ad', () => {
    const result = loadCampaign(validDefinition);
    const ids = result.stagedAds.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves all ad fields in staged content', () => {
    const result = loadCampaign(validDefinition);
    const first = result.stagedAds[0];
    expect(first.content).toContain('Muebles artesanales');
    expect(first.content).toContain('Madera con propósito');
    expect(first.content).toContain('SHOP_NOW');
  });

  it('includes targeting and budget in result', () => {
    const result = loadCampaign(validDefinition);
    expect(result.adSet.daily_budget_cents).toBe(1500);
    expect(result.adSet.targeting.countries).toEqual(['ES']);
  });
});
