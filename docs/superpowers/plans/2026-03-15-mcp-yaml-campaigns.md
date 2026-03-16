# MCP Read-Only Integration + YAML Campaign Definitions

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate external MCP servers for read-only ad analytics and add YAML-based declarative campaign definitions that feed into the existing staging/review pipeline.

**Architecture:** Two independent layers: (1) MCP config for Meta & Google Ads read-only servers — zero code, just settings; (2) A YAML campaign schema with a parser module that loads campaign definitions and feeds them through the existing `MetaClient.createAdDraft()` → `reviewer.ts` staging flow. The YAML layer adds a new `src/campaigns/` module with schema validation, a parser, and integration with existing APIs.

**Tech Stack:** TypeScript, Vitest, `js-yaml` (YAML parsing), `ajv` (JSON Schema validation), existing `fetchWithRetry`, existing `MetaClient`/`GoogleAdsClient`

---

## File Structure

```
New files:
  .claude/settings.local.json          — MCP server configuration (gitignored)
  src/campaigns/schema.ts              — Campaign YAML type definitions + JSON Schema
  src/campaigns/parser.ts              — YAML loading, validation, resolution
  src/campaigns/loader.ts              — Orchestrates: parse → validate → stage → create
  src/campaigns/schema.test.ts         — Schema validation tests
  src/campaigns/parser.test.ts         — Parser unit tests
  src/campaigns/loader.test.ts         — Loader integration tests
  campaigns/                           — Campaign YAML files directory
  campaigns/example.yaml               — Example campaign file
  commands/campaign.md                  — Slash command for /campaign

Modified files:
  package.json                         — Add js-yaml + @types/js-yaml + ajv deps
  .env.example                         — Document MCP-related notes
  .gitignore                           — Add .claude/settings.local.json
  CLAUDE.md                            — Document new campaigns/ directory and MCP setup
```

---

## Chunk 1: MCP Server Configuration (Read-Only Analytics)

### Task 1: Configure MCP servers for Claude Code

This task requires zero code — only configuration files.

**Files:**
- Create: `.claude/settings.local.json`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `.claude/settings.local.json` to `.gitignore`**

The MCP config contains tokens — it must never be committed.

Add to `.gitignore`:
```
# Claude Code local settings (contains MCP tokens)
.claude/settings.local.json
```

- [ ] **Step 2: Run `git diff` to verify only the gitignore line was added**

Run: `git diff .gitignore`
Expected: Only the new line appears.

- [ ] **Step 3: Create `.claude/settings.local.json` with MCP server config**

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "uvx",
      "args": ["meta-ads-mcp"],
      "env": {
        "META_APP_ID": "YOUR_META_APP_ID_HERE",
        "META_APP_SECRET": "YOUR_META_APP_SECRET_HERE",
        "META_ACCESS_TOKEN": "YOUR_META_SYSTEM_USER_TOKEN_HERE"
      }
    },
    "google-ads": {
      "command": "uvx",
      "args": ["google-ads-mcp"],
      "env": {
        "GOOGLE_ADS_DEVELOPER_TOKEN": "YOUR_DEVELOPER_TOKEN_HERE",
        "GOOGLE_ADS_CLIENT_ID": "YOUR_CLIENT_ID_HERE",
        "GOOGLE_ADS_CLIENT_SECRET": "YOUR_CLIENT_SECRET_HERE",
        "GOOGLE_ADS_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN_HERE",
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "YOUR_CUSTOMER_ID_HERE"
      }
    }
  }
}
```

> **Note:** Replace ALL placeholder values with real credentials. MCP servers do NOT read `.env` — you must copy the actual token values here. The mapping from `.env` vars is:
> - `META_ACCESS_TOKEN` ← value of `META_SYSTEM_USER_TOKEN` from `.env`
> - `META_APP_ID` ← your Facebook App ID (NOT the ad account ID — this is a separate numeric ID from Meta Developer Console)
> - `META_APP_SECRET` ← your Facebook App Secret from Meta Developer Console
> - `GOOGLE_ADS_*` ← corresponding values from `.env`

- [ ] **Step 4: Update `.env.example` with MCP notes**

Add a comment block at the bottom of `.env.example`:

```bash
# MCP Servers (read-only analytics)
# These are configured in .claude/settings.local.json
# Meta MCP: pip install meta-ads-mcp (or uvx meta-ads-mcp)
#   Docs: https://github.com/pipeboard-co/meta-ads-mcp
# Google Ads MCP: pip install google-ads-mcp (or uvx google-ads-mcp)
#   Docs: https://github.com/google-marketing-solutions/google_ads_mcp
```

- [ ] **Step 5: Update CLAUDE.md — add MCP and campaigns sections**

Add to the end of the Architecture section in CLAUDE.md:

```markdown
### MCP Servers (Read-Only)

