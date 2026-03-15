import { describe, it, expect } from 'vitest';
import { parseCampaignFile, parseCampaignString } from './parser.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('parseCampaignString', () => {
  const validYaml = `
campaign:
  name: Spring Sale 2026
  platform: meta
  objective: OUTCOME_SALES

ad_set:
  name: Spring - Eco Conscious
  daily_budget_cents: 1500
  targeting:
    age_min: 25
    age_max: 55
    genders: [0]
    countries: ["ES"]
    interests:
      - id: "6003139266461"
        name: Sustainable living
    platforms: [facebook, instagram]

ads:
  - name: Spring Eco Ad 1
    primary_text: Muebles artesanales de madera maciza.
    headline: Madera con propósito
    description: Hecho a mano en Madrid
    cta: SHOP_NOW
    link: https://woodabu.com/colecciones/zero-waste
`;

  it('parses valid YAML string into CampaignDefinition', () => {
    const result = parseCampaignString(validYaml);
    expect(result.campaign.name).toBe('Spring Sale 2026');
    expect(result.campaign.platform).toBe('meta');
    expect(result.campaign.status).toBe('PAUSED');
    expect(result.ads).toHaveLength(1);
    expect(result.ads[0].cta).toBe('SHOP_NOW');
  });

  it('defaults status to PAUSED', () => {
    const result = parseCampaignString(validYaml);
    expect(result.campaign.status).toBe('PAUSED');
  });

  it('throws on invalid YAML syntax', () => {
    expect(() => parseCampaignString('{{invalid')).toThrow();
  });

  it('throws on schema validation failure', () => {
    const badYaml = `
campaign:
  name: Test
  platform: tiktok
  objective: SALES
ad_set:
  name: Test
  daily_budget_cents: 100
  targeting:
    age_min: 25
    age_max: 55
    genders: [0]
    countries: ["ES"]
    interests: []
    platforms: [facebook]
ads:
  - name: Ad 1
    primary_text: text
    headline: head
    description: desc
    cta: SHOP_NOW
    link: https://example.com
`;
    expect(() => parseCampaignString(badYaml)).toThrow(/platform/);
  });
});

describe('parseCampaignFile', () => {
  it('reads and parses a YAML file from disk', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-test-'));
    const filePath = path.join(tmpDir, 'test.yaml');
    const yaml = `
campaign:
  name: File Test
  platform: meta
  objective: OUTCOME_TRAFFIC
ad_set:
  name: Test Set
  daily_budget_cents: 500
  targeting:
    age_min: 18
    age_max: 65
    genders: [0]
    countries: ["ES"]
    interests:
      - id: "123"
        name: Test
    platforms: [facebook]
ads:
  - name: Ad 1
    primary_text: Test text
    headline: Test headline
    description: Test desc
    cta: LEARN_MORE
    link: https://woodabu.com
`;
    fs.writeFileSync(filePath, yaml, 'utf-8');

    const result = parseCampaignFile(filePath);
    expect(result.campaign.name).toBe('File Test');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('throws if file does not exist', () => {
    expect(() => parseCampaignFile('/nonexistent/path.yaml')).toThrow();
  });
});
