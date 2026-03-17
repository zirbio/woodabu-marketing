# Analytics & Proposals Only — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all API write operations and transform the platform into a pure analytics, insights, and content proposal system with file-based output and advanced analytics.

**Architecture:** Surgical approach — delete write methods from existing API clients, add a file exporter utility, build 4 new analytics modules (trends, anomalies, correlations, projections), and update commands to end at "show + save" instead of "create on platform."

**Tech Stack:** TypeScript, Vitest, Node.js fs module (for exporter), pure math (no external deps for analytics).

**Spec:** `docs/superpowers/specs/2026-03-17-analytics-proposals-only-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/apis/meta.ts` | Remove `createAdDraft()`, `schedulePost()`, `CreateAdInput`, `SchedulePostInput` |
| Modify | `src/apis/google-ads.ts` | Remove `createRsaAd()`, `CreateRsaInput` |
| Modify | `src/apis/shopify.ts` | Remove `createEmailDraft()`, `EmailDraftInput`, `EmailDraftResult` |
| Modify | `src/staging/reviewer.ts` | Remove `applyDecisions()`, `ReviewDecision` |
| Create | `src/utils/exporter.ts` | `saveOutput()` — write files to `output/YYYY-MM-DD/` |
| Modify | `src/analytics/insights-store.ts` | Add `PeriodMetrics` interface, extend `InsightReport` |
| Create | `src/analytics/trends.ts` | Trend detection via simple moving average |
| Create | `src/analytics/anomalies.ts` | Anomaly detection via stddev |
| Create | `src/analytics/correlations.ts` | Cross-channel Pearson correlation |
| Create | `src/analytics/projections.ts` | Simple linear regression forecasting |
| Modify | `src/apis/meta.test.ts` | Remove write-method tests and MSW handlers |
| Modify | `src/apis/google-ads.test.ts` | Remove `createRsaAd` tests and mutate mock |
| Modify | `src/apis/shopify.test.ts` | Remove `createEmailDraft` tests |
| Modify | `src/staging/reviewer.test.ts` | Remove `applyDecisions` tests |
| Create | `src/utils/exporter.test.ts` | Tests for `saveOutput()` |
| Create | `src/analytics/trends.test.ts` | Tests for trend detection |
| Create | `src/analytics/anomalies.test.ts` | Tests for anomaly detection |
| Create | `src/analytics/correlations.test.ts` | Tests for correlations |
| Create | `src/analytics/projections.test.ts` | Tests for projections |
| Modify | `commands/rsa.md` | Remove steps 8-10 (approval + API creation) |
| Modify | `commands/meta-ads.md` | Remove steps 10-11 (approval + API creation) |
| Modify | `commands/social.md` | Remove step 7 (schedule via API) |
| Modify | `commands/email.md` | Remove step 7 (create draft via Shopify API) |
| Modify | `commands/analytics.md` | Add advanced analytics invocation |
| Modify | `commands/campaign.md` | Remove steps 4-7 (approval + API creation) |
| Modify | `.gitignore` | Add `output/` |
| Modify | `CLAUDE.md` | Update project description and architecture |

---

### Task 1: Remove Meta API write methods

**Files:**
- Modify: `src/apis/meta.ts:24-113`
- Modify: `src/apis/meta.test.ts`

- [ ] **Step 1: Remove write methods and types from meta.ts**

Delete lines 24-35 (interfaces `CreateAdInput` and `SchedulePostInput`) and lines 64-113 (methods `createAdDraft()` and `schedulePost()`). The file should end after `getPageInsights()` at line 122.

```typescript
// src/apis/meta.ts — final state:
import { fetchWithRetry } from '../utils/api-retry.js';

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

export class MetaClient {
  constructor(private readonly config: MetaConfig) {}

  async getAdInsights(): Promise<AdInsight[]> {
    const url = `${BASE_URL}/${this.config.adAccountId}/insights?fields=campaign_id,campaign_name,impressions,clicks,ctr,spend,actions&date_preset=last_30d&level=campaign`;

    const response = await fetchWithRetry(url, {
      headers: { 'Authorization': `Bearer ${this.config.systemUserToken}` },
    });
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

  async getPageInsights(): Promise<Record<string, unknown>> {
    const url = `${BASE_URL}/${this.config.pageId}/insights?metric=page_impressions,page_engaged_users&period=week`;
    const response = await fetchWithRetry(url, {
      headers: { 'Authorization': `Bearer ${this.config.pageAccessToken}` },
    });
    if (!response.ok) throw new Error(`Meta API error: ${response.status}`);
    return response.json();
  }
}
```

- [ ] **Step 2: Remove write-method tests and MSW handlers from meta.test.ts**

Remove: (1) MSW handlers for `http.post(act_123/ads)` and `http.post(page_456/feed)` from the `setupServer()` call (lines 16-21), (2) test `'creates ad as draft'` (lines 50-59), (3) test `'schedules a page post'` (lines 61-68), (4) entire describe block `'MetaClient — createAdDraft details'` (lines 239-293), (5) entire describe block `'MetaClient — schedulePost details'` (lines 295-355).

Keep all `getAdInsights` and `getPageInsights` tests and error handling tests intact.

- [ ] **Step 3: Run tests to verify**

