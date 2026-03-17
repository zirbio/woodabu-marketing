import { describe, it, expect } from 'vitest';
import { parseCampaignString } from './parser.js';
import { loadCampaign, formatCampaignPreview } from './loader.js';

describe('Campaign YAML → Staging flow integration', () => {
  const campaignYaml = `
campaign:
  name: Integration Test Campaign
  platform: meta
  objective: OUTCOME_TRAFFIC

ad_set:
  name: Test Ad Set
  daily_budget_cents: 1000
  targeting:
    age_min: 25
    age_max: 50
    genders: [0]
    countries: ["ES"]
    interests:
      - id: "123"
        name: Furniture
    platforms: [facebook]

ads:
  - name: Ad One
    primary_text: Primera pieza de texto para el anuncio.
    headline: Titular uno
    description: Descripción uno
    cta: SHOP_NOW
    link: https://woodabu.com/1
  - name: Ad Two
    primary_text: Segunda pieza de texto para el anuncio.
    headline: Titular dos
    description: Descripción dos
    cta: LEARN_MORE
    link: https://woodabu.com/2
  - name: Ad Three
    primary_text: Tercera pieza de texto para el anuncio.
    headline: Titular tres
    description: Descripción tres
    cta: SHOP_NOW
    link: https://woodabu.com/3
`;

  it('full flow: parse → load → preview → stage → apply decisions', () => {
    // Step 1: Parse YAML
    const definition = parseCampaignString(campaignYaml);
    expect(definition.campaign.name).toBe('Integration Test Campaign');
    expect(definition.campaign.status).toBe('PAUSED');
    expect(definition.ads).toHaveLength(3);

    // Step 2: Load into staged items
    const loaded = loadCampaign(definition);
    expect(loaded.stagedAds).toHaveLength(3);
    expect(loaded.platform).toBe('meta');

    // Step 3: Format preview (uses our campaign-specific formatter, not reviewer's formatAdTable)
    const preview = formatCampaignPreview(definition);
    expect(preview).toContain('Integration Test Campaign');
    expect(preview).toContain('€10.00/day');
    expect(preview).toContain('25-50');
    expect(preview).toContain('Titular uno');

    // Step 4: Verify staged ads contain structured content
    expect(loaded.stagedAds[0].content).toContain('Titular uno');
    expect(loaded.stagedAds[1].content).toContain('Titular dos');
    expect(loaded.stagedAds[2].content).toContain('Titular tres');
  });

  it('rejects invalid YAML before reaching loader', () => {
    const badYaml = `
campaign:
  name: Bad Campaign
  platform: tiktok
  objective: SALES
ad_set:
  name: Set
  daily_budget_cents: 100
  targeting:
    age_min: 25
    age_max: 55
    genders: [0]
    countries: ["ES"]
    interests: []
    platforms: [facebook]
ads:
  - name: Ad
    primary_text: text
    headline: head
    description: desc
    cta: SHOP_NOW
    link: https://example.com
`;
    expect(() => parseCampaignString(badYaml)).toThrow(/platform/);
  });
});
