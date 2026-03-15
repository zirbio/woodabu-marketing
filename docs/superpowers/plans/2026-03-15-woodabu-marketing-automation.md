# Woodabu Marketing Automation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI marketing platform that connects to Google Ads, Meta, Shopify, and GA4 APIs to automate ad creation, social posting, email campaigns, and analytics — with human approval before anything publishes.

**Architecture:** Standalone Node.js + TypeScript CLI invoked via Claude Code slash commands. Each module (Ad, Social, Email, Analytics) reads platform data, generates content with Claude, stages for human review, and publishes in safe states (PAUSED/DRAFT/SCHEDULED). A shared Brand Skills layer ensures tone consistency.

**Tech Stack:** Node.js, TypeScript, Vitest, msw (API mocking), google-ads-api, @shopify/shopify-api, @google-analytics/data, MJML, native fetch (Meta APIs)

**Spec:** `docs/superpowers/specs/2026-03-15-woodabu-marketing-automation-design.md`

---

## Chunk 1: Foundation (Phase 1)

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `vitest.config.ts`

- [ ] **Step 1: Initialize project**

```bash
cd /Users/silvio_requena/Code/woodabu/marketing
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install typescript google-ads-api @shopify/shopify-api @google-analytics/data mjml
npm install -D vitest msw @types/node tsx
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
.env
credentials/
data/insights/
*.tmp
node_modules/
dist/
```

- [ ] **Step 6: Create .env.example**

```bash
# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# Meta (covers Marketing API + Graph API)
META_SYSTEM_USER_TOKEN=
META_TOKEN_EXPIRY=2026-05-15
META_AD_ACCOUNT_ID=
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=

# Shopify
SHOPIFY_STORE_DOMAIN=woodabu.myshopify.com
SHOPIFY_ACCESS_TOKEN=

# GA4
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_KEY_PATH=credentials/ga4-service-account.json
```

- [ ] **Step 7: Create directory structure**

```bash
mkdir -p src/{apis,staging,analytics,utils} data/{insights,templates} credentials skills commands
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors (no source files yet, clean compile)

- [ ] **Step 9: Verify Vitest runs**

Run: `npx vitest run`
Expected: "No test files found" (clean run, no errors)

- [ ] **Step 10: Commit**

```bash
git init
git add package.json tsconfig.json vitest.config.ts .gitignore .env.example
git commit -m "chore: scaffold project with TypeScript, Vitest, and API dependencies"
```

---

### Task 2: Validators Module

**Files:**
- Create: `src/utils/validators.ts`
- Create: `src/utils/validators.test.ts`

- [ ] **Step 1: Write failing tests for RSA validators**

```typescript
// src/utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateHeadline,
  validateDescription,
  validateRsaBatch,
} from './validators.js';

describe('validateHeadline', () => {
  it('accepts headline within 30 char limit', () => {
    expect(validateHeadline('Muebles hechos a mano')).toEqual({
      valid: true,
      value: 'Muebles hechos a mano',
      charCount: 21,
    });
  });

  it('rejects headline exceeding 30 chars', () => {
    const long = 'Este es un headline que supera el límite';
    const result = validateHeadline(long);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('30');
  });

  it('counts Spanish characters as single characters', () => {
    // ñ, á, é, í, ó, ú should each count as 1 char
    const headline = 'Diseño español único aquí'; // 25 chars
    const result = validateHeadline(headline);
    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(25);
  });

  it('rejects empty headline', () => {
    expect(validateHeadline('')).toEqual({
      valid: false,
      value: '',
      charCount: 0,
      error: 'Headline cannot be empty',
    });
  });

  it('warns when close to limit', () => {
    const headline = 'Madera maciza hecha a mano ya'; // 29 chars
    const result = validateHeadline(headline);
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('close to limit');
  });
});

describe('validateDescription', () => {
  it('accepts description within 90 char limit', () => {
    const desc = 'Muebles de madera maciza hechos a mano en Madrid. Garantía de por vida.';
    expect(validateDescription(desc).valid).toBe(true);
  });

  it('rejects description exceeding 90 chars', () => {
    const desc = 'A'.repeat(91);
    expect(validateDescription(desc).valid).toBe(false);
  });
});

