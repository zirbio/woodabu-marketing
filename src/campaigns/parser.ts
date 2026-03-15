import yaml from 'js-yaml';
import fs from 'node:fs';
import { validateCampaignYaml, type CampaignDefinition } from './schema.js';

export function parseCampaignString(content: string): CampaignDefinition {
  const parsed = yaml.load(content);

  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('Campaign YAML must be a non-empty object');
  }

  const data = parsed as Record<string, unknown>;

  // Default status to PAUSED if not specified
  if (data.campaign && typeof data.campaign === 'object') {
    const campaign = data.campaign as Record<string, unknown>;
    if (!campaign.status) {
      campaign.status = 'PAUSED';
    }
  }

  const result = validateCampaignYaml(data);
  if (!result.valid) {
    throw new Error(`Campaign validation failed:\n${result.errors.join('\n')}`);
  }

  return data as unknown as CampaignDefinition;
}

export function parseCampaignFile(filePath: string): CampaignDefinition {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseCampaignString(content);
}