Two external MCP servers are configured in `.claude/settings.local.json` (gitignored) for ad-hoc analytics queries:

- **meta-ads-mcp** (pipeboard-co): Query Meta campaign insights, breakdowns by age/gender/placement. Read-only — all writes go through `src/apis/meta.ts`.
- **google-ads-mcp** (Google official): Execute GAQL queries for Google Ads diagnostics. Read-only.

To set up: copy token values from `.env` into `.claude/settings.local.json`. See `.env.example` for mapping.

### Campaign Definitions

YAML files in `campaigns/` define ad campaigns declaratively. Schema validated at load time. Flow: `campaigns/*.yaml` → `src/campaigns/parser.ts` → staging review → API creation (PAUSED).
```

- [ ] **Step 6: Create `campaigns/` directory with `.gitkeep`**

```bash
mkdir -p campaigns
touch campaigns/.gitkeep
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore .env.example CLAUDE.md campaigns/.gitkeep
git commit -m "chore: configure MCP read-only servers and campaigns directory"
```

---

## Chunk 2: Campaign YAML Schema & Types

### Task 2: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install js-yaml, ajv, and type definitions**

```bash
npm install js-yaml ajv
npm install -D @types/js-yaml
```

- [ ] **Step 2: Verify installation**

Run: `npm ls js-yaml ajv`
Expected: Both packages listed without errors.

- [ ] **Step 3: Run typecheck to verify no regressions**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add js-yaml and ajv dependencies for campaign YAML support"
```

---

### Task 3: Define campaign TypeScript types and JSON Schema

**Files:**
- Create: `src/campaigns/schema.ts`
- Create: `src/campaigns/schema.test.ts`

- [ ] **Step 1: Write the failing test for schema validation**

Create `src/campaigns/schema.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/campaigns/schema.test.ts`
Expected: FAIL — `validateCampaignYaml` not found.

- [ ] **Step 3: Implement schema types and validation**

Create `src/campaigns/schema.ts`:

```typescript
import Ajv from 'ajv';

// --- TypeScript interfaces ---

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
  cta: string;
  link: string;
  image?: string;
}

export interface CampaignDefinition {
  campaign: {
    name: string;
    platform: 'meta' | 'google_ads';
    objective: string;
    status?: 'PAUSED';
    campaign_id?: string;  // Existing Meta campaign ID or Google Ads campaign ID — required for ad creation
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
        status: { type: 'string', enum: ['PAUSED'], default: 'PAUSED' },
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
            enum: ['LEARN_MORE', 'SIGN_UP', 'DOWNLOAD', 'SHOP_NOW', 'BOOK_NOW', 'GET_OFFER', 'SUBSCRIBE', 'CONTACT_US', 'APPLY_NOW', 'WATCH_MORE'],
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
  const copy = structuredClone(data);
  const valid = validate(copy);

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/campaigns/schema.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/campaigns/schema.ts src/campaigns/schema.test.ts
git commit -m "feat(campaigns): add YAML campaign schema types and validation"
```

---

## Chunk 3: YAML Parser

### Task 4: Implement campaign YAML parser

**Files:**
- Create: `src/campaigns/parser.ts`
- Create: `src/campaigns/parser.test.ts`

- [ ] **Step 1: Write failing tests for the parser**

Create `src/campaigns/parser.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/campaigns/parser.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

Create `src/campaigns/parser.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/campaigns/parser.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/campaigns/parser.ts src/campaigns/parser.test.ts
git commit -m "feat(campaigns): add YAML parser with file loading and validation"
```

---

## Chunk 4: Campaign Loader (Orchestration)

### Task 5: Implement campaign loader that connects YAML to existing APIs

**Files:**
- Create: `src/campaigns/loader.ts`
- Create: `src/campaigns/loader.test.ts`

- [ ] **Step 1: Write failing tests for the loader**

Create `src/campaigns/loader.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/campaigns/loader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loader**

Create `src/campaigns/loader.ts`:

