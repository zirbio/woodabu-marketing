import Ajv from 'ajv';

// --- TypeScript types ---

export type Platform = 'meta' | 'google_ads';

export const VALID_CTAS = ['LEARN_MORE', 'SIGN_UP', 'DOWNLOAD', 'SHOP_NOW', 'BOOK_NOW', 'GET_OFFER', 'SUBSCRIBE', 'CONTACT_US', 'APPLY_NOW', 'WATCH_MORE'] as const;
export type CtaType = typeof VALID_CTAS[number];

export interface CampaignTargeting {
  age_min: number;
  age_max: number;
  genders: number[];
  countries: string[];
  interests: Array<{ id: string; name: string }>;
  platforms: Array<'facebook' | 'instagram'>;
}

export interface CampaignAdSet {
  name: string;
  daily_budget_cents: number;
  targeting: CampaignTargeting;
}

export interface CampaignAd {
  name: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: CtaType;
  link: string;
  image?: string;
}

export interface CampaignDefinition {
  campaign: {
    name: string;
    platform: Platform;
    objective: string;
    status?: 'PAUSED';
    campaign_id?: string;
  };
  ad_set: CampaignAdSet;
  ads: CampaignAd[];
}

export interface CampaignValidationResult {
  valid: boolean;
  errors: string[];
}

// --- JSON Schema ---

const campaignJsonSchema = {
  type: 'object',
  required: ['campaign', 'ad_set', 'ads'],
  properties: {
    campaign: {
      type: 'object',
      required: ['name', 'platform', 'objective'],
      properties: {
        name: { type: 'string', minLength: 1 },
        platform: { type: 'string', enum: ['meta', 'google_ads'] },
        objective: { type: 'string', minLength: 1 },
        status: { type: 'string', enum: ['PAUSED'] },
        campaign_id: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
    ad_set: {
      type: 'object',
      required: ['name', 'daily_budget_cents', 'targeting'],
      properties: {
        name: { type: 'string', minLength: 1 },
        daily_budget_cents: { type: 'integer', minimum: 1 },
        targeting: {
          type: 'object',
          required: ['age_min', 'age_max', 'genders', 'countries', 'interests', 'platforms'],
          properties: {
            age_min: { type: 'integer', minimum: 18 },
            age_max: { type: 'integer', maximum: 65 },
            genders: { type: 'array', items: { type: 'integer', enum: [0, 1, 2] }, minItems: 1 },
            countries: { type: 'array', items: { type: 'string', minLength: 2, maxLength: 2 }, minItems: 1 },
            interests: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
            platforms: {
              type: 'array',
              items: { type: 'string', enum: ['facebook', 'instagram'] },
              minItems: 1,
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    ads: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'primary_text', 'headline', 'description', 'cta', 'link'],
        properties: {
          name: { type: 'string', minLength: 1 },
          primary_text: { type: 'string', minLength: 1 },
          headline: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          cta: {
            type: 'string',
            enum: [...VALID_CTAS],
          },
          link: { type: 'string', pattern: '^https://' },
          image: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

// --- Validation ---

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(campaignJsonSchema);

export function validateCampaignYaml(data: unknown): CampaignValidationResult {
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((err) => {
    const path = err.instancePath || '/';
    if (err.keyword === 'enum') {
      const hint = path.includes('status') ? ' — status must be PAUSED' : '';
      return `${path}: must be one of ${JSON.stringify(err.params.allowedValues)}${hint}`;
    }
    return `${path}: ${err.message}`;
  });

  return { valid: false, errors };
}
