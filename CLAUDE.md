# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Woodabu Marketing Automation Platform — a CLI-based system for Woodabu (handcrafted sustainable furniture, woodabu.com) that connects to Google Ads, Meta, Shopify, and GA4 APIs to automate ad creation, social media scheduling, email campaigns, and analytics reporting. Content is always generated as drafts/paused — nothing publishes without human approval.

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
├── apis/           # API clients (one per platform)
│   ├── google-ads.ts   # Google Ads gRPC client (google-ads-api)
│   ├── meta.ts         # Meta Graph/Marketing API (REST via fetchWithRetry)
│   ├── shopify.ts      # Shopify Admin GraphQL API (@shopify/shopify-api)
│   └── ga4.ts          # GA4 Data API (@google-analytics/data)
├── staging/        # Human review layer
│   ├── reviewer.ts     # Terminal formatting for ad/post/email review
│   └── html-preview.ts # MJML → HTML email compilation
├── analytics/      # Cross-platform aggregation
│   ├── aggregator.ts   # Combines data from all channels into WeeklyAggregate
│   └── insights-store.ts # JSON file-based storage for learnings (data/insights/)
└── utils/
    ├── auth.ts         # Config loading from env vars + Meta token expiry check
    ├── api-retry.ts    # fetchWithRetry with exponential backoff + 429 handling
    ├── validators.ts   # Google Ads character limit validation (headlines: 30, descriptions: 90)
    └── date-parser.ts  # Period parsing for analytics compare (aliases + YYYY-MM-DD:YYYY-MM-DD)
```

Supporting directories:
- `commands/` — Claude Code slash command definitions (`.md` files for `/rsa`, `/meta-ads`, `/social`, `/email`, `/analytics`)
- `skills/woodabu-brand.md` — Brand guidelines that inform all content generation
- `data/templates/` — MJML email templates
- `data/insights/` — Stored analytics insight reports (JSON, gitignored)
- `credentials/` — OAuth key files (gitignored)

## Key Patterns

**API clients** follow a consistent pattern: config interface → typed response interfaces → class with read methods (fetch data) and write methods (create as PAUSED/DRAFT). Meta and Google Ads use `fetchWithRetry` for automatic retry with exponential backoff.

**Staging flow**: Generate → Stage (terminal preview) → Review (approve/edit/skip/regenerate) → Confirm → Publish in safe state. See `reviewer.ts` for `applyDecisions()`.

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

## Rules

- All ads are created as PAUSED, Meta posts as SCHEDULED, emails as DRAFT — never auto-publish
- `data/insights/` JSON files must never store PII (no customer emails, names, addresses)
- Shopify customer data is read at runtime for segmentation but never cached locally
- MJML emails must use inline styles only (Shopify Email constraint)
- Validators count characters (not bytes) for Google Ads limits