describe('validateRsaBatch', () => {
  it('validates a complete RSA batch (15 headlines + 4 descriptions)', () => {
    const headlines = Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`);
    const descriptions = Array.from({ length: 4 }, (_, i) => `Description number ${i + 1} here`);
    const result = validateRsaBatch(headlines, descriptions);
    expect(result.valid).toBe(true);
    expect(result.headlines).toHaveLength(15);
    expect(result.descriptions).toHaveLength(4);
  });

  it('rejects batch with wrong headline count', () => {
    const headlines = Array.from({ length: 10 }, (_, i) => `H ${i}`);
    const descriptions = Array.from({ length: 4 }, (_, i) => `D ${i}`);
    const result = validateRsaBatch(headlines, descriptions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('15');
  });

  it('collects individual validation errors', () => {
    const headlines = Array.from({ length: 15 }, () => 'A'.repeat(35));
    const descriptions = Array.from({ length: 4 }, (_, i) => `D ${i}`);
    const result = validateRsaBatch(headlines, descriptions);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/validators.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validators**

```typescript
// src/utils/validators.ts
export interface ValidationResult {
  valid: boolean;
  value: string;
  charCount: number;
  error?: string;
  warning?: string;
}

export interface BatchValidationResult {
  valid: boolean;
  headlines: ValidationResult[];
  descriptions: ValidationResult[];
  error?: string;
  errors: string[];
}

const HEADLINE_MAX = 30;
const DESCRIPTION_MAX = 90;
const WARN_THRESHOLD = 2; // warn when within N chars of limit

export function validateHeadline(text: string): ValidationResult {
  const charCount = [...text].length; // spread handles unicode correctly

  if (charCount === 0) {
    return { valid: false, value: text, charCount: 0, error: 'Headline cannot be empty' };
  }

  if (charCount > HEADLINE_MAX) {
    return {
      valid: false,
      value: text,
      charCount,
      error: `Headline exceeds ${HEADLINE_MAX} character limit (${charCount} chars)`,
    };
  }

  const result: ValidationResult = { valid: true, value: text, charCount };

  if (charCount >= HEADLINE_MAX - WARN_THRESHOLD) {
    result.warning = `${charCount}/${HEADLINE_MAX} chars — close to limit`;
  }

  return result;
}

export function validateDescription(text: string): ValidationResult {
  const charCount = [...text].length;

  if (charCount === 0) {
    return { valid: false, value: text, charCount: 0, error: 'Description cannot be empty' };
  }

  if (charCount > DESCRIPTION_MAX) {
    return {
      valid: false,
      value: text,
      charCount,
      error: `Description exceeds ${DESCRIPTION_MAX} character limit (${charCount} chars)`,
    };
  }

  const result: ValidationResult = { valid: true, value: text, charCount };

  if (charCount >= DESCRIPTION_MAX - WARN_THRESHOLD) {
    result.warning = `${charCount}/${DESCRIPTION_MAX} chars — close to limit`;
  }

  return result;
}

export function validateRsaBatch(
  headlines: string[],
  descriptions: string[],
): BatchValidationResult {
  const errors: string[] = [];

  if (headlines.length !== 15) {
    errors.push(`Expected 15 headlines, got ${headlines.length}`);
  }
  if (descriptions.length !== 4) {
    errors.push(`Expected 4 descriptions, got ${descriptions.length}`);
  }

  const headlineResults = headlines.map(validateHeadline);
  const descriptionResults = descriptions.map(validateDescription);

  const itemErrors = [
    ...headlineResults.filter((r) => !r.valid).map((r, i) => `Headline ${i + 1}: ${r.error}`),
    ...descriptionResults.filter((r) => !r.valid).map((r, i) => `Description ${i + 1}: ${r.error}`),
  ];

  errors.push(...itemErrors);

  return {
    valid: errors.length === 0,
    headlines: headlineResults,
    descriptions: descriptionResults,
    error: errors.length > 0 ? errors[0] : undefined,
    errors,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/validators.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/validators.ts src/utils/validators.test.ts
git commit -m "feat(validators): add RSA headline/description validators with unicode support"
```

---

### Task 3: Date Period Parser (for Analytics)

**Files:**
- Create: `src/utils/date-parser.ts`
- Create: `src/utils/date-parser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/utils/date-parser.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parsePeriod, parseCompareArg } from './date-parser.js';

describe('parsePeriod', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses explicit date range YYYY-MM-DD:YYYY-MM-DD', () => {
    const result = parsePeriod('2026-02-01:2026-02-28');
    expect(result).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('parses "last-week" alias', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parsePeriod('last-week');
    expect(result).toEqual({ start: '2026-03-03', end: '2026-03-09' });
  });

  it('parses "last-month" alias', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parsePeriod('last-month');
    expect(result).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('rejects invalid format', () => {
    expect(() => parsePeriod('not-a-date')).toThrow('Invalid period format');
  });
});

describe('parseCompareArg', () => {
  it('parses "period1 vs period2"', () => {
    const result = parseCompareArg('2026-02-01:2026-02-28 vs 2026-01-01:2026-01-31');
    expect(result).toEqual({
      period1: { start: '2026-02-01', end: '2026-02-28' },
      period2: { start: '2026-01-01', end: '2026-01-31' },
    });
  });

  it('parses aliases "last-month vs last-quarter"', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parseCompareArg('last-month vs last-quarter');
    expect(result.period1).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(result.period2.start).toBe('2025-12-01');
  });

  it('rejects missing "vs" separator', () => {
    expect(() => parseCompareArg('2026-01-01:2026-01-31')).toThrow('vs');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/date-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement date parser**

```typescript
// src/utils/date-parser.ts
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

const DATE_RANGE_REGEX = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/;

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function parsePeriod(input: string): DateRange {
  const trimmed = input.trim();

  const rangeMatch = trimmed.match(DATE_RANGE_REGEX);
  if (rangeMatch) {
    return { start: rangeMatch[1], end: rangeMatch[2] };
  }

  const now = new Date();

  switch (trimmed) {
    case 'last-week': {
      const thisMonday = getMonday(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      return { start: formatDate(lastMonday), end: formatDate(lastSunday) };
    }
    case 'last-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    }
    case 'last-quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const prevQuarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      const prevQuarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
      if (currentQuarter === 0) {
        prevQuarterStart.setFullYear(now.getFullYear() - 1);
        prevQuarterStart.setMonth(9);
        prevQuarterEnd.setFullYear(now.getFullYear() - 1);
        prevQuarterEnd.setMonth(11);
        prevQuarterEnd.setDate(31);
      }
      return { start: formatDate(prevQuarterStart), end: formatDate(prevQuarterEnd) };
    }
    case 'last-year': {
      const year = now.getFullYear() - 1;
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    default:
      throw new Error(`Invalid period format: "${input}". Use YYYY-MM-DD:YYYY-MM-DD or aliases: last-week, last-month, last-quarter, last-year`);
  }
}

export function parseCompareArg(input: string): { period1: DateRange; period2: DateRange } {
  if (!input.includes(' vs ')) {
    throw new Error('Compare format requires "vs" separator. Example: last-month vs last-quarter');
  }

  const [left, right] = input.split(' vs ').map((s) => s.trim());
  return {
    period1: parsePeriod(left),
    period2: parsePeriod(right),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/date-parser.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/date-parser.ts src/utils/date-parser.test.ts
git commit -m "feat(utils): add date period parser with aliases for analytics compare"
```

---

### Task 4: Auth Module

**Files:**
- Create: `src/utils/auth.ts`
- Create: `src/utils/auth.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/utils/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, checkMetaTokenExpiry } from './auth.js';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads required config from env vars', () => {
    vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'woodabu.myshopify.com');
    vi.stubEnv('SHOPIFY_ACCESS_TOKEN', 'shpat_xxx');
    vi.stubEnv('META_SYSTEM_USER_TOKEN', 'token123');
    vi.stubEnv('META_TOKEN_EXPIRY', '2026-05-15');
    vi.stubEnv('META_PAGE_ID', 'page123');
    vi.stubEnv('META_PAGE_ACCESS_TOKEN', 'pagetoken');
    vi.stubEnv('META_AD_ACCOUNT_ID', 'act_123');
    vi.stubEnv('GOOGLE_ADS_CLIENT_ID', 'gid');
    vi.stubEnv('GOOGLE_ADS_CLIENT_SECRET', 'gsecret');
    vi.stubEnv('GOOGLE_ADS_REFRESH_TOKEN', 'grefresh');
    vi.stubEnv('GOOGLE_ADS_DEVELOPER_TOKEN', 'gdev');
    vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', 'gcust');
    vi.stubEnv('GA4_PROPERTY_ID', 'prop123');
    vi.stubEnv('GA4_SERVICE_ACCOUNT_KEY_PATH', 'credentials/ga4-service-account.json');

    const config = loadConfig();
    expect(config.shopify.storeDomain).toBe('woodabu.myshopify.com');
    expect(config.meta.systemUserToken).toBe('token123');
    expect(config.googleAds.clientId).toBe('gid');
    expect(config.ga4.propertyId).toBe('prop123');
  });

  it('throws if required env var is missing', () => {
    // No env vars stubbed
    expect(() => loadConfig()).toThrow();
  });
});

describe('checkMetaTokenExpiry', () => {
  it('returns ok when token expiry is > 7 days away', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = checkMetaTokenExpiry('2026-05-15');
    expect(result.status).toBe('ok');
  });

  it('returns warning when token expires within 7 days', () => {
    vi.setSystemTime(new Date('2026-05-10'));
    const result = checkMetaTokenExpiry('2026-05-15');
    expect(result.status).toBe('warning');
    expect(result.daysRemaining).toBe(5);
  });

  it('returns expired when token is past expiry', () => {
    vi.setSystemTime(new Date('2026-05-20'));
    const result = checkMetaTokenExpiry('2026-05-15');
    expect(result.status).toBe('expired');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/auth.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement auth module**

```typescript
// src/utils/auth.ts
export interface AppConfig {
  shopify: {
    storeDomain: string;
    accessToken: string;
  };
  meta: {
    systemUserToken: string;
    tokenExpiry: string;
    adAccountId: string;
    pageId: string;
    pageAccessToken: string;
  };
  googleAds: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    developerToken: string;
    customerId: string;
  };
  ga4: {
    propertyId: string;
    serviceAccountKeyPath: string;
  };
}

export interface TokenExpiryCheck {
  status: 'ok' | 'warning' | 'expired';
  daysRemaining: number;
  message?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    shopify: {
      storeDomain: requireEnv('SHOPIFY_STORE_DOMAIN'),
      accessToken: requireEnv('SHOPIFY_ACCESS_TOKEN'),
    },
    meta: {
      systemUserToken: requireEnv('META_SYSTEM_USER_TOKEN'),
      tokenExpiry: requireEnv('META_TOKEN_EXPIRY'),
      adAccountId: requireEnv('META_AD_ACCOUNT_ID'),
      pageId: requireEnv('META_PAGE_ID'),
      pageAccessToken: requireEnv('META_PAGE_ACCESS_TOKEN'),
    },
    googleAds: {
      clientId: requireEnv('GOOGLE_ADS_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_ADS_CLIENT_SECRET'),
      refreshToken: requireEnv('GOOGLE_ADS_REFRESH_TOKEN'),
      developerToken: requireEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
      customerId: requireEnv('GOOGLE_ADS_CUSTOMER_ID'),
    },
    ga4: {
      propertyId: requireEnv('GA4_PROPERTY_ID'),
      serviceAccountKeyPath: requireEnv('GA4_SERVICE_ACCOUNT_KEY_PATH'),
    },
  };
}

const WARN_DAYS = 7;

export function checkMetaTokenExpiry(expiryDate: string): TokenExpiryCheck {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining,
      message: `Meta token expired ${Math.abs(daysRemaining)} days ago. Renew at Meta Business App.`,
    };
  }

  if (daysRemaining <= WARN_DAYS) {
    return {
      status: 'warning',
      daysRemaining,
      message: `Meta token expires in ${daysRemaining} days. Renew soon at Meta Business App.`,
    };
  }

  return { status: 'ok', daysRemaining };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/auth.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/auth.ts src/utils/auth.test.ts
git commit -m "feat(auth): add config loader and Meta token expiry checker"
```

---

### Task 5: Insights Store

**Files:**
- Create: `src/analytics/insights-store.ts`
- Create: `src/analytics/insights-store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/analytics/insights-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InsightsStore } from './insights-store.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('InsightsStore', () => {
  let tmpDir: string;
  let store: InsightsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-'));
    store = new InsightsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and reads an insight report', () => {
    const report = {
      date: '2026-03-15',
      type: 'weekly' as const,
      channels: {
        google_ads: {
          top_performers: [{ id: 'ad_1', headline: 'Test', ctr: 0.05, roas: 3.0 }],
          patterns: ['Pattern A'],
        },
      },
      recommendations: [{ action: 'increase_budget', target: 'campaign_X', reason: 'High ROAS' }],
    };

    store.save(report);

    const loaded = store.getLatest(1);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].date).toBe('2026-03-15');
    expect(loaded[0].channels.google_ads.patterns).toContain('Pattern A');
  });

  it('returns latest N reports sorted by date desc', () => {
    for (const date of ['2026-03-01', '2026-03-08', '2026-03-15']) {
      store.save({ date, type: 'weekly', channels: {}, recommendations: [] });
    }

    const latest2 = store.getLatest(2);
    expect(latest2).toHaveLength(2);
    expect(latest2[0].date).toBe('2026-03-15');
    expect(latest2[1].date).toBe('2026-03-08');
  });

  it('enforces retention limit of 12 reports', () => {
    for (let i = 1; i <= 14; i++) {
      const date = `2026-${String(i).padStart(2, '0')}-01`;
      store.save({ date, type: 'weekly', channels: {}, recommendations: [] });
    }

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeLessThanOrEqual(12);
  });

  it('does not store PII fields', () => {
    const report = {
      date: '2026-03-15',
      type: 'weekly' as const,
      channels: {},
      recommendations: [],
    };

    store.save(report);
    const raw = fs.readFileSync(path.join(tmpDir, '2026-03-15-weekly.json'), 'utf-8');
    expect(raw).not.toContain('email');
    expect(raw).not.toContain('@');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/analytics/insights-store.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement insights store**

```typescript
// src/analytics/insights-store.ts
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ChannelInsight {
  top_performers: Array<{ id: string; headline?: string; text?: string; ctr?: number; roas?: number; engagement_rate?: number; reach?: number }>;
  patterns: string[];
}

export interface InsightReport {
  date: string;
  type: 'weekly' | 'channel' | 'product' | 'compare';
  channels: Record<string, ChannelInsight>;
  recommendations: Array<{ action: string; target: string; reason: string }>;
}

const MAX_REPORTS = 12;

export class InsightsStore {
  constructor(private readonly dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  save(report: InsightReport): void {
    const filename = `${report.date}-${report.type}.json`;
    const filepath = path.join(this.dir, filename);
    const tmpPath = `${filepath}.tmp`;

    fs.writeFileSync(tmpPath, JSON.stringify(report, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filepath);

    this.enforceRetention();
  }

  getLatest(count: number): InsightReport[] {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, count);

    return files.map((f) => {
      const content = fs.readFileSync(path.join(this.dir, f), 'utf-8');
      return JSON.parse(content) as InsightReport;
    });
  }

  private enforceRetention(): void {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    while (files.length > MAX_REPORTS) {
      const oldest = files.shift()!;
      fs.unlinkSync(path.join(this.dir, oldest));
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/analytics/insights-store.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/analytics/insights-store.ts src/analytics/insights-store.test.ts
git commit -m "feat(analytics): add insights store with retention policy and atomic writes"
```

---

### Task 6: Brand Skills File

**Files:**
- Create: `skills/woodabu-brand.md`

- [ ] **Step 1: Create brand skills file**

```markdown
---
name: woodabu-brand
description: Brand guidelines, tone of voice, and content standards for Woodabu furniture
---

# Woodabu Brand Guidelines

## Brand Voice
Warm, authentic, passionate about wood and sustainability. We speak like a craftsman who loves their work — not a corporation selling products. Conversational but knowledgeable.

## Key Values
- 100% handcrafted solid wood furniture
- Sustainable materials and processes
- Lifetime warranty on every piece
- Made in Spain (Alcobendas, Madrid)
- Exclusive, limited pieces

## Target Personas
1. **Eco-conscious homeowners**: Value sustainability, willing to pay more for ethical products
2. **Design lovers**: Appreciate unique, artisanal aesthetics over mass-market
3. **Quality-over-quantity buyers**: Invest in furniture that lasts generations
4. **Gift shoppers**: Looking for meaningful, unique gifts

## Words to Use
- **ES**: artesanal, madera maciza, sostenible, hecho a mano, exclusivo, duradero, roble, castaño, taller, artesano
- **EN**: handcrafted, solid wood, sustainable, handmade, exclusive, lasting, oak, chestnut, workshop, artisan

## Words to Avoid
- **ES**: barato, descuento, oferta, producción en masa, artificial, plástico, imitación
- **EN**: cheap, discount, mass-produced, artificial, plastic, imitation, budget

## Collections
- **Zero Waste**: Furniture made from reclaimed and leftover wood. Messaging angle: "Nothing goes to waste. Every cut has a purpose."
- **Pure Oceans**: Ocean-inspired pieces supporting marine conservation. Messaging angle: "Beauty inspired by the sea, crafted to protect it."

## Seasonal Calendar
- **January-February**: New year, new home — refresh messaging
- **March-April**: Spring outdoor furniture push
- **May**: Mother's Day gift angle
- **June-August**: Outdoor/terrace season peak
- **September**: Back to routine, home office furniture
- **November**: Black Friday (position as "conscious consumption" not discounts)
- **December**: Christmas gifts, handcrafted holiday messaging
- **February 14**: San Valentín — couples furniture, meaningful gifts

## Example Copy (Reference)
**Good ad headline**: "Muebles que cuentan historias"
**Good social post**: "Cada veta de la madera es única, como cada hogar. Nuestros artesanos lo saben."
**Good email subject**: "Tu mesa, tu historia — nueva colección Zero Waste"

## Content Rules
1. Never use urgency/scarcity tactics ("¡Solo quedan 2!", "Oferta por tiempo limitado")
2. Always mention the material (oak, chestnut, solid wood)
3. Include sustainability angle when relevant — but don't force it
4. Photos > stock images. Always prefer real workshop/product photos
5. Price is justified by craftsmanship, never apologized for
```

- [ ] **Step 2: Commit**

```bash
git add skills/woodabu-brand.md
git commit -m "feat(brand): add Woodabu brand guidelines skill file"
```

---

### Task 7: Run full test suite and verify Foundation

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Tag Phase 1 complete**

```bash
git tag phase-1-foundation
```

---

## Chunk 2: Ad Engine (Phase 2)

### Task 8: Google Ads API Client

**Files:**
- Create: `src/apis/google-ads.ts`
- Create: `src/apis/google-ads.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/apis/google-ads.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GoogleAdsClient } from './google-ads.js';

// Mock the google-ads-api package
vi.mock('google-ads-api', () => ({
  GoogleAdsApi: vi.fn().mockImplementation(() => ({
    Customer: vi.fn().mockImplementation(() => ({
      report: vi.fn().mockResolvedValue([
        {
          ad_group_ad: { ad: { id: '1', responsive_search_ad: { headlines: [{ text: 'Test' }] } } },
          metrics: { clicks: 100, impressions: 2000, ctr: 0.05, cost_micros: 5000000, conversions: 10 },
          campaign: { id: '1', name: 'Campaign 1' },
        },
      ]),
      mutateResources: vi.fn().mockResolvedValue({ results: [{ resource_name: 'customers/123/adGroupAds/456' }] }),
    })),
  })),
}));

describe('GoogleAdsClient', () => {
  const config = {
    clientId: 'test-id',
    clientSecret: 'test-secret',
    refreshToken: 'test-refresh',
    developerToken: 'test-dev',
    customerId: '123',
  };

  it('fetches campaign performance', async () => {
    const client = new GoogleAdsClient(config);
    const results = await client.getCampaignPerformance();
    expect(results).toHaveLength(1);
    expect(results[0].metrics.ctr).toBe(0.05);
  });

  it('creates ads in PAUSED state', async () => {
    const client = new GoogleAdsClient(config);
    const result = await client.createRsaAd({
      adGroupId: 'ag_1',
      headlines: ['Headline 1'],
      descriptions: ['Description 1'],
    });
    expect(result.resourceName).toContain('adGroupAds');
  });

  it('returns top and bottom performers', async () => {
    const client = new GoogleAdsClient(config);
    const perf = await client.getCampaignPerformance();
    const { top, bottom } = GoogleAdsClient.rankPerformers(perf);
    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apis/google-ads.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Google Ads client**

```typescript
// src/apis/google-ads.ts
import { GoogleAdsApi } from 'google-ads-api';

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;
}

export interface AdPerformance {
  adId: string;
  campaignId: string;
  campaignName: string;
  headlines: string[];
  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    costMicros: number;
    conversions: number;
  };
}

