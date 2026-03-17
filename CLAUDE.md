# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Woodabu Marketing Analytics & Proposals Platform — a CLI-based system for Woodabu (handcrafted sustainable furniture, woodabu.com) that connects to Google Ads, Meta, Shopify, and GA4 APIs to analyze marketing performance, generate content proposals, and provide strategic recommendations. Content is generated as draft files in `output/` — nothing is created or published on any platform.

## Commands

```bash
npm run test              # Run all tests (vitest)
npm run test -- src/apis/meta.test.ts   # Run a single test file
npm run test -- -t "description"        # Run tests matching a pattern
npm run typecheck         # tsc --noEmit — must pass with 0 errors
npm run build             # Compile TypeScript to dist/
```

No linter/formatter is configured yet (no eslint/prettier in the project).

## Architecture

```
src/
├── apis/           # API clients (one per platform, read-only)
│   ├── google-ads.ts   # Google Ads gRPC client — read campaign performance
│   ├── meta.ts         # Meta Graph API — read ad/page insights
│   ├── shopify.ts      # Shopify Admin GraphQL — read products, orders, segments
│   └── ga4.ts          # GA4 Data API — read traffic by channel
├── staging/        # Formatting layer
│   ├── reviewer.ts     # Terminal formatting for ad/post/email preview
│   └── html-preview.ts # MJML → HTML email compilation
├── analytics/      # Cross-platform analysis
│   ├── aggregator.ts   # Combines data from all channels into WeeklyAggregate
│   ├── insights-store.ts # JSON file-based storage for learnings (data/insights/)
│   ├── trends.ts       # Trend detection via simple moving average
│   ├── anomalies.ts    # Anomaly detection via standard deviation
│   ├── correlations.ts # Cross-channel Pearson correlation
│   └── projections.ts  # Simple linear regression forecasting
└── utils/
    ├── auth.ts         # Config loading from env vars + Meta token expiry check
    ├── api-retry.ts    # fetchWithRetry with exponential backoff + 429 handling
    ├── validators.ts   # Google Ads character limit validation (headlines: 30, descriptions: 90)
    ├── date-parser.ts  # Period parsing for analytics compare (aliases + YYYY-MM-DD:YYYY-MM-DD)
    └── exporter.ts     # File export to output/YYYY-MM-DD/ (Markdown + HTML)
```

Supporting directories:
- `commands/` — Claude Code slash command definitions (`.md` files for `/rsa`, `/meta-ads`, `/social`, `/email`, `/analytics`, `/campaign`)
- `skills/woodabu-brand.md` — Brand guidelines that inform all content generation (enriched with real Shopify data: 59 active products, 30+ collections, best sellers, price ranges, customer segments)
- `scripts/` — Utility scripts (`test-shopify.mjs` for connection test, `extract-shopify-data.mjs` for comprehensive data extraction)
- `data/templates/` — MJML email templates
- `data/insights/` — Stored analytics insight reports (JSON, gitignored)
- `output/` — Generated proposals and reports by date (YYYY-MM-DD), gitignored
- `credentials/` — OAuth key files (gitignored)

### MCP Servers (Read-Only)

Two external MCP servers are configured in `.claude/settings.local.json` (gitignored) for ad-hoc analytics queries:

- **meta-ads-mcp** (pipeboard-co): Query Meta campaign insights, breakdowns by age/gender/placement. Read-only.
- **google-ads-mcp** (Google official): Execute GAQL queries for Google Ads diagnostics. Read-only.

To set up: copy token values from `.env` into `.claude/settings.local.json`. See `.env.example` for mapping.

### Campaign Definitions

YAML files in `campaigns/` define ad campaigns declaratively for planning purposes. Schema validated at load time. Flow: `campaigns/*.yaml` → `src/campaigns/parser.ts` → preview → export to `output/`.

## Key Patterns

**API clients** follow a consistent pattern: config interface → typed response interfaces → class with read-only methods (fetch data). Meta and Google Ads use `fetchWithRetry` for automatic retry with exponential backoff.

**Proposal flow**: Generate → Format (terminal preview) → Export to `output/YYYY-MM-DD/` as Markdown/HTML files. User copies content to each platform manually.

**Insights store** uses atomic file writes (write to `.tmp` → rename) and retains max 12 reports. Content generation modules read the 4 most recent files for context.

**Character counting** uses spread operator (`[...text].length`) to correctly count Unicode characters including accented Spanish characters.

## Auth & Env Vars

All credentials in `.env` (see `.env.example` for required vars). GA4 uses a service account JSON key file at `credentials/ga4-service-account.json`. Meta System User Token has a 60-day lifetime — `checkMetaTokenExpiry()` in `auth.ts` warns when <7 days remain.

## API Versions (pinned)

- Meta Graph API: `v19.0`
- Shopify Admin API: `2025-01`
- Google Ads API: v17 (via `google-ads-api` npm package)
- GA4 Data API: v1beta (via `@google-analytics/data`)

## Testing

Tests live alongside source files (`*.test.ts`). Uses Vitest with `msw` for HTTP mocking. Tests are colocated: `src/apis/meta.ts` → `src/apis/meta.test.ts`.

## Shopify Store Reference

The Shopify API connection is live (`woodabu2.myshopify.com`). Key metrics:
- **59 active products** across cabeceros, mesas, bancos, espejos, cuadros, percheros, consolas, puertas, sillas, tablas de cocina
- **17,997 customers**, **3,251+ orders**, **AOV ~€833**
- **Best sellers**: Cabecero Tulum, Mesa Extensible Forest, Cabecero Belle Ville, Espejo Pure Oceans, Mesa extensible Butterfly
- **3 special collections**: Pure Oceans (ghost nets), Zero Waste (reclaimed wood), MARKET (ex-display)
- **Named design collections**: Belle Ville, Whale Diver, Pampa, Natura, Chestnut
- Run `node scripts/extract-shopify-data.mjs` for a full JSON data dump

## Rules

- All content is generated as local files in `output/` — nothing is created or published on external platforms
- `data/insights/` JSON files must never store PII (no customer emails, names, addresses)
- Shopify customer data is read at runtime for segmentation but never cached locally
- MJML emails must use inline styles only (Shopify Email constraint)
- Validators count characters (not bytes) for Google Ads limits