Run: `npm run test -- src/apis/meta.test.ts`
Expected: All remaining tests pass.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/apis/meta.ts src/apis/meta.test.ts
git commit -m "refactor(meta): remove write methods (createAdDraft, schedulePost)"
```

---

### Task 2: Remove Google Ads API write method

**Files:**
- Modify: `src/apis/google-ads.ts:25-142`
- Modify: `src/apis/google-ads.test.ts`

- [ ] **Step 1: Remove write method and type from google-ads.ts**

Delete lines 25-29 (interface `CreateRsaInput`) and lines 101-142 (method `createRsaAd()`). Keep `getCampaignPerformance()` and `rankPerformers()`.

- [ ] **Step 2: Remove write-method tests from google-ads.test.ts**

Remove: (1) `googleAdsMutateMock` variable (line 12), (2) `mutateResources: googleAdsMutateMock` from mock setup (line 21), (3) test `'creates ads in PAUSED state'` (lines 46-54), (4) entire describe block `'GoogleAdsClient — createRsaAd edge cases'` (lines 92-112).

Keep all `getCampaignPerformance` and `rankPerformers` tests.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/apis/google-ads.test.ts`
Expected: All remaining tests pass.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/apis/google-ads.ts src/apis/google-ads.test.ts
git commit -m "refactor(google-ads): remove write method (createRsaAd)"
```

---

### Task 3: Remove Shopify API write method

**Files:**
- Modify: `src/apis/shopify.ts:29-177`
- Modify: `src/apis/shopify.test.ts`

- [ ] **Step 1: Remove write method and types from shopify.ts**

Delete lines 29-38 (interfaces `EmailDraftInput` and `EmailDraftResult`) and lines 142-177 (method `createEmailDraft()`).

- [ ] **Step 2: Remove write-method tests from shopify.test.ts**

Remove: (1) test `'creates email campaign draft'` (lines 112-131), (2) test `'falls back gracefully if email mutation has userErrors'` (lines 133-151), (3) entire describe block `'ShopifyClient — createEmailDraft edge cases'` (lines 246-260).

Keep all `getProducts`, `getRecentOrders`, `getCustomerSegments` tests.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/apis/shopify.test.ts`
Expected: All remaining tests pass.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/apis/shopify.ts src/apis/shopify.test.ts
git commit -m "refactor(shopify): remove write method (createEmailDraft)"
```

---

### Task 4: Simplify staging reviewer

**Files:**
- Modify: `src/staging/reviewer.ts:8-12,70-84`
- Modify: `src/staging/reviewer.test.ts`

- [ ] **Step 1: Remove applyDecisions and ReviewDecision from reviewer.ts**

Delete lines 8-12 (interface `ReviewDecision`) and lines 70-84 (function `applyDecisions()`). Keep `StagedItem`, `PostPreviewInput`, `EmailSummaryInput`, and the three format functions.

- [ ] **Step 2: Remove applyDecisions tests from reviewer.test.ts**

Remove: (1) `applyDecisions` from the import (line 6), (2) `ReviewDecision` from the type import (line 8), (3) entire describe block `'applyDecisions'` (lines 49-74), (4) entire describe block `'applyDecisions — edge cases'` (lines 158-192).

Keep all `formatAdTable`, `formatPostPreview`, `formatEmailSummary` tests.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/staging/reviewer.test.ts`
Expected: All remaining tests pass.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors. If other files import `applyDecisions` or `ReviewDecision` and cause errors, note them — they will be fixed in Task 12 (test cleanup).

- [ ] **Step 5: Commit**

```bash
git add src/staging/reviewer.ts src/staging/reviewer.test.ts
git commit -m "refactor(reviewer): remove applyDecisions and ReviewDecision"
```

---

### Task 5: Create file exporter

**Files:**
- Create: `src/utils/exporter.ts`
- Create: `src/utils/exporter.test.ts`

- [ ] **Step 1: Write the exporter test file**

```typescript
// src/utils/exporter.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { saveOutput } from './exporter.js';

const TEST_OUTPUT_DIR = path.join(new URL('.', import.meta.url).pathname, '../../test-output');

afterEach(() => {
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
});

describe('saveOutput', () => {
  it('creates output file in dated subdirectory', () => {
    const result = saveOutput('rsa', 'spring-comedor', '# RSA Content', 'md', TEST_OUTPUT_DIR);
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.filePath).toContain('rsa-spring-comedor.md');
    expect(result.type).toBe('rsa');
  });

  it('creates directory if it does not exist', () => {
    saveOutput('analytics', 'weekly', '# Report', 'md', TEST_OUTPUT_DIR);
    const today = new Date().toISOString().split('T')[0];
    const dir = path.join(TEST_OUTPUT_DIR, today);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('slugifies name: lowercase, hyphens, strip accents', () => {
    const result = saveOutput('meta-ads', 'Campaña_Primavera Ñoño', 'content', 'md', TEST_OUTPUT_DIR);
    expect(result.filePath).toContain('meta-ads-campana-primavera-nono.md');
  });

  it('defaults format to md', () => {
    const result = saveOutput('social', 'test', 'content', undefined, TEST_OUTPUT_DIR);
    expect(result.filePath).toEndWith('.md');
  });

  it('supports html format', () => {
    const result = saveOutput('email', 'welcome', '<html></html>', 'html', TEST_OUTPUT_DIR);
    expect(result.filePath).toEndWith('.html');
  });

  it('returns createdAt as ISO string', () => {
    const result = saveOutput('rsa', 'test', 'content', 'md', TEST_OUTPUT_DIR);
    expect(() => new Date(result.createdAt)).not.toThrow();
  });

  it('throws on invalid name with only special characters', () => {
    expect(() => saveOutput('rsa', '!!!', 'content', 'md', TEST_OUTPUT_DIR)).toThrow();
  });

  it('writes content correctly', () => {
    const content = '# Test\n\nHello world';
    const result = saveOutput('rsa', 'test', content, 'md', TEST_OUTPUT_DIR);
    const written = fs.readFileSync(result.filePath, 'utf-8');
    expect(written).toBe(content);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/exporter.test.ts`