export interface CreateRsaInput {
  adGroupId: string;
  headlines: string[];
  descriptions: string[];
}

export class GoogleAdsClient {
  private readonly customer: ReturnType<InstanceType<typeof GoogleAdsApi>['Customer']>;

  constructor(config: GoogleAdsConfig) {
    const api = new GoogleAdsApi({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      developer_token: config.developerToken,
    });

    this.customer = api.Customer({
      customer_id: config.customerId,
      refresh_token: config.refreshToken,
    });
  }

  async getCampaignPerformance(): Promise<AdPerformance[]> {
    const rows = await this.customer.report({
      entity: 'ad_group_ad',
      attributes: [
        'ad_group_ad.ad.id',
        'ad_group_ad.ad.responsive_search_ad.headlines',
        'campaign.id',
        'campaign.name',
      ],
      metrics: ['metrics.clicks', 'metrics.impressions', 'metrics.ctr', 'metrics.cost_micros', 'metrics.conversions'],
      date_constant: 'LAST_30_DAYS',
    });

    return rows.map((row: Record<string, unknown>) => {
      const ad = row.ad_group_ad as Record<string, unknown>;
      const adData = ad.ad as Record<string, unknown>;
      const rsa = adData.responsive_search_ad as Record<string, unknown> | undefined;
      const metricsData = row.metrics as Record<string, number>;
      const campaign = row.campaign as Record<string, unknown>;

      return {
        adId: String(adData.id),
        campaignId: String(campaign.id),
        campaignName: String(campaign.name),
        headlines: rsa
          ? (rsa.headlines as Array<{ text: string }>).map((h) => h.text)
          : [],
        metrics: {
          clicks: metricsData.clicks,
          impressions: metricsData.impressions,
          ctr: metricsData.ctr,
          costMicros: metricsData.cost_micros,
          conversions: metricsData.conversions,
        },
      };
    });
  }

