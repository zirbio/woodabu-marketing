# Woodabu Marketing: Analytics & Proposals Only

**Date:** 2026-03-17
**Approach:** Surgical — minimal changes to existing architecture

## Goal

Transform the Woodabu Marketing platform from a campaign execution tool into a pure analytics, insights, and content proposal system. The platform will never create, schedule, or publish anything on external platforms. All campaigns are created manually by the user on each platform's web interface.

## What Changes

### 1. Remove API Write Methods

Remove these methods and their associated types/interfaces entirely (not commented, not flagged — deleted):

| File | Methods Removed | What Remains |
|---|---|---|
| `src/apis/meta.ts` | `createAdDraft()`, `schedulePost()` | `getAdInsights()`, `getPageInsights()` |
| `src/apis/google-ads.ts` | `createRsaAd()` | `getCampaignPerformance()`, `rankPerformers()` |
| `src/apis/shopify.ts` | `createEmailDraft()` | `getProducts()`, `getRecentOrders()`, `getCustomerSegments()` |
| `src/apis/ga4.ts` | Nothing — already read-only | All methods remain |

Types to remove: `CreateAdInput`, `SchedulePostInput`, `CreateRsaInput`, `EmailDraftInput`, `EmailDraftResult`, and any other interfaces/types exclusively used by write methods. Note: some write methods return inline types (e.g., `Promise<{ adId: string }>`) — these are removed with the methods themselves.

**`StagedItem` is retained** — it is used by `src/campaigns/loader.ts` (which remains unchanged per Section 6). `ReviewDecision` is removed since it is only used by the deleted `applyDecisions()`.

`InsightsStore.save()` is retained — it writes locally, not to external platforms.

### 2. Modify Slash Commands

All commands stop at "show + save" instead of "create on platform":

| Command | New Flow |
|---|---|
| `/rsa` | Analyze current Google Ads performance → generate 15 headlines + 4 descriptions → show in terminal → save to `output/YYYY-MM-DD/rsa-{name}.md` |
| `/meta-ads` | Analyze Meta insights → generate ad copy variants → show in terminal → save to `output/YYYY-MM-DD/meta-ads-{name}.md` |
| `/social` | Generate social post copy → show in terminal → save to `output/YYYY-MM-DD/social-{name}.md` |
| `/email` | Generate email copy + compile MJML to HTML → show preview → save `.md` (copy) + `.html` (compiled) to `output/YYYY-MM-DD/email-{name}.*` |
| `/analytics` | Query all APIs → aggregate → run advanced analysis → show in terminal → save to `output/YYYY-MM-DD/analytics-{type}.md` |
| `/campaign` | Load YAML → validate → show full preview → save to `output/YYYY-MM-DD/campaign-{name}.md` |

### 3. Simplify Staging/Reviewer

`src/staging/reviewer.ts`:
- `applyDecisions()` is removed — there are no decisions to apply since nothing executes
- `formatAdTable()`, `formatPostPreview()`, `formatEmailSummary()` remain as pure formatters
- The `ReviewDecision` type and its actions (`approve`, `edit`, `skip`, `regenerate`) are removed
- All test files that import `applyDecisions` or `ReviewDecision` must be updated: `src/staging/reviewer.test.ts`, `src/campaigns/integration.test.ts`, and E2E flow tests

`src/staging/html-preview.ts`: No changes — still compiles MJML to HTML for the exported file.

### 4. New: File Exporter

New module `src/utils/exporter.ts`:

```typescript
interface ExportResult {
  filePath: string;
  type: string;
  createdAt: string;
}

function saveOutput(
  type: 'rsa' | 'meta-ads' | 'social' | 'email' | 'campaign' | 'analytics',
  name: string,
  content: string,
  format: 'md' | 'html' = 'md'
): ExportResult;
```

Behavior:
- Creates `output/YYYY-MM-DD/` directory if it doesn't exist
- Writes file with slugified name: `{type}-{name}.{format}`
- Slugification: lowercase, replace spaces/underscores with hyphens, strip accents (ñ→n, á→a), remove non-alphanumeric characters except hyphens
- Returns the path for display in terminal
- Default format is `'md'`
- On filesystem errors (permission denied, disk full): throws with descriptive error message — do not silently fail
- For `/email`, the command calls `saveOutput` twice: once with `format='md'` (copy text) and once with `format='html'` (compiled MJML)
- `output/` is added to `.gitignore`