```typescript
import type { CampaignDefinition, CampaignAdSet, CampaignAd } from './schema.js';
import type { StagedItem } from '../staging/reviewer.js';

export interface LoadResult {
  campaignName: string;
  platform: 'meta' | 'google_ads';
  objective: string;
  campaignId: string | undefined;  // Maps to CreateAdInput.campaignId for Meta API
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
      `| ${i + 1} | ${ad.name} | ${ad.headline} | ${[...ad.headline].length} | ${ad.primary_text.slice(0, 40)}${ad.primary_text.length > 40 ? '...' : ''} | ${[...ad.primary_text].length} | ${ad.cta} |`
    ),
  ];

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/campaigns/loader.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/campaigns/loader.ts src/campaigns/loader.test.ts
git commit -m "feat(campaigns): add loader to convert YAML definitions into staged items"
```

---

## Chunk 5: Example Campaign + Slash Command

### Task 6: Create example campaign YAML and /campaign command

**Files:**
- Create: `campaigns/example.yaml`
- Create: `commands/campaign.md`

- [ ] **Step 1: Create example campaign YAML**

Create `campaigns/example.yaml`:

```yaml
# Example: Woodabu Spring Sale campaign for Meta
# Copy this file and customize for your campaign.
# All campaigns are created as PAUSED — nothing goes live without manual activation.

campaign:
  name: Spring Sale 2026
  platform: meta
  objective: OUTCOME_SALES
  # campaign_id: "123456789"  # Uncomment and set to your Meta campaign ID to create ads

ad_set:
  name: Spring - Eco Conscious Segment
  daily_budget_cents: 2000  # €20/day
  targeting:
    age_min: 28
    age_max: 55
    genders: [0]  # 0=all, 1=male, 2=female
    countries: ["ES"]
    interests:
      - id: "6003139266461"
        name: Sustainable living
      - id: "6003384544611"
        name: Furniture
      - id: "6003455156051"
        name: Interior design
    platforms: [facebook, instagram]

ads:
  - name: Spring Eco - Artisan Story
    primary_text: >-
      Cada mueble Woodabu nace en nuestro taller de Madrid.
      Madera maciza, técnicas tradicionales y cero residuos.
      Piezas que duran toda la vida.
    headline: Artesanía sostenible
    description: Hecho a mano en Madrid
    cta: SHOP_NOW
    link: https://woodabu.com/colecciones/zero-waste

  - name: Spring Eco - Lifetime Warranty
    primary_text: >-
      ¿Sabías que cada pieza Woodabu tiene garantía de por vida?
      Madera maciza de roble y castaño, sin materiales artificiales.
      Muebles que mejoran con el tiempo.
    headline: Garantía de por vida
    description: Madera maciza real
    cta: LEARN_MORE
    link: https://woodabu.com/garantia

  - name: Spring Eco - Zero Waste
    primary_text: >-
      Nuestra colección Zero Waste transforma restos de madera
      en muebles únicos. Cada pieza es irrepetible, sostenible
      y hecha con propósito.
    headline: Colección Zero Waste
    description: Piezas únicas e irrepetibles
    cta: SHOP_NOW
    link: https://woodabu.com/colecciones/zero-waste
```

- [ ] **Step 2: Create `/campaign` slash command**

Create `commands/campaign.md`:

```markdown
---
name: campaign
description: Load and deploy ad campaigns from YAML definitions
---

You are deploying a Woodabu ad campaign defined in a YAML file.

## Subcommands

### `/campaign load [file]`
Load and preview a campaign YAML file. Default: `campaigns/example.yaml`.

### `/campaign list`
List all YAML files in `campaigns/`.

### `/campaign validate [file]`
Validate a YAML file without creating anything.

## Process

1. **Parse YAML**: Load the file using `parseCampaignFile()` from `src/campaigns/parser.ts`.

2. **Preview**: Format the campaign using `formatCampaignPreview()` from `src/campaigns/loader.ts`. Show the full table with character counts, targeting, and budget.

3. **Stage for review**: Convert to staged items using `loadCampaign()` from `src/campaigns/loader.ts`. Present each ad for review using `formatAdTable()` from `src/staging/reviewer.ts`.

4. **Ask for approval**: Per-ad: [a] Approve, [e] Edit, [r] Regenerate, [s] Skip.

5. **Apply decisions**: Use `applyDecisions()` from `src/staging/reviewer.ts` to filter approved ads.

6. **Create on platform** (requires `campaign_id` in YAML):
   - If `campaign_id` is missing, warn the user: "Add campaign_id to your YAML to create ads. You can find it in Meta Ads Manager or Google Ads console."
   - **Meta**: For each approved ad, map fields to `CreateAdInput` (`campaign_id` → `campaignId`, `primary_text` → `primaryText`, `headline` → `headline`, `description` → `description`) and call `MetaClient.createAdDraft()` from `src/apis/meta.ts`. All ads are created as PAUSED.
   - **Google Ads**: For ads with platform `google_ads`, map headline/descriptions to RSA format and call `GoogleAdsClient.createRsaAd()` from `src/apis/google-ads.ts`. All ads are created as PAUSED.

7. **Report**: Show created ad IDs and remind user to review in the platform's ad manager before activating.

## Rules
- All campaigns are created as PAUSED — never auto-publish.
- YAML files in `campaigns/` can be version-controlled and reused.
- Read `skills/woodabu-brand.md` before generating or editing ad copy.
- Use `[...text].length` for character counting (handles Spanish accented characters).
```