  async createRsaAd(input: CreateRsaInput): Promise<{ resourceName: string }> {
    const results = await this.customer.mutateResources([
      {
        _resource: 'AdGroupAd',
        ad_group: `customers/${this.customer.credentials.customer_id}/adGroups/${input.adGroupId}`,
        status: 'PAUSED',
        ad: {
          responsive_search_ad: {
            headlines: input.headlines.map((text, i) => ({
              text,
              pinned_field: i < 3 ? 'HEADLINE_1' : undefined,
            })),
            descriptions: input.descriptions.map((text) => ({ text })),
          },
        },
      },
    ]);

    return { resourceName: results.results[0].resource_name };
  }

  static rankPerformers(ads: AdPerformance[]): { top: AdPerformance[]; bottom: AdPerformance[] } {
    const sorted = [...ads].sort((a, b) => b.metrics.ctr - a.metrics.ctr);
    const top = sorted.slice(0, 3);
    const bottom = sorted.slice(-3).reverse();
    return { top, bottom };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/apis/google-ads.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/apis/google-ads.ts src/apis/google-ads.test.ts
git commit -m "feat(ads): add Google Ads API client with performance read and RSA creation"
```

---

### Task 9: Meta Marketing API Client

**Files:**
- Create: `src/apis/meta.ts`
- Create: `src/apis/meta.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/apis/meta.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MetaClient } from './meta.js';

const API_BASE = 'https://graph.facebook.com/v19.0';

const server = setupServer(
  http.get(`${API_BASE}/act_123/insights`, () =>
    HttpResponse.json({
      data: [
        { campaign_id: 'c1', campaign_name: 'Spring', impressions: '5000', clicks: '250', ctr: '0.05', spend: '100.50', actions: [{ action_type: 'purchase', value: '10' }] },
      ],
    }),
  ),
  http.post(`${API_BASE}/act_123/ads`, () =>
    HttpResponse.json({ id: 'ad_789' }),
  ),
  http.post(`${API_BASE}/page_456/feed`, () =>
    HttpResponse.json({ id: 'post_999' }),
  ),
  http.get(`${API_BASE}/page_456/insights`, () =>
    HttpResponse.json({
      data: [{ name: 'page_impressions', values: [{ value: 10000 }] }],
    }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MetaClient', () => {
  const config = {
    systemUserToken: 'sut_test',
    tokenExpiry: '2026-12-31',
    adAccountId: 'act_123',
    pageId: 'page_456',
    pageAccessToken: 'pat_test',
  };

  it('fetches ad campaign insights', async () => {
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].campaignName).toBe('Spring');
    expect(insights[0].ctr).toBe(0.05);
  });

  it('creates ad as draft', async () => {
    const client = new MetaClient(config);
    const result = await client.createAdDraft({
      campaignId: 'c1',
      primaryText: 'Test primary',
      headline: 'Test headline',
      description: 'Test desc',
    });
    expect(result.adId).toBe('ad_789');
  });

  it('schedules a page post', async () => {
    const client = new MetaClient(config);
    const result = await client.schedulePost({
      message: 'Test post',
      scheduledTime: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(result.postId).toBe('post_999');
  });

  it('fetches page insights', async () => {
    const client = new MetaClient(config);
    const insights = await client.getPageInsights();
    expect(insights).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apis/meta.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Meta client**

```typescript
// src/apis/meta.ts
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
  scheduledTime: number; // Unix timestamp
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/apis/meta.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/apis/meta.ts src/apis/meta.test.ts
git commit -m "feat(ads): add Meta Marketing/Graph API client with ad creation and post scheduling"
```

---

### Task 10: Shopify API Client

**Files:**
- Create: `src/apis/shopify.ts`
- Create: `src/apis/shopify.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/apis/shopify.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ShopifyClient } from './shopify.js';

const STORE = 'woodabu.myshopify.com';

const server = setupServer(
  http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, async ({ request }) => {
    const body = await request.text();
    if (body.includes('products')) {
      return HttpResponse.json({
        data: {
          products: {
            edges: [
              { node: { id: 'gid://shopify/Product/1', title: 'Mesa Roble', handle: 'mesa-roble', description: 'Mesa de roble macizo', images: { edges: [{ node: { url: 'https://cdn.shopify.com/mesa.jpg' } }] }, variants: { edges: [{ node: { price: '899.00' } }] } } },
            ],
          },
        },
      });
    }
    if (body.includes('orders')) {
      return HttpResponse.json({
        data: {
          orders: {
            edges: [
              { node: { id: 'gid://shopify/Order/1', totalPriceSet: { shopMoney: { amount: '899.00' } }, lineItems: { edges: [{ node: { title: 'Mesa Roble', quantity: 1 } }] } } },
            ],
          },
        },
      });
    }
    return HttpResponse.json({ data: {} });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ShopifyClient', () => {
  const config = { storeDomain: STORE, accessToken: 'shpat_test' };

  it('fetches products with images and prices', async () => {
    const client = new ShopifyClient(config);
    const products = await client.getProducts();
    expect(products).toHaveLength(1);
    expect(products[0].title).toBe('Mesa Roble');
    expect(products[0].price).toBe('899.00');
    expect(products[0].imageUrl).toContain('cdn.shopify.com');
  });

  it('fetches recent orders', async () => {
    const client = new ShopifyClient(config);
    const orders = await client.getRecentOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].totalPrice).toBe('899.00');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apis/shopify.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Shopify client**

```typescript
// src/apis/shopify.ts
const API_VERSION = '2025-01';

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  imageUrl: string | null;
  price: string;
}

export interface Order {
  id: string;
  totalPrice: string;
  lineItems: Array<{ title: string; quantity: number }>;
}

export class ShopifyClient {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: ShopifyConfig) {
    this.endpoint = `https://${config.storeDomain}/admin/api/${API_VERSION}/graphql.json`;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    };
  }

  private async query(graphql: string): Promise<Record<string, unknown>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query: graphql }),
    });
    if (!response.ok) throw new Error(`Shopify API error: ${response.status}`);
    const json = await response.json() as { data: Record<string, unknown> };
    return json.data;
  }

  async getProducts(first = 50): Promise<Product[]> {
    const data = await this.query(`{
      products(first: ${first}) {
        edges {
          node {
            id title handle description
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price } } }
          }
        }
      }
    }`);

    const products = data.products as { edges: Array<{ node: Record<string, unknown> }> };
    return products.edges.map(({ node }) => {
      const images = node.images as { edges: Array<{ node: { url: string } }> };
      const variants = node.variants as { edges: Array<{ node: { price: string } }> };
      return {
        id: String(node.id),
        title: String(node.title),
        handle: String(node.handle),
        description: String(node.description),
        imageUrl: images.edges[0]?.node.url ?? null,
        price: variants.edges[0]?.node.price ?? '0',
      };
    });
  }

  async getRecentOrders(first = 50): Promise<Order[]> {
    const data = await this.query(`{
      orders(first: ${first}, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            totalPriceSet { shopMoney { amount } }
            lineItems(first: 10) { edges { node { title quantity } } }
          }
        }
      }
    }`);

    const orders = data.orders as { edges: Array<{ node: Record<string, unknown> }> };
    return orders.edges.map(({ node }) => {
      const priceSet = node.totalPriceSet as { shopMoney: { amount: string } };
      const items = node.lineItems as { edges: Array<{ node: { title: string; quantity: number } }> };
      return {
        id: String(node.id),
        totalPrice: priceSet.shopMoney.amount,
        lineItems: items.edges.map(({ node: li }) => ({ title: li.title, quantity: li.quantity })),
      };
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/apis/shopify.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/apis/shopify.ts src/apis/shopify.test.ts
git commit -m "feat(shopify): add Shopify Admin GraphQL client for products and orders"
```

---

### Task 11: GA4 API Client

**Files:**
- Create: `src/apis/ga4.ts`
- Create: `src/apis/ga4.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/apis/ga4.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GA4Client } from './ga4.js';

vi.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: vi.fn().mockImplementation(() => ({
    runReport: vi.fn().mockResolvedValue([
      {
        rows: [
          {
            dimensionValues: [{ value: 'Organic Search' }, { value: '20260315' }],
            metricValues: [{ value: '1500' }, { value: '45' }, { value: '3.2' }],
          },
          {
            dimensionValues: [{ value: 'Paid Search' }, { value: '20260315' }],
            metricValues: [{ value: '800' }, { value: '30' }, { value: '4.1' }],
          },
        ],
      },
    ]),
  })),
}));