Output file structure:
```
output/
└── 2026-03-17/
    ├── rsa-spring-comedor.md
    ├── meta-ads-pure-oceans.md
    ├── social-instagram-tulum.md
    ├── email-welcome-series.md
    ├── email-welcome-series.html
    ├── campaign-spring-comedor.md
    └── analytics-weekly.md
```

Each Markdown file includes:
- **Header** — date, target platform, related product/collection
- **Creative content** — formatted and ready to copy
- **Analytical context** — data that motivated the proposal (current ROAS, top product, etc.)
- **Strategic recommendation** — why this content is proposed and expected outcome

### 5. New: Advanced Analytics Modules

Four new modules in `src/analytics/`, all implemented in pure TypeScript with no external dependencies:

**Data source:** All four modules consume numeric time-series vectors. The current `InsightReport` interface stores channel-level aggregates but not raw per-period metric values. The `InsightReport` interface must be extended with a `metrics` field:

```typescript
interface PeriodMetrics {
  period: string;        // YYYY-MM-DD (start of period)
  channel: string;       // 'meta' | 'google_ads' | 'ga4' | 'shopify'
  spend: number | null;       // null for channels without spend (ga4, shopify)
  conversions: number | null; // null if not applicable
  sessions: number | null;    // null for channels without sessions (meta, shopify)
  roas: number | null;        // null for channels without spend
}

// Added to InsightReport:
interface InsightReport {
  // ... existing fields ...
  metrics: PeriodMetrics[];
}
```

Analytics modules must skip `null` values when computing statistics. For correlations and trends, only non-null metric pairs are considered. Zero-variance vectors (all values identical) must be skipped by the correlation module to avoid division by zero.

This is a prerequisite — `InsightsStore.save()` must start storing these raw metrics alongside existing data, and `/analytics` must populate them from the API responses before saving.

#### 5.1 `trends.ts` — Trend Detection
- Calculates direction (rising/falling/stable) per metric using simple moving average
- Feeds from `InsightsStore` historical data (up to 12 periods)
- Output: `TrendResult[]` with metric name, direction, magnitude, period count

#### 5.2 `anomalies.ts` — Anomaly Detection
- Flags metrics deviating more than 2 standard deviations from historical mean
- Input: current period data + historical data from insights store
- Output: `Anomaly[]` with metric, value, mean, stddev, severity (warning/critical)

#### 5.3 `correlations.ts` — Cross-Channel Correlation
- Pearson correlation coefficient between metric pairs across channels
- Example: Meta spend vs GA4 organic sessions
- Runtime guard: requires minimum 5 periods of data. If fewer than 5 are available, returns empty array (no correlations computed)
- Output: `Correlation[]` with metric pair, coefficient, interpretation text
- Only surfaces correlations with |r| > 0.7

#### 5.4 `projections.ts` — Simple Forecasting
- Simple linear regression over historical insights store data
- Projects key metrics (spend, conversions, ROAS) at 2-week and 4-week horizons
- Output: `Projection[]` with metric, projected values, confidence note
- Includes disclaimer that projections are estimates based on historical trend

All modules are invoked from `/analytics` and output is saved to `output/YYYY-MM-DD/analytics-*.md`.

**Dual save:** `/analytics` continues saving to `InsightsStore` (`data/insights/`) for historical data accumulation AND exports the human-readable report to `output/YYYY-MM-DD/`. The insights store is the data backend; the output files are the human-facing reports.

### 6. Campaign YAML — Retained As-Is

`campaigns/*.yaml` files, `src/campaigns/schema.ts`, `parser.ts`, `loader.ts` all remain unchanged. They serve as a planning/documentation tool. The `/campaign` command loads and validates YAML but exports a preview file instead of creating ads via API.

### 7. Tests

- **Delete write-method tests in:**
  - `src/apis/meta.test.ts` — remove tests for `createAdDraft`, `schedulePost`
  - `src/apis/google-ads.test.ts` — remove tests for `createRsaAd` (if present, may be named differently)
  - `src/apis/shopify.test.ts` — remove tests for `createEmailDraft`
  - `src/__tests__/e2e/contract-api-shapes.test.ts` — remove contract tests for write method return shapes (`createAdDraft returns { adId }`, `schedulePost returns { postId }`, `createRsaAd returns { resourceName }`, `createEmailDraft returns EmailDraftResult`)