Expected: FAIL — module `./exporter.js` not found.

- [ ] **Step 3: Write the exporter implementation**

```typescript
// src/utils/exporter.ts
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ExportResult {
  filePath: string;
  type: string;
  createdAt: string;
}

type OutputType = 'rsa' | 'meta-ads' | 'social' | 'email' | 'campaign' | 'analytics';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function saveOutput(
  type: OutputType,
  name: string,
  content: string,
  format: 'md' | 'html' = 'md',
  baseDir: string = path.resolve('output'),
): ExportResult {
  const slug = slugify(name);
  if (!slug) {
    throw new Error(`Cannot slugify name "${name}" — results in empty string`);
  }

  const today = new Date().toISOString().split('T')[0];
  const dir = path.join(baseDir, today);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${type}-${slug}.${format}`;
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    filePath,
    type,
    createdAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/exporter.test.ts`
Expected: All 7 tests pass.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/exporter.ts src/utils/exporter.test.ts
git commit -m "feat(exporter): add saveOutput for file-based content export"
```

---

### Task 6: Extend InsightReport with PeriodMetrics

**Files:**
- Modify: `src/analytics/insights-store.ts:4-14`
- Modify: `src/analytics/insights-store.test.ts` (if it validates shape)

- [ ] **Step 1: Add PeriodMetrics interface and extend InsightReport**

After the `ChannelInsight` interface (line 7), add:

```typescript
export interface PeriodMetrics {
  period: string;
  channel: string;
  spend: number | null;
  conversions: number | null;
  sessions: number | null;
  roas: number | null;
}
```

Extend `InsightReport` (line 9-14) to add the optional `metrics` field:

```typescript
export interface InsightReport {
  date: string;
  type: 'weekly' | 'channel' | 'product' | 'compare';
  channels: Record<string, ChannelInsight>;
  recommendations: Array<{ action: string; target: string; reason: string }>;
  metrics?: PeriodMetrics[];
}
```

- [ ] **Step 2: Update the type guard `isInsightReport`**

No change needed — `metrics` is optional, so existing validation still passes.

- [ ] **Step 3: Add a round-trip test for PeriodMetrics in insights-store.test.ts**

Add a new test case to `src/analytics/insights-store.test.ts`:

```typescript
it('round-trips InsightReport with PeriodMetrics through save/getLatest', () => {
  const report: InsightReport = {
    date: '2026-03-17',
    type: 'weekly',
    channels: { meta: { top_performers: [], patterns: ['test'] } },
    recommendations: [{ action: 'test', target: 'meta', reason: 'reason' }],
    metrics: [
      { period: '2026-03-10', channel: 'meta', spend: 150, conversions: 12, sessions: null, roas: 2.5 },
      { period: '2026-03-10', channel: 'ga4', spend: null, conversions: 30, sessions: 500, roas: null },
    ],
  };
  store.save(report);
  const loaded = store.getLatest(1);
  expect(loaded[0].metrics).toHaveLength(2);
  expect(loaded[0].metrics![0].spend).toBe(150);
  expect(loaded[0].metrics![1].sessions).toBe(500);
  expect(loaded[0].metrics![1].spend).toBeNull();
});
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/analytics/insights-store.test.ts`
Expected: All tests pass (including the new round-trip test).

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/analytics/insights-store.ts src/analytics/insights-store.test.ts
git commit -m "feat(insights): add PeriodMetrics interface for analytics modules"
```

---

### Task 7: Create trends module

**Files:**
- Create: `src/analytics/trends.ts`
- Create: `src/analytics/trends.test.ts`

- [ ] **Step 1: Write the trends test file**

```typescript
// src/analytics/trends.test.ts
import { describe, it, expect } from 'vitest';
import { detectTrends } from './trends.js';
import type { PeriodMetrics } from './insights-store.js';