describe('GA4Client', () => {
  const config = { propertyId: 'properties/123', serviceAccountKeyPath: 'credentials/test.json' };

  it('fetches traffic by channel', async () => {
    const client = new GA4Client(config);
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data).toHaveLength(2);
    expect(data[0].channel).toBe('Organic Search');
    expect(data[0].sessions).toBe(1500);
  });

  it('sorts channels by sessions descending', async () => {
    const client = new GA4Client(config);
    const data = await client.getTrafficByChannel('2026-03-01', '2026-03-15');
    expect(data[0].sessions).toBeGreaterThanOrEqual(data[1].sessions);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apis/ga4.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement GA4 client**

```typescript
// src/apis/ga4.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GA4Config {
  propertyId: string;
  serviceAccountKeyPath: string;
}

export interface ChannelTraffic {
  channel: string;
  date: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
}

export class GA4Client {
  private readonly client: BetaAnalyticsDataClient;
  private readonly propertyId: string;

  constructor(config: GA4Config) {
    this.client = new BetaAnalyticsDataClient({
      keyFilename: config.serviceAccountKeyPath,
    });
    this.propertyId = config.propertyId;
  }

  async getTrafficByChannel(startDate: string, endDate: string): Promise<ChannelTraffic[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'sessionConversionRate' }],
    });

    if (!response.rows) return [];

    const results = response.rows.map((row) => ({
      channel: row.dimensionValues![0].value!,
      date: row.dimensionValues![1].value!,
      sessions: Number(row.metricValues![0].value),
      conversions: Number(row.metricValues![1].value),
      conversionRate: Number(row.metricValues![2].value),
    }));

    return results.sort((a, b) => b.sessions - a.sessions);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/apis/ga4.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/apis/ga4.ts src/apis/ga4.test.ts
git commit -m "feat(analytics): add GA4 Data API client for channel traffic reports"
```

---

### Task 12: RSA Command (Claude Code Slash Command)

**Files:**
- Create: `commands/rsa.md`

- [ ] **Step 1: Create the slash command file**

```markdown
---
name: rsa
description: Generate Google Ads Responsive Search Ads informed by performance data and brand guidelines
---

You are generating Google Ads Responsive Search Ads for Woodabu, a handcrafted sustainable furniture company.

## Process

1. **Read performance data**: Run the script `npx tsx src/apis/google-ads.ts` to fetch current campaign performance. If the API is unavailable, proceed without performance data and note this to the user.

2. **Read product catalog**: Run `npx tsx src/apis/shopify.ts` to get current products.

3. **Read brand guidelines**: Reference the `skills/woodabu-brand.md` file for tone, values, and word lists.

4. **Read recent insights**: Check `data/insights/` for the 4 most recent reports. Use patterns and recommendations as context.

5. **Generate RSA batch**:
   - 15 headlines (max 30 characters each)
   - 4 descriptions (max 90 characters each)
   - Respect character limits strictly (Spanish characters count as 1 char)
   - Incorporate top-performing patterns from analytics
   - Follow brand voice: warm, authentic, craftsmanship-focused
   - Never use words from the "avoid" list

6. **Validate**: Run `npx tsx -e "import {validateRsaBatch} from './src/utils/validators.js'; ..."` to validate all character limits.

7. **Stage for review**: Present the ads in a formatted table:
   ```
   # Headlines (15)
   | # | Headline | Chars |
   |---|----------|-------|
   | 1 | ...      | 28    |

   # Descriptions (4)
   | # | Description | Chars |
   |---|-------------|-------|
   | 1 | ...         | 85    |
   ```

8. **Ask for approval**: "Review the ads above. Options: [a] Approve all, [e] Edit specific items, [r] Regenerate, [s] Skip"

9. **On approval**: Run the publish script to create ads in PAUSED state via Google Ads API.

10. **Confirm**: Show the created ad resource names and remind the user to activate them in Google Ads dashboard when ready.
```

- [ ] **Step 2: Create meta-ads command**

Create: `commands/meta-ads.md` — same structure adapted for Meta Marketing API (primary text, headline, description per ad, audience variants).

- [ ] **Step 3: Commit**

```bash
git add commands/rsa.md commands/meta-ads.md
git commit -m "feat(commands): add /rsa and /meta-ads slash commands for ad generation"
```

---

### Task 13: Run full test suite — Phase 2 checkpoint

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Tag Phase 2**

```bash
git tag phase-2-ad-engine
```

---

## Chunk 3: Social & Email Engines (Phases 3-4)

### Task 14: Social Command

**Files:**
- Create: `commands/social.md`

- [ ] **Step 1: Create the slash command**

```markdown
---
name: social
description: Generate and schedule social media posts for Woodabu's Instagram/Facebook
---

You are generating social media posts for Woodabu.

## Subcommands

### `/social weekly`
Generate a weekly calendar of 4-5 posts.

### `/social product [name]`
Generate a post for a specific product.

### `/social campaign [theme]`
Generate a series of posts for a campaign.

## Process

1. **Read engagement data**: Fetch recent post performance from Meta Graph API via `npx tsx src/apis/meta.ts`.
2. **Read products**: Fetch catalog from Shopify via `npx tsx src/apis/shopify.ts`.
3. **Read brand guidelines**: Reference `skills/woodabu-brand.md`.
4. **Read insights**: Check `data/insights/` for content patterns that work.
5. **Generate posts** — each includes:
   - Copy in Woodabu tone (ES, warm, authentic)
   - 10-15 hashtags (mix broad + niche)
   - Optimal publish time based on engagement data
   - Image suggestion: product photo URL from Shopify catalog
6. **Stage**: Show each post formatted in terminal. User approves/edits/skips individually.
7. **On approval**: Schedule via Meta Graph API. Posts are SCHEDULED (cancellable from Meta Business Suite).
8. **Remind**: User must upload images manually in Meta Business Suite for each scheduled post.
```

- [ ] **Step 2: Commit**

```bash
git add commands/social.md
git commit -m "feat(commands): add /social slash command for social media post generation"
```

---

### Task 15: Email HTML Preview

**Files:**
- Create: `src/staging/html-preview.ts`
- Create: `src/staging/html-preview.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/staging/html-preview.test.ts
import { describe, it, expect } from 'vitest';
import { generateEmailHtml, compileMjml } from './html-preview.js';

describe('compileMjml', () => {
  it('compiles valid MJML to HTML', () => {
    const mjml = `<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>`;
    const html = compileMjml(mjml);
    expect(html).toContain('Hello');
    expect(html).toContain('<!doctype html>');
  });

  it('throws on invalid MJML', () => {
    expect(() => compileMjml('<invalid>')).toThrow();
  });
});

describe('generateEmailHtml', () => {
  it('generates email with subject, preheader, and body', () => {
    const result = generateEmailHtml({
      subject: 'Test Subject',
      preheader: 'Preview text',
      bodyMjml: '<mj-section><mj-column><mj-text>Content here</mj-text></mj-column></mj-section>',
      products: [{ title: 'Mesa Roble', price: '899.00', imageUrl: 'https://example.com/mesa.jpg', url: 'https://woodabu.com/mesa' }],
    });
    expect(result.html).toContain('Content here');
    expect(result.html).toContain('Mesa Roble');
    expect(result.html).not.toContain('<script');
  });

  it('includes product cards', () => {
    const result = generateEmailHtml({
      subject: 'Newsletter',
      preheader: 'New arrivals',
      bodyMjml: '<mj-section><mj-column><mj-text>Intro</mj-text></mj-column></mj-section>',
      products: [
        { title: 'Mesa Roble', price: '899.00', imageUrl: 'https://example.com/mesa.jpg', url: 'https://woodabu.com/mesa' },
        { title: 'Cabecero Castaño', price: '649.00', imageUrl: 'https://example.com/cab.jpg', url: 'https://woodabu.com/cabecero' },
      ],
    });
    expect(result.html).toContain('Mesa Roble');
    expect(result.html).toContain('Cabecero Castaño');
    expect(result.html).toContain('899');
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npx vitest run src/staging/html-preview.test.ts`

- [ ] **Step 3: Implement**

```typescript
// src/staging/html-preview.ts
import mjml2html from 'mjml';

export interface EmailProduct {
  title: string;
  price: string;
  imageUrl: string;
  url: string;
}

export interface EmailInput {
  subject: string;
  preheader: string;
  bodyMjml: string;
  products: EmailProduct[];
}

export function compileMjml(mjmlContent: string): string {
  const result = mjml2html(mjmlContent, { validationLevel: 'strict' });
  if (result.errors.length > 0) {
    throw new Error(`MJML compilation errors: ${result.errors.map((e) => e.message).join(', ')}`);
  }
  return result.html;
}

function productCardsMjml(products: EmailProduct[]): string {
  return products
    .map(
      (p) => `
    <mj-section>
      <mj-column>
        <mj-image src="${p.imageUrl}" alt="${p.title}" width="300px" />
        <mj-text font-size="18px" font-weight="bold">${p.title}</mj-text>
        <mj-text font-size="16px" color="#8B6914">${p.price} €</mj-text>
        <mj-button href="${p.url}" background-color="#8B6914">Ver producto</mj-button>
      </mj-column>
    </mj-section>`,
    )
    .join('\n');
}

export function generateEmailHtml(input: EmailInput): { html: string; subject: string } {
  const fullMjml = `
<mjml>
  <mj-head>
    <mj-preview>${input.preheader}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Georgia, serif" />
      <mj-text font-size="16px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f5f0eb">
    ${input.bodyMjml}
    ${input.products.length > 0 ? productCardsMjml(input.products) : ''}
  </mj-body>
</mjml>`;

  return {
    html: compileMjml(fullMjml),
    subject: input.subject,
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/staging/html-preview.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/staging/html-preview.ts src/staging/html-preview.test.ts
git commit -m "feat(email): add MJML email generator with product cards"
```

---

### Task 16: Email Command

**Files:**
- Create: `commands/email.md`

- [ ] **Step 1: Create the slash command**

```markdown
---
name: email
description: Generate email campaigns and flows for Woodabu via Shopify Email
---

You are generating email marketing content for Woodabu.

## Subcommands

### `/email campaign [topic]`
Full campaign with subject line, preheader, HTML body.

### `/email flow [type]`
Automated flows: welcome, abandoned-cart, post-purchase, reactivation.

### `/email newsletter`
Weekly/monthly newsletter.

## Process

1. **Read customer data**: Fetch segments and top products from Shopify.
2. **Read brand guidelines**: Reference `skills/woodabu-brand.md`.
3. **Read insights**: Check `data/insights/` for email patterns.
4. **Generate email** — includes:
   - 3 subject line variants (for A/B testing)
   - Preheader text
   - Body in MJML format following brand style
   - Product recommendations from Shopify
5. **Compile**: Use `src/staging/html-preview.ts` to compile MJML → HTML.
6. **Stage**: Save HTML to temp file, open in browser for preview. Show summary in terminal.
7. **On approval**: Attempt to create draft via Shopify GraphQL API. If unavailable, instruct user to copy HTML into Shopify Email manually.
```

- [ ] **Step 2: Commit**

```bash
git add commands/email.md
git commit -m "feat(commands): add /email slash command for email campaign generation"
```

---

### Task 17: Phase 3-4 Checkpoint

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Tag**

```bash
git tag phase-3-4-social-email
```

---

## Chunk 4: Analytics Engine (Phase 5)

### Task 18: Analytics Aggregator

**Files:**
- Create: `src/analytics/aggregator.ts`
- Create: `src/analytics/aggregator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/analytics/aggregator.test.ts
import { describe, it, expect } from 'vitest';
import { aggregateWeekly, formatWeeklySummary } from './aggregator.js';

describe('aggregateWeekly', () => {
  it('combines data from multiple channels', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'Spring', clicks: 500, spend: 200, conversions: 20, ctr: 0.04 }],
      meta: [{ campaignName: 'IG Spring', impressions: 10000, clicks: 300, spend: 150, conversions: 8, ctr: 0.03 }],
      ga4: [{ channel: 'Organic', sessions: 2000, conversions: 50, conversionRate: 0.025 }],
      shopify: { totalSales: 15000, totalOrders: 25, aov: 600, topProducts: [{ title: 'Mesa Roble', units: 8 }] },
    });

    expect(result.totalSpend).toBe(350);
    expect(result.totalConversions).toBe(28); // 20 + 8
    expect(result.channels).toHaveLength(3);
  });

  it('ranks channels by ROAS', () => {
    const result = aggregateWeekly({
      googleAds: [{ campaignName: 'A', clicks: 100, spend: 100, conversions: 5, ctr: 0.05 }],
      meta: [{ campaignName: 'B', impressions: 1000, clicks: 50, spend: 50, conversions: 10, ctr: 0.05 }],
      ga4: [],
      shopify: { totalSales: 5000, totalOrders: 15, aov: 333, topProducts: [] },
    });

    // Meta has better ROAS (10 conversions / 50 spend) vs Google (5 / 100)
    expect(result.topChannels[0].name).toBe('meta');
  });
});

describe('formatWeeklySummary', () => {
  it('produces readable markdown summary', () => {
    const summary = formatWeeklySummary({
      totalSpend: 350,
      totalConversions: 28,
      channels: [],
      topChannels: [{ name: 'google_ads', spend: 200, conversions: 20, roas: 2.5 }],
      bottomChannels: [],
      topContent: [],
      recommendations: ['Increase Google Ads budget'],
    });

    expect(summary).toContain('350');
    expect(summary).toContain('28');
    expect(summary).toContain('Google Ads');
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npx vitest run src/analytics/aggregator.test.ts`

- [ ] **Step 3: Implement aggregator**

```typescript
// src/analytics/aggregator.ts
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
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/analytics/aggregator.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/analytics/aggregator.ts src/analytics/aggregator.test.ts
git commit -m "feat(analytics): add cross-platform data aggregator with weekly summaries"
```

---

### Task 19: Analytics Command

**Files:**
- Create: `commands/analytics.md`

- [ ] **Step 1: Create the slash command**

```markdown
---
name: analytics
description: Cross-platform marketing analytics for Woodabu
---

You are analyzing Woodabu's marketing performance across all channels.

## Subcommands

### `/analytics weekly`
Executive weekly summary.

### `/analytics channel [name]`
Deep dive: google-ads, meta, shopify, organic.

### `/analytics product [name]`
Cross-channel performance for a specific product.

### `/analytics compare [period1] vs [period2]`
Temporal comparison. Formats: `YYYY-MM-DD:YYYY-MM-DD` or aliases: `last-week`, `last-month`, `last-quarter`, `last-year`.

## Process

1. **Fetch data** from all APIs:
   - Google Ads: campaign performance via `src/apis/google-ads.ts`
   - Meta: ad + post insights via `src/apis/meta.ts`
   - GA4: traffic by channel via `src/apis/ga4.ts`
   - Shopify: sales and orders via `src/apis/shopify.ts`

2. **Aggregate**: Use `src/analytics/aggregator.ts` to combine cross-platform data.

3. **Analyze**: Identify patterns, top/bottom performers, and generate recommendations.

4. **Present**: Format summary in terminal using `formatWeeklySummary()`.

5. **Save insights**: Store report in `data/insights/` via `InsightsStore.save()` for use by other modules.

6. **Optionally export**: If user requests, save as Markdown file.
```

- [ ] **Step 2: Commit**

```bash
git add commands/analytics.md
git commit -m "feat(commands): add /analytics slash command for cross-platform reporting"
```

---

### Task 20: Final Integration Test & Tag

- [ ] **Step 1: Run complete test suite**

Run: `npx vitest run --coverage`
Expected: All PASS, coverage > 80%

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Verify all files exist**

```bash
ls -la skills/woodabu-brand.md commands/*.md src/apis/*.ts src/utils/*.ts src/analytics/*.ts src/staging/*.ts
```

- [ ] **Step 4: Tag Phase 5**

```bash
git tag phase-5-analytics-engine
```

- [ ] **Step 5: Final commit if any uncommitted changes**

```bash
git status
# If changes exist:
git add -A && git commit -m "chore: final Phase 5 cleanup"
```

---

## Chunk 5: Review Gaps — Error Handling, Staging Reviewer, Missing Code

### Task 21: API Retry/Error Wrapper + Tests

**Files:**
- Create: `src/utils/api-retry.ts`
- Create: `src/utils/api-retry.test.ts`
- Modify: `src/apis/meta.ts` (wrap fetch calls)
- Modify: `src/apis/shopify.ts` (wrap fetch calls)

- [ ] **Step 1: Write failing tests for retry wrapper**

```typescript
// src/utils/api-retry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry, ApiError } from './api-retry.js';

describe('fetchWithRetry', () => {
  it('returns response on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on network error then succeeds', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 10 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('respects Retry-After header on 429', async () => {
    const headers429 = new Headers({ 'Retry-After': '1' });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429, headers: headers429 }))
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 10 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError after exhausting retries', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(
      fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 10 })
    ).rejects.toThrow(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it('uses exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0);
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(new Response('ok', { status: 200 }));

    await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 100 });
    expect(delays[0]).toBe(100);  // 100 * 2^0
    expect(delays[1]).toBe(200);  // 100 * 2^1

    vi.restoreAllMocks();
  });
});

describe('ApiError', () => {
  it('includes status code and url', () => {
    const err = new ApiError('Meta API error', 429, 'https://graph.facebook.com/...');
    expect(err.statusCode).toBe(429);
    expect(err.url).toContain('graph.facebook.com');
    expect(err.message).toContain('429');
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npx vitest run src/utils/api-retry.test.ts`

- [ ] **Step 3: Implement retry wrapper**

```typescript
// src/utils/api-retry.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly url: string,
  ) {
    super(`${message} (status: ${statusCode}, url: ${url})`);
    this.name = 'ApiError';
  }
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  fetchFn?: typeof fetch;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const { retries = 1, baseDelayMs = 3000, fetchFn = fetch } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchFn(url, init);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelayMs * Math.pow(2, attempt);

        if (attempt < retries) {
          await delay(waitMs);
          continue;
        }
        throw new ApiError('Rate limit exceeded', 429, url);
      }

      if (!response.ok && response.status >= 500 && attempt < retries) {
        await delay(baseDelayMs * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError instanceof ApiError) throw lastError;

      if (attempt < retries) {
        await delay(baseDelayMs * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw new ApiError(
    lastError?.message ?? 'Request failed after retries',
    null,
    url,
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/utils/api-retry.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/utils/api-retry.ts src/utils/api-retry.test.ts
git commit -m "feat(utils): add fetchWithRetry with exponential backoff and rate limit handling"
```

---

### Task 22: API Client Error Tests

**Files:**
- Modify: `src/apis/meta.test.ts` (add error tests)
- Modify: `src/apis/shopify.test.ts` (add error tests)

- [ ] **Step 1: Add error tests for Meta client**

Append to `src/apis/meta.test.ts`:

```typescript
describe('MetaClient error handling', () => {
  it('throws on 500 server error', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({ error: { message: 'Internal error' } }, { status: 500 }),
      ),
    );
    const client = new MetaClient(config);
    await expect(client.getAdInsights()).rejects.toThrow('500');
  });

  it('throws on malformed JSON response', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        new HttpResponse('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
      ),
    );
    const client = new MetaClient(config);
    await expect(client.getAdInsights()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Add error tests for Shopify client**

Append to `src/apis/shopify.test.ts`:

```typescript
describe('ShopifyClient error handling', () => {
  it('throws on HTTP error', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );
    const client = new ShopifyClient(config);
    await expect(client.getProducts()).rejects.toThrow('401');
  });

  it('handles GraphQL errors in 200 response', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          errors: [{ message: 'Access denied' }],
          data: null,
        }),
      ),
    );
    const client = new ShopifyClient(config);
    await expect(client.getProducts()).rejects.toThrow('Access denied');
  });
});
```

- [ ] **Step 3: Update ShopifyClient.query() to handle GraphQL errors**

In `src/apis/shopify.ts`, update the `query` method:

```typescript
  private async query(graphql: string): Promise<Record<string, unknown>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query: graphql }),
    });
    if (!response.ok) throw new Error(`Shopify API error: ${response.status}`);
    const json = await response.json() as { data: Record<string, unknown> | null; errors?: Array<{ message: string }> };
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`);
    }
    if (!json.data) {
      throw new Error('Shopify API returned null data');
    }
    return json.data;
  }
```