- [ ] **Step 3: Verify example YAML validates**

Run: `npx tsx -e "const { parseCampaignFile } = require('./src/campaigns/parser.js'); console.log(JSON.stringify(parseCampaignFile('campaigns/example.yaml').campaign))"`

If the above doesn't work due to ESM/CJS, write a quick validation script:

```bash
npx vitest run src/campaigns/parser.test.ts
```

Expected: All parser tests still pass (validates the same schema rules).

- [ ] **Step 4: Run full test suite**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add campaigns/example.yaml commands/campaign.md
git commit -m "feat(campaigns): add example YAML campaign and /campaign slash command"
```

---

## Chunk 6: Integration Test + Final Verification

### Task 7: Add integration test for full YAML → staged items flow

**Files:**
- Create: `src/campaigns/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `src/campaigns/integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseCampaignString } from './parser.js';
import { loadCampaign, formatCampaignPreview } from './loader.js';
import { applyDecisions } from '../staging/reviewer.js';
import type { ReviewDecision } from '../staging/reviewer.js';

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

    // Step 5: Apply decisions (approve first, skip second, edit third)
    const decisions: ReviewDecision[] = [
      { id: loaded.stagedAds[0].id, action: 'approve' },
      { id: loaded.stagedAds[1].id, action: 'skip' },
      { id: loaded.stagedAds[2].id, action: 'edit', newContent: 'Edited: Titular tres actualizado' },
    ];
    const approved = applyDecisions(loaded.stagedAds, decisions);
    expect(approved).toHaveLength(2);
    expect(approved[0].content).toContain('Titular uno');
    expect(approved[1].content).toContain('Edited: Titular tres actualizado');
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
```

- [ ] **Step 2: Run integration test**

Run: `npx vitest run src/campaigns/integration.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run FULL test suite**

Run: `npm run test`
Expected: All tests pass (existing + new campaign tests).

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: Compiles without errors.

- [ ] **Step 6: Commit**

```bash
git add src/campaigns/integration.test.ts
git commit -m "test(campaigns): add integration test for YAML → staging flow"
```

---

## Summary

| Chunk | Tasks | What it delivers | Files | Tests |
|-------|-------|-----------------|-------|-------|
| 1 | Task 1 | MCP read-only config + project scaffolding | 5 modified/created | 0 (config only) |
| 2 | Task 2-3 | Dependencies + campaign schema types + validation | 3 created, 1 modified | 10 tests |
| 3 | Task 4 | YAML parser (string + file) | 2 created | 6 tests |
| 4 | Task 5 | Campaign loader → staged items | 2 created | 7 tests |
| 5 | Task 6 | Example YAML + /campaign command | 2 created | 0 (docs) |
| 6 | Task 7 | Integration test + final verification | 1 created | 2 tests |
| **Total** | | | **14 files** | **25 tests** |

### Post-implementation: MCP Server Setup

After all code is committed, the user must manually:

1. Install MCP server binaries:
   ```bash
   pip install meta-ads-mcp
   pip install google-ads-mcp
   ```
   Or use `uvx` (uv tool runner) for isolated installs.

2. Copy real token values from `.env` into `.claude/settings.local.json`.

3. Restart Claude Code to pick up MCP server config.

4. Test with: "Using Meta MCP, show me last week's campaign performance" — this should invoke the `meta-ads` MCP server tools.