describe('detectTrends', () => {
  it('detects rising trend when values increase', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-13', channel: 'meta', spend: 120, conversions: 14, sessions: null, roas: 2.3 },
      { period: '2026-01-20', channel: 'meta', spend: 140, conversions: 18, sessions: null, roas: 2.6 },
      { period: '2026-01-27', channel: 'meta', spend: 160, conversions: 22, sessions: null, roas: 2.9 },
    ];
    const trends = detectTrends(metrics);
    const spendTrend = trends.find((t) => t.metric === 'spend' && t.channel === 'meta');
    expect(spendTrend?.direction).toBe('rising');
  });

  it('detects falling trend when values decrease', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'meta', spend: 200, conversions: 20, sessions: null, roas: 3.0 },
      { period: '2026-01-13', channel: 'meta', spend: 180, conversions: 16, sessions: null, roas: 2.5 },
      { period: '2026-01-20', channel: 'meta', spend: 150, conversions: 12, sessions: null, roas: 2.0 },
      { period: '2026-01-27', channel: 'meta', spend: 120, conversions: 8, sessions: null, roas: 1.5 },
    ];
    const trends = detectTrends(metrics);
    const roasTrend = trends.find((t) => t.metric === 'roas' && t.channel === 'meta');
    expect(roasTrend?.direction).toBe('falling');
  });

  it('returns stable when values are flat', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-13', channel: 'meta', spend: 101, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-20', channel: 'meta', spend: 99, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-27', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
    ];
    const trends = detectTrends(metrics);
    const convTrend = trends.find((t) => t.metric === 'conversions' && t.channel === 'meta');
    expect(convTrend?.direction).toBe('stable');
  });

  it('skips null values in metrics', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-06', channel: 'ga4', spend: null, conversions: 50, sessions: 500, roas: null },
      { period: '2026-01-13', channel: 'ga4', spend: null, conversions: 60, sessions: 600, roas: null },
      { period: '2026-01-20', channel: 'ga4', spend: null, conversions: 70, sessions: 700, roas: null },
    ];
    const trends = detectTrends(metrics);
    expect(trends.find((t) => t.metric === 'spend')).toBeUndefined();
    expect(trends.find((t) => t.metric === 'sessions' && t.channel === 'ga4')).toBeDefined();
  });

  it('returns empty array for empty input', () => {
    expect(detectTrends([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/analytics/trends.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the trends implementation**

```typescript
// src/analytics/trends.ts
import type { PeriodMetrics } from './insights-store.js';

export interface TrendResult {
  channel: string;
  metric: string;
  direction: 'rising' | 'falling' | 'stable';
  magnitude: number;
  periodCount: number;
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;
type MetricKey = typeof METRIC_KEYS[number];

function simpleMovingAverageSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const windowSize = Math.min(3, values.length);
  const smaValues: number[] = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    smaValues.push(window.reduce((a, b) => a + b, 0) / windowSize);
  }
  if (smaValues.length < 2) return 0;
  return (smaValues[smaValues.length - 1] - smaValues[0]) / smaValues[0];
}

export function detectTrends(metrics: PeriodMetrics[]): TrendResult[] {
  if (metrics.length === 0) return [];

  const byChannel = new Map<string, PeriodMetrics[]>();
  for (const m of metrics) {
    const arr = byChannel.get(m.channel) ?? [];
    arr.push(m);
    byChannel.set(m.channel, arr);
  }

  const results: TrendResult[] = [];

  for (const [channel, channelMetrics] of byChannel) {
    const sorted = [...channelMetrics].sort((a, b) => a.period.localeCompare(b.period));

    for (const key of METRIC_KEYS) {
      const values = sorted.map((m) => m[key]).filter((v): v is number => v !== null);
      if (values.length < 2) continue;

      const slope = simpleMovingAverageSlope(values);
      const threshold = 0.05;

      let direction: 'rising' | 'falling' | 'stable';
      if (slope > threshold) direction = 'rising';
      else if (slope < -threshold) direction = 'falling';
      else direction = 'stable';

      results.push({ channel, metric: key, direction, magnitude: Math.abs(slope), periodCount: values.length });
    }
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/analytics/trends.test.ts`
Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/trends.ts src/analytics/trends.test.ts
git commit -m "feat(analytics): add trend detection module"
```

---

### Task 8: Create anomalies module

**Files:**
- Create: `src/analytics/anomalies.ts`
- Create: `src/analytics/anomalies.test.ts`

- [ ] **Step 1: Write the anomalies test file**

```typescript
// src/analytics/anomalies.test.ts
import { describe, it, expect } from 'vitest';
import { detectAnomalies } from './anomalies.js';
import type { PeriodMetrics } from './insights-store.js';

describe('detectAnomalies', () => {
  it('flags value beyond 2 standard deviations as anomaly', () => {
    const historical: PeriodMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      period: `2026-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'meta',
      spend: 100 + (i % 3) * 2,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    }));
    const current: PeriodMetrics = {
      period: '2026-01-15',
      channel: 'meta',
      spend: 300,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    };
    const anomalies = detectAnomalies(current, historical);
    const spendAnomaly = anomalies.find((a) => a.metric === 'spend');
    expect(spendAnomaly).toBeDefined();
    expect(spendAnomaly!.severity).toBe('critical');
  });

  it('does not flag normal values within 2 stddev', () => {
    const historical: PeriodMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      period: `2026-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'meta',
      spend: 95 + i * 2,
      conversions: 10 + (i % 3),
      sessions: null,
      roas: 2.0,
    }));
    const current: PeriodMetrics = {
      period: '2026-01-15',
      channel: 'meta',
      spend: 108,
      conversions: 11,
      sessions: null,
      roas: 2.0,
    };
    const anomalies = detectAnomalies(current, historical);
    expect(anomalies.find((a) => a.metric === 'spend')).toBeUndefined();
  });

  it('skips null metric values', () => {
    const historical: PeriodMetrics[] = Array.from({ length: 5 }, (_, i) => ({
      period: `2026-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'ga4',
      spend: null,
      conversions: 10,
      sessions: 100,
      roas: null,
    }));
    const current: PeriodMetrics = {
      period: '2026-01-10',
      channel: 'ga4',
      spend: null,
      conversions: 10,
      sessions: 500,
      roas: null,
    };
    const anomalies = detectAnomalies(current, historical);
    expect(anomalies.find((a) => a.metric === 'spend')).toBeUndefined();
  });

  it('returns empty for empty historical data', () => {
    const current: PeriodMetrics = {
      period: '2026-01-15',
      channel: 'meta',
      spend: 100,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    };
    expect(detectAnomalies(current, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/analytics/anomalies.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the anomalies implementation**

```typescript
// src/analytics/anomalies.ts
import type { PeriodMetrics } from './insights-store.js';

export interface Anomaly {
  metric: string;
  channel: string;
  value: number;
  mean: number;
  stddev: number;
  severity: 'warning' | 'critical';
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;
type MetricKey = typeof METRIC_KEYS[number];

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function detectAnomalies(current: PeriodMetrics, historical: PeriodMetrics[]): Anomaly[] {
  const sameChannel = historical.filter((m) => m.channel === current.channel);
  if (sameChannel.length < 3) return [];

  const anomalies: Anomaly[] = [];

  for (const key of METRIC_KEYS) {
    const currentVal = current[key];
    if (currentVal === null) continue;

    const historicalVals = sameChannel.map((m) => m[key]).filter((v): v is number => v !== null);
    if (historicalVals.length < 3) continue;

    const avg = mean(historicalVals);
    const sd = stddev(historicalVals, avg);
    if (sd === 0) continue;

    const zScore = Math.abs((currentVal - avg) / sd);
    if (zScore > 2) {
      anomalies.push({
        metric: key,
        channel: current.channel,
        value: currentVal,
        mean: avg,
        stddev: sd,
        severity: zScore > 3 ? 'critical' : 'warning',
      });
    }
  }

  return anomalies;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/analytics/anomalies.test.ts`
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/anomalies.ts src/analytics/anomalies.test.ts
git commit -m "feat(analytics): add anomaly detection module"
```

---

### Task 9: Create correlations module

**Files:**
- Create: `src/analytics/correlations.ts`
- Create: `src/analytics/correlations.test.ts`

- [ ] **Step 1: Write the correlations test file**

```typescript
// src/analytics/correlations.test.ts
import { describe, it, expect } from 'vitest';
import { computeCorrelations } from './correlations.js';
import type { PeriodMetrics } from './insights-store.js';

function makeMetrics(channel: string, periods: number, values: Record<string, number[]>): PeriodMetrics[] {
  return Array.from({ length: periods }, (_, i) => ({
    period: `2026-01-${String(i + 1).padStart(2, '0')}`,
    channel,
    spend: values.spend?.[i] ?? null,
    conversions: values.conversions?.[i] ?? null,
    sessions: values.sessions?.[i] ?? null,
    roas: values.roas?.[i] ?? null,
  }));
}

describe('computeCorrelations', () => {
  it('detects strong positive correlation', () => {
    const meta = makeMetrics('meta', 6, { spend: [100, 200, 300, 400, 500, 600] });
    const ga4 = makeMetrics('ga4', 6, { sessions: [50, 100, 150, 200, 250, 300] });
    const results = computeCorrelations([...meta, ...ga4]);
    const found = results.find((r) => r.metricA.includes('meta') && r.metricB.includes('ga4'));
    expect(found).toBeDefined();
    expect(found!.coefficient).toBeGreaterThan(0.9);
  });

  it('returns empty array for fewer than 5 periods', () => {
    const meta = makeMetrics('meta', 3, { spend: [100, 200, 300] });
    const ga4 = makeMetrics('ga4', 3, { sessions: [50, 100, 150] });
    expect(computeCorrelations([...meta, ...ga4])).toEqual([]);
  });

  it('skips zero-variance vectors', () => {
    const meta = makeMetrics('meta', 6, { spend: [100, 100, 100, 100, 100, 100] });
    const ga4 = makeMetrics('ga4', 6, { sessions: [50, 100, 150, 200, 250, 300] });
    const results = computeCorrelations([...meta, ...ga4]);
    expect(results.find((r) => r.metricA === 'meta:spend')).toBeUndefined();
  });

  it('only returns correlations with |r| > 0.7', () => {
    const meta = makeMetrics('meta', 6, { spend: [100, 300, 200, 500, 150, 400] });
    const ga4 = makeMetrics('ga4', 6, { sessions: [200, 100, 300, 50, 250, 150] });
    const results = computeCorrelations([...meta, ...ga4]);
    for (const r of results) {
      expect(Math.abs(r.coefficient)).toBeGreaterThan(0.7);
    }
  });

  it('returns empty array for empty input', () => {
    expect(computeCorrelations([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/analytics/correlations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the correlations implementation**

```typescript
// src/analytics/correlations.ts
import type { PeriodMetrics } from './insights-store.js';

export interface Correlation {
  metricA: string;
  metricB: string;
  coefficient: number;
  interpretation: string;
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;
const MIN_PERIODS = 5;

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

export function computeCorrelations(metrics: PeriodMetrics[]): Correlation[] {
  if (metrics.length === 0) return [];

  const periods = new Set(metrics.map((m) => m.period));
  if (periods.size < MIN_PERIODS) return [];

  const sortedPeriods = [...periods].sort();

  // Build time series per channel:metric
  const series = new Map<string, Map<string, number>>();
  for (const m of metrics) {
    for (const key of METRIC_KEYS) {
      const val = m[key];
      if (val === null) continue;
      const label = `${m.channel}:${key}`;
      if (!series.has(label)) series.set(label, new Map());
      series.get(label)!.set(m.period, val);
    }
  }

  // Filter to series with enough data points and non-zero variance
  const validSeries: Array<{ label: string; values: number[] }> = [];
  for (const [label, periodMap] of series) {
    const values = sortedPeriods.map((p) => periodMap.get(p)).filter((v): v is number => v !== undefined);
    if (values.length < MIN_PERIODS) continue;
    const allSame = values.every((v) => v === values[0]);
    if (allSame) continue;
    validSeries.push({ label, values });
  }

  const results: Correlation[] = [];

  for (let i = 0; i < validSeries.length; i++) {
    for (let j = i + 1; j < validSeries.length; j++) {
      const a = validSeries[i];
      const b = validSeries[j];
      // Skip same-channel correlations
      const channelA = a.label.split(':')[0];
      const channelB = b.label.split(':')[0];
      if (channelA === channelB) continue;

      // Align on common periods
      const aMap = new Map<string, number>();
      const bMap = new Map<string, number>();
      for (let p = 0; p < sortedPeriods.length; p++) {
        const period = sortedPeriods[p];
        const aIdx = series.get(a.label)?.get(period);
        const bIdx = series.get(b.label)?.get(period);
        if (aIdx !== undefined) aMap.set(period, aIdx);
        if (bIdx !== undefined) bMap.set(period, bIdx);
      }
      const alignedA: number[] = [];
      const alignedB: number[] = [];
      for (const period of sortedPeriods) {
        if (aMap.has(period) && bMap.has(period)) {
          alignedA.push(aMap.get(period)!);
          alignedB.push(bMap.get(period)!);
        }
      }
      if (alignedA.length < MIN_PERIODS) continue;
      const r = pearson(alignedA, alignedB);

      if (Math.abs(r) > 0.7) {
        const direction = r > 0 ? 'positive' : 'negative';
        results.push({
          metricA: a.label,
          metricB: b.label,
          coefficient: Math.round(r * 1000) / 1000,
          interpretation: `Strong ${direction} correlation (r=${r.toFixed(2)}): when ${a.label} increases, ${b.label} ${r > 0 ? 'also increases' : 'decreases'}.`,
        });
      }
    }
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/analytics/correlations.test.ts`
Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/correlations.ts src/analytics/correlations.test.ts
git commit -m "feat(analytics): add cross-channel correlation module"
```

---

### Task 10: Create projections module

**Files:**
- Create: `src/analytics/projections.ts`
- Create: `src/analytics/projections.test.ts`

- [ ] **Step 1: Write the projections test file**

```typescript
// src/analytics/projections.test.ts
import { describe, it, expect } from 'vitest';
import { computeProjections } from './projections.js';
import type { PeriodMetrics } from './insights-store.js';

describe('computeProjections', () => {
  it('projects increasing trend forward', () => {
    const metrics: PeriodMetrics[] = Array.from({ length: 6 }, (_, i) => ({
      period: `2026-01-${String((i + 1) * 7).padStart(2, '0')}`,
      channel: 'meta',
      spend: 100 + i * 20,
      conversions: 10 + i * 2,
      sessions: null,
      roas: 2.0 + i * 0.2,
    }));
    const results = computeProjections(metrics);
    const spendProj = results.find((p) => p.metric === 'spend' && p.channel === 'meta');
    expect(spendProj).toBeDefined();
    expect(spendProj!.twoWeek).toBeGreaterThan(200);
    expect(spendProj!.fourWeek).toBeGreaterThan(spendProj!.twoWeek);
  });

  it('returns empty for fewer than 3 data points', () => {
    const metrics: PeriodMetrics[] = [
      { period: '2026-01-07', channel: 'meta', spend: 100, conversions: 10, sessions: null, roas: 2.0 },
      { period: '2026-01-14', channel: 'meta', spend: 120, conversions: 12, sessions: null, roas: 2.2 },
    ];
    expect(computeProjections(metrics)).toEqual([]);
  });

  it('skips null metrics', () => {
    const metrics: PeriodMetrics[] = Array.from({ length: 4 }, (_, i) => ({
      period: `2026-01-${String((i + 1) * 7).padStart(2, '0')}`,
      channel: 'ga4',
      spend: null,
      conversions: 10 + i * 3,
      sessions: 100 + i * 20,
      roas: null,
    }));
    const results = computeProjections(metrics);
    expect(results.find((p) => p.metric === 'spend')).toBeUndefined();
    expect(results.find((p) => p.metric === 'sessions')).toBeDefined();
  });

  it('includes disclaimer in each projection', () => {
    const metrics: PeriodMetrics[] = Array.from({ length: 4 }, (_, i) => ({
      period: `2026-01-${String((i + 1) * 7).padStart(2, '0')}`,
      channel: 'meta',
      spend: 100 + i * 10,
      conversions: 10,
      sessions: null,
      roas: 2.0,
    }));
    const results = computeProjections(metrics);
    for (const p of results) {
      expect(p.disclaimer).toContain('estimate');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/analytics/projections.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the projections implementation**

```typescript
// src/analytics/projections.ts
import type { PeriodMetrics } from './insights-store.js';

export interface Projection {
  channel: string;
  metric: string;
  twoWeek: number;
  fourWeek: number;
  disclaimer: string;
}

const METRIC_KEYS = ['spend', 'conversions', 'sessions', 'roas'] as const;

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: values[0] ?? 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function computeProjections(metrics: PeriodMetrics[]): Projection[] {
  if (metrics.length === 0) return [];

  const byChannel = new Map<string, PeriodMetrics[]>();
  for (const m of metrics) {
    const arr = byChannel.get(m.channel) ?? [];
    arr.push(m);
    byChannel.set(m.channel, arr);
  }

  const results: Projection[] = [];

  for (const [channel, channelMetrics] of byChannel) {
    const sorted = [...channelMetrics].sort((a, b) => a.period.localeCompare(b.period));

    for (const key of METRIC_KEYS) {
      const values = sorted.map((m) => m[key]).filter((v): v is number => v !== null);
      if (values.length < 3) continue;

      const { slope, intercept } = linearRegression(values);
      const n = values.length;

      results.push({
        channel,
        metric: key,
        twoWeek: Math.round((slope * (n + 1) + intercept) * 100) / 100,
        fourWeek: Math.round((slope * (n + 3) + intercept) * 100) / 100,
        disclaimer: 'This is an estimate based on historical trend. Actual results may vary due to seasonality, market conditions, or strategy changes.',
      });
    }
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/analytics/projections.test.ts`
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/projections.ts src/analytics/projections.test.ts
git commit -m "feat(analytics): add projections module with linear regression"
```

---

### Task 11: Update slash commands

**Files:**
- Modify: `commands/rsa.md`
- Modify: `commands/meta-ads.md`
- Modify: `commands/social.md`
- Modify: `commands/email.md`
- Modify: `commands/analytics.md`
- Modify: `commands/campaign.md`

- [ ] **Step 1: Update /rsa command**

Replace steps 8-10 with:

```markdown
8. **Export**: Save the complete RSA batch to `output/YYYY-MM-DD/rsa-{campaign-name}.md` using `saveOutput()` from `src/utils/exporter.ts`. Include headlines table, descriptions table, performance context, and recommendations.

9. **Confirm**: Show the file path and remind the user to copy headlines and descriptions into Google Ads dashboard manually.
```

- [ ] **Step 2: Update /meta-ads command**

Replace steps 10-11 with:

```markdown
10. **Export**: Save all approved ad variants to `output/YYYY-MM-DD/meta-ads-{segment-name}.md` using `saveOutput()` from `src/utils/exporter.ts`. Include copy variants, targeting recommendations, and performance context.

11. **Confirm**: Show the file path and remind the user to create ads manually in Meta Ads Manager.
```

- [ ] **Step 3: Update /social command**

Replace steps 6-8 with:

```markdown
6. **Stage**: Show each post formatted in terminal, organized by day.

7. **Export**: Save all posts to `output/YYYY-MM-DD/social-{theme-or-product}.md` using `saveOutput()` from `src/utils/exporter.ts`. Include copy, hashtags, scheduling suggestions, and image/video briefs.

8. **Remind**: User must manually schedule/publish posts on each platform (Meta Business Suite, TikTok, Pinterest, LinkedIn).
```

- [ ] **Step 4: Update /email command**

Replace step 7 with:

```markdown
7. **Export**: Save the email content in two formats using `saveOutput()` from `src/utils/exporter.ts`:
   - `output/YYYY-MM-DD/email-{campaign-name}.md` — copy text with subject line variants, preheader, and product recommendations
   - `output/YYYY-MM-DD/email-{campaign-name}.html` — compiled HTML from MJML, ready to paste into Shopify Email

   Show both file paths and remind the user to create the campaign in Shopify Email manually.
```

- [ ] **Step 5: Update /analytics command**

In the Process section, after step 3 (Analyze), add:

```markdown
3b. **Advanced analysis**: Run the following modules from `src/analytics/`:
   - `detectTrends()` from `trends.ts` — identify rising/falling/stable trends per metric
   - `detectAnomalies()` from `anomalies.ts` — flag metrics deviating >2 stddev from historical mean
   - `computeCorrelations()` from `correlations.ts` — find cross-channel metric correlations (requires 5+ periods)
   - `computeProjections()` from `projections.ts` — project key metrics 2 and 4 weeks forward

   Include results in the report under new sections: "Trends", "Anomalies", "Cross-Channel Correlations", "Projections (2w/4w)".
```

Replace step 6 with:

```markdown
6. **Export**: Always save the report to `output/YYYY-MM-DD/analytics-{type}.md` using `saveOutput()` from `src/utils/exporter.ts`, in addition to saving raw data to `InsightsStore` (dual save).
```

- [ ] **Step 6: Update /campaign command**

Replace steps 4-7 with:

```markdown
4. **Export**: Save the full campaign preview to `output/YYYY-MM-DD/campaign-{name}.md` using `saveOutput()` from `src/utils/exporter.ts`. Include all ad copy, targeting summary, budget, and character counts.

5. **Confirm**: Show the file path. The YAML file remains in `campaigns/` as a planning record. Remind the user to create the campaign manually on the target platform.
```

Remove the Rules section line about "PAUSED — never auto-publish" (no longer applicable since nothing is created).

- [ ] **Step 7: Commit**

```bash
git add commands/rsa.md commands/meta-ads.md commands/social.md commands/email.md commands/analytics.md commands/campaign.md
git commit -m "refactor(commands): remove API creation steps, add file export"
```

---

### Task 12: Clean up remaining test files and MSW helpers

**Files:**
- Modify: `src/campaigns/integration.test.ts`
- Modify: `src/__tests__/e2e/contract-api-shapes.test.ts`
- Modify: `src/__tests__/e2e/flow-analytics-weekly.test.ts`
- Modify: `src/__tests__/e2e/flow-meta-ads.test.ts`
- Modify: `src/__tests__/e2e/flow-rsa-generation.test.ts`
- Modify: `src/__tests__/e2e/flow-email-campaign.test.ts`
- Modify: `src/__tests__/e2e/flow-social-posts.test.ts`
- Modify: `src/__tests__/e2e/helpers/msw-server.ts` (if exists)
- Modify: `src/__tests__/e2e/helpers/fixtures.ts` (if exists)

**Important:** Read each file first before editing — the exact contents will determine what to remove. The instructions below describe the intent; use the actual file contents for precise edits.

- [ ] **Step 1: Fix integration.test.ts**

Remove imports/usage of `applyDecisions` and `ReviewDecision` from `src/campaigns/integration.test.ts`. Remove any test cases that call `applyDecisions()`.

- [ ] **Step 2: Fix contract-api-shapes.test.ts**

Remove contract tests for write method return shapes: `createAdDraft returns { adId }`, `schedulePost returns { postId }`, `createRsaAd returns { resourceName }`, `createEmailDraft returns EmailDraftResult shape`. Keep all read-method contract tests.

- [ ] **Step 3: Fix flow-analytics-weekly.test.ts**

Remove `mutateResources` from the `vi.mock('google-ads-api')` mock setup.

- [ ] **Step 4: Rewrite flow-meta-ads.test.ts**

This test currently ends by calling `createAdDraft()` and verifying the ad was created as PAUSED. Rewrite it to end by verifying that the generated ad copy is formatted correctly (using `formatAdTable` or similar) and can be exported via `saveOutput()`. Remove all imports of `createAdDraft`, `CreateAdInput`, `applyDecisions`, `ReviewDecision`. Remove MSW handlers for POST endpoints. Add a test that calls `saveOutput()` and verifies the file was created.

- [ ] **Step 5: Rewrite flow-rsa-generation.test.ts**

This test currently ends by calling `createRsaAd()`. Rewrite to end at formatting and export. Remove all imports of `createRsaAd`, `CreateRsaInput`, `googleAdsMutateMock`. Remove MSW mutate handlers. Add export verification.

- [ ] **Step 6: Rewrite flow-email-campaign.test.ts**

This test currently ends by calling `createEmailDraft()`. Rewrite to end at MJML compilation and export. Remove all imports of `createEmailDraft`, `EmailDraftInput`, `EmailDraftResult`. Add export verification for both `.md` and `.html` output files.

- [ ] **Step 7: Rewrite flow-social-posts.test.ts**

This test currently ends by calling `schedulePost()`. Rewrite to end at formatting and export. Remove all imports of `schedulePost`, `SchedulePostInput`. Remove MSW POST handlers. Add export verification.

- [ ] **Step 8: Clean up MSW helpers and fixtures**

Read `src/__tests__/e2e/helpers/msw-server.ts` and `src/__tests__/e2e/helpers/fixtures.ts`. Remove:
- Write-related fixtures: `metaCreateAdResponse`, `metaSchedulePostResponse`, `googleAdsMutateResponse`, `shopifyEmailSuccessResponse`, `shopifyEmailUserErrorResponse`
- Write-related MSW handler routes: `http.post('.../:accountId/ads', ...)`, `http.post('.../:pageId/feed', ...)`, the Shopify `emailMarketingCampaignCreate` mutation handler
- Any `googleAdsMutateMock` export

Keep all read-related fixtures and handlers.

- [ ] **Step 9: Run full test suite**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 10: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 11: Commit**

```bash
git add src/campaigns/integration.test.ts src/__tests__/e2e/
git commit -m "test: rewrite E2E flow tests for export-only mode, clean up MSW helpers"
```

---

### Task 13: Update .gitignore and CLAUDE.md

**Files:**
- Modify: `.gitignore`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add output/ to .gitignore**

Append to `.gitignore`:

```
output/
```

- [ ] **Step 2: Update CLAUDE.md**

Key changes:
- **First paragraph**: Change "automate ad creation, social media scheduling, email campaigns" to "analyze marketing performance, generate content proposals, and provide strategic recommendations. Content is generated as draft files — nothing is created or published on any platform."
- **Architecture section**: Remove mentions of write methods. Under API clients, note they are "read-only." Remove "write methods (create as PAUSED/DRAFT)."
- **Add `output/` section** to Supporting directories: `output/` — Generated proposals and reports by date (YYYY-MM-DD), gitignored
- **Key Patterns**: Remove "Staging flow" paragraph about approve/edit/skip/regenerate. Replace with: "Proposal flow: Generate → Format (terminal preview) → Export to output/YYYY-MM-DD/ as Markdown/HTML files."
- **Rules**: Remove "All ads are created as PAUSED, Meta posts as SCHEDULED, emails as DRAFT — never auto-publish." Replace with "All content is generated as local files in output/ — nothing is created or published on external platforms."

- [ ] **Step 3: Commit**

```bash
git add .gitignore CLAUDE.md
git commit -m "docs: update project description for analytics-only mode"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass. 0 failures.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Compiles successfully.

- [ ] **Step 4: Verify no write imports remain**

Search for any remaining imports of removed methods:

```bash
grep -r "createAdDraft\|schedulePost\|createRsaAd\|createEmailDraft\|applyDecisions\|ReviewDecision\|CreateAdInput\|SchedulePostInput\|CreateRsaInput\|EmailDraftInput\|EmailDraftResult" src/ commands/
```

Expected: 0 matches (except possibly in test fixture cleanup references that can be verified).

- [ ] **Step 5: Commit final state (if any remaining fixes)**

Only if step 4 found remaining references that need cleanup.