- [ ] **Step 4: Run all API tests**

Run: `npx vitest run src/apis/`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/apis/meta.test.ts src/apis/shopify.test.ts src/apis/shopify.ts
git commit -m "test(apis): add error handling tests for Meta and Shopify clients"
```

---

### Task 23: Meta Ads Command (Full Content)

**Files:**
- Create: `commands/meta-ads.md`

- [ ] **Step 1: Write the complete command file**

```markdown
---
name: meta-ads
description: Generate Meta (Facebook/Instagram) ad copy with audience variants for Woodabu
---

You are generating Meta Ads for Woodabu, a handcrafted sustainable furniture company.

## Process

1. **Read performance data**: Fetch current Meta ad campaign insights via `npx tsx src/apis/meta.ts`. If the API is unavailable, proceed without performance data and note this.

2. **Read product catalog**: Fetch products from Shopify via `npx tsx src/apis/shopify.ts`.

3. **Read brand guidelines**: Reference `skills/woodabu-brand.md`.

4. **Read recent insights**: Check `data/insights/` for the 4 most recent reports.

5. **Check Meta token expiry**: Run `checkMetaTokenExpiry()` from `src/utils/auth.ts`. If <7 days remaining, warn the user before proceeding.

6. **Generate ad variants** — for EACH of these audience segments:

   **a) Eco-conscious consumers**
   - Emphasis: sustainability, Zero Waste collection, environmental impact
   - Tone: inspiring, purposeful

   **b) Design lovers**
   - Emphasis: unique artisan aesthetics, solid wood grain, exclusive pieces
   - Tone: refined, appreciative of craft

   **c) Gift shoppers**
   - Emphasis: meaningful gifts, lifetime warranty, personalization
   - Tone: warm, emotional

   **d) Home renovation / new home buyers**
   - Emphasis: durability, investment pieces, made-to-last
   - Tone: practical but aspirational

   For each segment, generate:
   - **Primary text** (125 chars recommended, 250 max)
   - **Headline** (40 chars max)
   - **Description** (30 chars max)
   - All in Spanish unless user specifies otherwise

