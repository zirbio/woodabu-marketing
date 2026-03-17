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

Types to remove: `AdDraftInput`, `AdDraftResult`, `PostInput`, `PostResult`, `EmailDraftInput`, `EmailDraftResult`, and any other interfaces exclusively used by write methods.

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
  format?: 'md' | 'html'
): ExportResult;
```

Behavior:
- Creates `output/YYYY-MM-DD/` directory if it doesn't exist
- Writes file with slugified name: `{type}-{name}.{format}`
- Returns the path for display in terminal
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
- Requires minimum 4-5 periods of data to be meaningful
- Output: `Correlation[]` with metric pair, coefficient, interpretation text
- Only surfaces correlations with |r| > 0.7

#### 5.4 `projections.ts` — Simple Forecasting
- Simple linear regression over historical insights store data
- Projects key metrics (spend, conversions, ROAS) at 2-week and 4-week horizons
- Output: `Projection[]` with metric, projected values, confidence note
- Includes disclaimer that projections are estimates based on historical trend

All modules are invoked from `/analytics` and output is saved to `output/YYYY-MM-DD/analytics-*.md`.

### 6. Campaign YAML — Retained As-Is

`campaigns/*.yaml` files, `src/campaigns/schema.ts`, `parser.ts`, `loader.ts` all remain unchanged. They serve as a planning/documentation tool. The `/campaign` command loads and validates YAML but exports a preview file instead of creating ads via API.

### 7. Tests

- **Delete:** Tests for removed write methods (`createAdDraft`, `schedulePost`, `createRsaAd`, `createEmailDraft`)
- **Adapt:** E2E flow tests that end in API calls → end in file export verification
- **Add:** Unit tests for `exporter.ts`, `trends.ts`, `anomalies.ts`, `correlations.ts`, `projections.ts`
- **Keep:** Security tests, resilience tests, character validation tests

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
| **Modify** | `commands/rsa.md`, `commands/meta-ads.md`, `commands/social.md`, `commands/email.md`, `commands/analytics.md` |
| **Modify** | `CLAUDE.md`, `.gitignore` |
| **Create** | `src/utils/exporter.ts` |
| **Create** | `src/analytics/trends.ts`, `src/analytics/anomalies.ts`, `src/analytics/correlations.ts`, `src/analytics/projections.ts` |
| **Modify** | Affected test files |
