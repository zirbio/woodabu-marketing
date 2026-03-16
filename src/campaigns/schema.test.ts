import { describe, it, expect } from 'vitest';
import { validateCampaignYaml, type CampaignDefinition } from './schema.js';

describe('validateCampaignYaml', () => {
  const validCampaign: CampaignDefinition = {
    campaign: {
      name: 'Spring Sale 2026',
      platform: 'meta',
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
    },
    ad_set: {
      name: 'Spring - Eco Conscious',
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
        name: 'Spring Eco Ad 1',
        primary_text: 'Muebles artesanales de madera maciza, hechos a mano en Madrid.',
        headline: 'Madera con propósito',
        description: 'Hecho a mano en Madrid',
        cta: 'SHOP_NOW',
        link: 'https://woodabu.com/colecciones/zero-waste',
      },
    ],
  };

  it('accepts a valid campaign definition', () => {
    const result = validateCampaignYaml(validCampaign);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects missing campaign.name', () => {
    const invalid = structuredClone(validCampaign);
    (invalid.campaign as any).name = undefined;
    delete (invalid.campaign as any).name;
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid platform', () => {
    const invalid = structuredClone(validCampaign);
    (invalid.campaign as any).platform = 'tiktok';
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
  });

  it('rejects empty ads array', () => {
    const invalid = structuredClone(validCampaign);
    invalid.ads = [];
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
  });

  it('defaults status to PAUSED when omitted', () => {
    const withoutStatus = structuredClone(validCampaign);
    delete (withoutStatus.campaign as any).status;
    const result = validateCampaignYaml(withoutStatus);
    expect(result.valid).toBe(true);
  });

  it('rejects status other than PAUSED', () => {
    const invalid = structuredClone(validCampaign);
    (invalid.campaign as any).status = 'ACTIVE';
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('PAUSED'))).toBe(true);
  });

  it('rejects age_min < 18', () => {
    const invalid = structuredClone(validCampaign);
    invalid.ad_set.targeting.age_min = 15;
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
  });

  it('rejects age_max > 65', () => {
    const invalid = structuredClone(validCampaign);
    invalid.ad_set.targeting.age_max = 70;
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
  });

  it('rejects negative daily_budget_cents', () => {
    const invalid = structuredClone(validCampaign);
    invalid.ad_set.daily_budget_cents = -100;
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
  });

  it('rejects ad with link not starting with https://', () => {
    const invalid = structuredClone(validCampaign);
    invalid.ads[0].link = 'http://woodabu.com';
    const result = validateCampaignYaml(invalid);
    expect(result.valid).toBe(false);
  });
});