7. **Stage for review**: Present in a table grouped by segment:
   ```
   ## Segment: Eco-conscious
   | Field        | Content                          | Chars |
   |-------------|----------------------------------|-------|
   | Primary text | Cada mueble que creamos...       | 120   |
   | Headline     | Madera con propósito             | 21    |
   | Description  | Hecho a mano en Madrid           | 22    |
   ```

8. **Ask for approval**: Per-segment: [a] Approve, [e] Edit, [r] Regenerate, [s] Skip

9. **On approval**: Create ads as DRAFT via Meta Marketing API. Remind user they appear in Meta Ads Manager as drafts for final review.
```

- [ ] **Step 2: Commit**

```bash
git add commands/meta-ads.md
git commit -m "feat(commands): add complete /meta-ads command with audience segmentation"
```

---

### Task 24: Shopify Email Draft + Customer Segments

**Files:**
- Modify: `src/apis/shopify.ts` (add `createEmailDraft()` and `getCustomerSegments()`)
- Modify: `src/apis/shopify.test.ts` (add tests)

- [ ] **Step 1: Write failing tests**

Append to `src/apis/shopify.test.ts`:

```typescript
describe('ShopifyClient email and segments', () => {
  it('fetches customer segments', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          data: {
            segments: {
              edges: [
                { node: { id: 'gid://shopify/Segment/1', name: 'Repeat buyers', query: 'orders_count > 1' } },
                { node: { id: 'gid://shopify/Segment/2', name: 'New customers', query: 'orders_count = 1' } },
              ],
            },
          },
        }),
      ),
    );
    const client = new ShopifyClient(config);
    const segments = await client.getCustomerSegments();
    expect(segments).toHaveLength(2);
    expect(segments[0].name).toBe('Repeat buyers');
  });

  it('creates email campaign draft', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          data: {
            emailMarketingCampaignCreate: {
              emailMarketingCampaign: { id: 'gid://shopify/EmailCampaign/1' },
              userErrors: [],
            },
          },
        }),
      ),
    );
    const client = new ShopifyClient(config);
    const result = await client.createEmailDraft({
      subject: 'Nueva colección Zero Waste',
      body: '<html><body>Content</body></html>',
    });
    expect(result.campaignId).toContain('EmailCampaign');
  });

  it('falls back gracefully if email mutation has userErrors', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          data: {
            emailMarketingCampaignCreate: {
              emailMarketingCampaign: null,
              userErrors: [{ message: 'Feature not available', field: ['input'] }],
            },
          },
        }),
      ),
    );
    const client = new ShopifyClient(config);
    const result = await client.createEmailDraft({ subject: 'Test', body: '<html></html>' });
    expect(result.fallback).toBe(true);
    expect(result.campaignId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npx vitest run src/apis/shopify.test.ts`

- [ ] **Step 3: Add methods to ShopifyClient**

Add to `src/apis/shopify.ts`:

```typescript
export interface CustomerSegment {
  id: string;
  name: string;
  query: string;
}

export interface EmailDraftInput {
  subject: string;
  body: string;
}

export interface EmailDraftResult {
  campaignId: string | null;
  fallback: boolean;
  error?: string;
}

// Add these methods to the ShopifyClient class:

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const data = await this.query(`{
      segments(first: 50) {
        edges {
          node { id name query }
        }
      }
    }`);

    const segments = data.segments as { edges: Array<{ node: { id: string; name: string; query: string } }> };
    return segments.edges.map(({ node }) => ({
      id: node.id,
      name: node.name,
      query: node.query,
    }));
  }

  async createEmailDraft(input: EmailDraftInput): Promise<EmailDraftResult> {
    try {
      const data = await this.query(`
        mutation {
          emailMarketingCampaignCreate(input: {
            subject: "${input.subject.replace(/"/g, '\\"')}"
            body: "${input.body.replace(/"/g, '\\"')}"
          }) {
            emailMarketingCampaign { id }
            userErrors { message field }
          }
        }
      `);

      const result = data.emailMarketingCampaignCreate as {
        emailMarketingCampaign: { id: string } | null;
        userErrors: Array<{ message: string; field: string[] }>;
      };

      if (result.userErrors.length > 0) {
        return {
          campaignId: null,
          fallback: true,
          error: result.userErrors.map((e) => e.message).join(', '),
        };
      }

      return {
        campaignId: result.emailMarketingCampaign?.id ?? null,
        fallback: false,
      };
    } catch {
      return { campaignId: null, fallback: true, error: 'Email API unavailable' };
    }
  }
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/apis/shopify.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/apis/shopify.ts src/apis/shopify.test.ts
git commit -m "feat(shopify): add customer segments and email draft creation with fallback"
```

---

### Task 25: Staging Reviewer Module

**Files:**
- Create: `src/staging/reviewer.ts`
- Create: `src/staging/reviewer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/staging/reviewer.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatAdTable,
  formatPostPreview,
  formatEmailSummary,
  StagedItem,
  ReviewDecision,
  applyDecisions,
} from './reviewer.js';