- **Delete/update reviewer tests:**
  - `src/staging/reviewer.test.ts` — remove all `applyDecisions` test cases
  - `src/campaigns/integration.test.ts` — remove imports/usage of `applyDecisions` and `ReviewDecision`
- **Adapt:** E2E flow tests (`flow-meta-ads.test.ts`, `flow-rsa-generation.test.ts`, `flow-email-campaign.test.ts`, `flow-social-posts.test.ts`) — end in file export verification instead of API calls
- **Clean up test helpers:**
  - Remove write-related MSW mocks (e.g., `googleAdsMutateMock`) and fixtures (e.g., `metaCreateAdResponse`, `metaSchedulePostResponse`, `googleAdsMutateResponse`, `shopifyEmailSuccessResponse`, `shopifyEmailUserErrorResponse`) from `helpers/msw-server.js` and `helpers/fixtures.js`
  - Remove MSW default handler routes for write endpoints: `http.post('.../:accountId/ads', ...)`, `http.post('.../:pageId/feed', ...)`, and the Shopify `emailMarketingCampaignCreate` mutation handler from the `defaultHandlers` array in `helpers/msw-server.ts`
- **Clean up dead mocks in other tests:**
  - `flow-analytics-weekly.test.ts` — remove `mutateResources` mock from `vi.mock('google-ads-api')` setup
- **Add:** Unit tests for `exporter.ts`, `trends.ts`, `anomalies.ts`, `correlations.ts`, `projections.ts`
- **Keep:** Security tests, resilience tests, character validation tests, snapshot output tests (`snapshot-outputs.test.ts`)

### 8. Documentation

- **CLAUDE.md:** Update project description, architecture section, remove references to PAUSED/DRAFT/SCHEDULED creation, add `output/` documentation
- **`.gitignore`:** Add `output/`
- **`skills/woodabu-brand.md`:** No changes

## What Does NOT Change

- All API read methods (Meta insights, Google Ads performance, Shopify products/orders/segments, GA4 traffic)
- `src/utils/auth.ts` — config loading, Meta token expiry check
- `src/utils/api-retry.ts` — fetchWithRetry (still used for read calls)
- `src/utils/validators.ts` — character limit validation (still useful for generating valid copy)
- `src/utils/date-parser.ts` — period parsing for analytics
- `src/staging/html-preview.ts` — MJML compilation (used for email HTML export)
- `src/analytics/insights-store.ts` — local JSON storage for analytics history
- `src/campaigns/` — YAML schema, parser, loader (used for planning)
- `skills/woodabu-brand.md` — brand guidelines
- All dependencies in `package.json`

## File Change Summary

| Action | Files |
|---|---|
| **Modify** | `src/apis/meta.ts`, `src/apis/google-ads.ts`, `src/apis/shopify.ts` |
| **Modify** | `src/staging/reviewer.ts` |
| **Modify** | `commands/rsa.md`, `commands/meta-ads.md`, `commands/social.md`, `commands/email.md`, `commands/analytics.md`, `commands/campaign.md` |
| **Modify** | `CLAUDE.md`, `.gitignore` |
| **Create** | `src/utils/exporter.ts` |
| **Create** | `src/analytics/trends.ts`, `src/analytics/anomalies.ts`, `src/analytics/correlations.ts`, `src/analytics/projections.ts` |
| **Modify** | `src/analytics/insights-store.ts` (extend `InsightReport` with raw metrics) |
| **Modify/Delete** | `src/apis/meta.test.ts`, `src/apis/google-ads.test.ts`, `src/apis/shopify.test.ts`, `src/staging/reviewer.test.ts`, `src/campaigns/integration.test.ts`, `src/__tests__/e2e/contract-api-shapes.test.ts`, `src/__tests__/e2e/flow-*.test.ts`, test helpers/fixtures |
| **Create** | Tests for `exporter.ts`, `trends.ts`, `anomalies.ts`, `correlations.ts`, `projections.ts` |