describe('formatAdTable', () => {
  it('formats headlines into a numbered table', () => {
    const headlines = ['Muebles hechos a mano', 'Madera maciza sostenible'];
    const output = formatAdTable(headlines, 'headline');
    expect(output).toContain('| 1 |');
    expect(output).toContain('Muebles hechos a mano');
    expect(output).toContain('21'); // char count
  });
});

describe('formatPostPreview', () => {
  it('formats a social post with copy, hashtags, and time', () => {
    const output = formatPostPreview({
      copy: 'Cada mesa tiene una historia.',
      hashtags: ['#woodabu', '#maderanatural'],
      scheduledTime: '2026-03-20 10:00',
      imageUrl: 'https://cdn.shopify.com/mesa.jpg',
    });
    expect(output).toContain('Cada mesa tiene una historia.');
    expect(output).toContain('#woodabu');
    expect(output).toContain('10:00');
    expect(output).toContain('mesa.jpg');
  });
});

describe('formatEmailSummary', () => {
  it('formats email summary with subject variants', () => {
    const output = formatEmailSummary({
      subjects: ['Subject A', 'Subject B', 'Subject C'],
      segment: 'Repeat buyers',
      productCount: 3,
      preheader: 'Preview text here',
    });
    expect(output).toContain('Subject A');
    expect(output).toContain('Repeat buyers');
    expect(output).toContain('3 products');
  });
});

describe('applyDecisions', () => {
  it('filters to only approved items', () => {
    const items: StagedItem[] = [
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' },
      { id: '3', content: 'Item 3' },
    ];
    const decisions: ReviewDecision[] = [
      { id: '1', action: 'approve' },
      { id: '2', action: 'skip' },
      { id: '3', action: 'approve' },
    ];

    const approved = applyDecisions(items, decisions);
    expect(approved).toHaveLength(2);
    expect(approved.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('applies edits to items', () => {
    const items: StagedItem[] = [{ id: '1', content: 'Original' }];
    const decisions: ReviewDecision[] = [{ id: '1', action: 'edit', newContent: 'Edited' }];

    const result = applyDecisions(items, decisions);
    expect(result[0].content).toBe('Edited');
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npx vitest run src/staging/reviewer.test.ts`

- [ ] **Step 3: Implement reviewer**

```typescript
// src/staging/reviewer.ts
export interface StagedItem {
  id: string;
  content: string;
}

export interface ReviewDecision {
  id: string;
  action: 'approve' | 'edit' | 'skip' | 'regenerate';
  newContent?: string;
}

export interface PostPreviewInput {
  copy: string;
  hashtags: string[];
  scheduledTime: string;
  imageUrl: string | null;
}

export interface EmailSummaryInput {
  subjects: string[];
  segment: string;
  productCount: number;
  preheader: string;
}

export function formatAdTable(items: string[], type: 'headline' | 'description'): string {
  const maxChars = type === 'headline' ? 30 : 90;
  const header = `| # | ${type === 'headline' ? 'Headline' : 'Description'} | Chars | Status |`;
  const separator = '|---|' + '-'.repeat(Math.max(type.length + 2, 12)) + '|-------|--------|';

  const rows = items.map((item, i) => {
    const charCount = [...item].length;
    const status = charCount > maxChars ? 'OVER' : charCount >= maxChars - 2 ? 'WARN' : 'OK';
    return `| ${i + 1} | ${item} | ${charCount} | ${status} |`;
  });

  return [header, separator, ...rows].join('\n');
}

export function formatPostPreview(input: PostPreviewInput): string {
  const lines = [
    '---',
    `**Copy:** ${input.copy}`,
    `**Hashtags:** ${input.hashtags.join(' ')}`,
    `**Scheduled:** ${input.scheduledTime}`,
  ];
  if (input.imageUrl) {
    lines.push(`**Image:** ${input.imageUrl}`);
  }
  lines.push('---');
  return lines.join('\n');
}

export function formatEmailSummary(input: EmailSummaryInput): string {
  const lines = [
    '## Email Campaign Summary',
    '',
    '**Subject line variants:**',
    ...input.subjects.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    `**Preheader:** ${input.preheader}`,
    `**Segment:** ${input.segment}`,
    `**Includes:** ${input.productCount} products`,
  ];
  return lines.join('\n');
}

export function applyDecisions(items: StagedItem[], decisions: ReviewDecision[]): StagedItem[] {
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));

  return items
    .map((item) => {
      const decision = decisionMap.get(item.id);
      if (!decision || decision.action === 'skip') return null;
      if (decision.action === 'edit' && decision.newContent) {
        return { ...item, content: decision.newContent };
      }
      if (decision.action === 'approve') return item;
      return null; // regenerate handled upstream
    })
    .filter((item): item is StagedItem => item !== null);
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/staging/reviewer.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/staging/reviewer.ts src/staging/reviewer.test.ts
git commit -m "feat(staging): add reviewer module with formatting and approval logic"
```

---

### Task 26: Final Verification

- [ ] **Step 1: Run complete test suite with coverage**

Run: `npx vitest run --coverage`
Expected: All PASS, coverage > 80%

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Verify all spec files are implemented**

```bash
echo "=== API clients ===" && ls src/apis/*.ts
echo "=== Utils ===" && ls src/utils/*.ts
echo "=== Staging ===" && ls src/staging/*.ts
echo "=== Analytics ===" && ls src/analytics/*.ts
echo "=== Commands ===" && ls commands/*.md
echo "=== Skills ===" && ls skills/*.md
```

Expected files:
- `src/apis/`: google-ads.ts, meta.ts, shopify.ts, ga4.ts (+ .test.ts each)
- `src/utils/`: auth.ts, validators.ts, date-parser.ts, api-retry.ts (+ .test.ts each)
- `src/staging/`: reviewer.ts, html-preview.ts (+ .test.ts each)
- `src/analytics/`: aggregator.ts, insights-store.ts (+ .test.ts each)
- `commands/`: rsa.md, meta-ads.md, social.md, email.md, analytics.md
- `skills/`: woodabu-brand.md

- [ ] **Step 4: Tag final**

```bash
git tag v1.0.0-complete
```
