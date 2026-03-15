# Woodabu Marketing Automation Platform — Design Spec

**Date:** 2026-03-15
**Status:** Reviewed
**Author:** Silvio Requena (for Woodabu)

---

## 1. Context & Problem

Woodabu (woodabu.com) is a handcrafted sustainable furniture company based in Alcobendas, Madrid. They sell solid wood furniture (oak, chestnut) with collections like "Zero Waste" and "Pure Oceans." Price range: €279–€1,349+. Shopify-based store, 300+ reviews (4.9/5 on Google).

**Current situation:**
- One person manages all marketing across 5 channels: Google Ads, Meta Ads, Shopify Email, social media (Instagram/Facebook), and SEO/content
- Active on Google Ads, Meta Ads, Shopify (with Shopify Email), and GA4
- Main pain points: creating ad copy is slow, maintaining consistent social media content is hard, email campaigns take too much time, and there's no systematic way to analyze what's working

**Goal:** Build an automated marketing platform using Claude Code that connects to platform APIs, dramatically reducing time spent on repetitive tasks while keeping a human as the final reviewer before anything goes live.

**Inspiration:** [How Anthropic Uses Claude for Marketing](https://claude.com/blog/how-anthropic-uses-claude-marketing) — adapted from Skills + slash commands to a fully API-integrated system.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code CLI                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Ad Engine│ │  Social  │ │  Email   │ │ Analytics  │ │
│  │          │ │  Engine  │ │  Engine  │ │   Engine   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │             │            │              │        │
│  ┌────┴─────────────┴────────────┴──────────────┴──┐    │
│  │              Brand Skills Layer                   │    │
│  │  (woodabu-brand.md, tone, values, examples)      │    │
│  └────┬─────────────┬────────────┬──────────────┬──┘    │
│       │             │            │              │        │
│  ┌────┴──┐    ┌─────┴──┐   ┌────┴───┐   ┌─────┴─────┐ │
│  │Staging│    │Staging │   │Staging │   │  Report   │ │
│  │Review │    │Review  │   │Preview │   │  Output   │ │
│  └────┬──┘    └────┬───┘   └────┬───┘   └───────────┘ │
│       │            │            │                       │
│  ── HUMAN APPROVAL GATE ────────────────────────────── │
│       │            │            │                       │
└───────┼────────────┼────────────┼───────────────────────┘
        │            │            │
   ┌────┴──┐   ┌────┴───┐  ┌────┴────┐
   │Google │   │ Meta   │  │ Shopify │
   │Ads API│   │Graph   │  │Admin API│
   │       │   │API     │  │         │
   └───────┘   └────────┘  └─────────┘
        │            │           │
   Ads created   Ads as     Posts       Email draft
   as PAUSED    DRAFT    scheduled    in Shopify
```

### Core Principles

1. **Human-in-the-loop always**: Nothing is published without explicit approval. Ads are created as PAUSED, posts as SCHEDULED (cancellable), emails as DRAFTS.
2. **Data-informed generation**: All content generation is informed by real performance data from the APIs.
3. **Brand consistency**: A shared Brand Skills layer ensures tone, values, and messaging remain consistent across all channels.
4. **Feedback loop**: Analytics Engine insights feed back into content generation modules for continuous improvement.

---

## 3. Module: Ad Engine

### 3.1 Google Ads

**Read (automatic):**
- Google Ads API reads active campaign performance: CTR, CPC, conversions, ROAS
- Extracts best and worst performing ads as context for generation

**Generate — `/rsa` command:**
- Generates Responsive Search Ad batches:
  - 15 headlines (max 30 chars) + 4 descriptions (max 90 chars)
  - Informed by: performance data, Shopify product catalog, Woodabu brand guide
- Validates character limits before presenting

**Staging:**
- Displays generated ads in a formatted terminal table
- Options: approve all, edit individual lines, regenerate specific items

**Publish:**
- Creates ads via Google Ads API in `PAUSED` state
- User activates manually from Google Ads dashboard

### 3.2 Meta Ads

**Generate — `/meta-ads` command:**
- Generates ad sets with: primary text, headline, description
- Creates variants per audience segment:
  - Eco-conscious consumers
  - Design lovers
  - Gift shoppers
  - Home renovation / new home buyers
- Informed by Meta Ads performance data

**Staging:**
- Same terminal review as Google Ads

**Publish:**
- Creates ads as drafts in Meta Ads Manager via Marketing API

*API auth and scopes: see consolidated table in section 8.3.*

---

## 4. Module: Social Engine

**Read (automatic):**
- Meta Graph API: engagement metrics, reach, best posting times from recent posts
- Shopify API: new products, active collections, featured items

**Generate — `/social` command with subcommands:**

| Command | Output |
|---------|--------|
| `/social weekly` | Weekly calendar of 4-5 posts with copy, hashtags, and optimal timing |
| `/social product [name]` | Specific post for a product |
| `/social campaign [theme]` | Series of posts for a campaign (e.g., "Zero Waste Week") |

**Each post includes:**
- Copy in Woodabu's tone (craftsmanship, sustainability, warmth)
- Relevant hashtags (mix of broad + niche)
- Suggested publish time based on engagement data
- Image suggestion: references a product photo from the Shopify catalog by URL. The user is responsible for attaching/uploading the image manually in Meta Business Suite before the post goes live. No automatic image upload via API.

**Staging:**
- Formatted preview in terminal per post
- Individual approve/edit/discard per post

**Publish:**
- Approved posts scheduled via Meta Graph API
- Published as "scheduled" — still cancellable from Meta Business Suite

*API auth and scopes: see consolidated table in section 8.3.*

---

## 5. Module: Email Engine

**Read (automatic):**
- Shopify Admin API: customer segments, purchase history, top-selling products, abandoned carts
- Past campaign metrics: open rate, click rate, conversions

**Generate — `/email` command with subcommands:**

| Command | Output |
|---------|--------|
| `/email campaign [topic]` | Full campaign: subject line, preheader, HTML body |
| `/email flow [type]` | Automated flows: welcome, abandoned cart, post-purchase, reactivation |
| `/email newsletter` | Weekly/monthly newsletter with news, featured products, sustainability content |

**Each email includes:**
- 3 subject line variants for A/B testing
- Body structure: hook → content → CTA
- Personalization by segment (new vs returning, product category preferences)
- Recommended products based on Shopify data

**Staging:**
- Generates local HTML file for browser preview
- Terminal summary: subject lines, target segment, included products

**Publish:**
- Uses Shopify GraphQL Admin API `emailMarketingCampaignCreate` mutation to create a draft campaign
- **Fallback:** If the GraphQL mutation is unavailable or limited, the system generates a complete HTML file locally and opens it in the browser — the user copy-pastes into Shopify Email manually
- User reviews once more in Shopify and sends manually

**Email HTML constraints:**
- Generated using MJML (compiles to responsive HTML compatible with Shopify Email)
- Must respect Shopify Email's supported HTML subset (no JavaScript, limited CSS, inline styles only)
- Templates stored in `data/templates/` as `.mjml` files

*API auth and scopes: see consolidated table in section 8.3.*

---

## 6. Module: Analytics Engine

**Data sources:**
- GA4 Data API: traffic, conversions, user paths, channel attribution
- Google Ads API: campaign performance, keywords, cost per conversion
- Meta Marketing API: ad and organic post performance, audiences
- Shopify Admin API: sales, top products, AOV, conversion rate, LTV by segment

**Commands:**

| Command | Output |
|---------|--------|
| `/analytics weekly` | Executive weekly summary with top/bottom performers and actionable recommendations |
| `/analytics channel [channel]` | Deep dive into a specific channel |
| `/analytics product [name]` | Marketing performance of a specific product across all channels |
| `/analytics compare [period1] vs [period2]` | Temporal comparison. Format: `YYYY-MM-DD:YYYY-MM-DD` (e.g., `2026-02-01:2026-02-28 vs 2026-01-01:2026-01-31`) or aliases: `last-week`, `last-month`, `last-quarter`, `last-year` |

**Weekly summary structure:**
1. Which channel drove the most sales and at what cost
2. Top 3 best performing campaigns/ads/posts and why
3. Top 3 worst performing with hypotheses for underperformance
4. Concrete recommendations (e.g., "double budget on X campaign", "pause Y ad group", "this subject line had 2x open rate — replicate the pattern")

**Output formats:**
- Terminal summary with key data and actionable recommendations
- Optional Markdown/HTML file with basic charts for archiving or sharing

**Feedback loop:**
- Analytics insights are stored and used as context by other modules
- When Ad Engine, Social Engine, or Email Engine generate content, they incorporate learnings (e.g., "posts about the crafting process get 3x more engagement than product-only posts")

*API auth and scopes: see consolidated table in section 8.3.*

---

## 7. Brand Skills Layer

A shared configuration that all modules reference for consistency.

**File: `skills/woodabu-brand.md`**

Contents:
- **Brand voice**: warm, authentic, passionate about wood and sustainability. Not corporate or salesy.
- **Key values**: handcrafted, 100% solid wood, sustainable, lifetime warranty, made in Spain
- **Target personas**: eco-conscious homeowners, design lovers, quality-over-quantity buyers
- **Words to use (ES)**: artesanal, madera maciza, sostenible, hecho a mano, exclusivo, duradero
- **Words to use (EN)**: handcrafted, solid wood, sustainable, handmade, exclusive, lasting
- **Words to avoid (ES)**: barato, descuento, producción en masa, artificial, plástico
- **Words to avoid (EN)**: cheap, discount, mass-produced, artificial, plastic
- **Collections**: Zero Waste, Pure Oceans — each with its own messaging angle
- **Example copy**: curated examples of good posts, ads, and emails for reference
- **Seasonal calendar**: key dates (Black Friday, Christmas, San Valentín, spring/summer outdoor season)

---

## 8. Technical Implementation

### 8.1 Project Structure

```
woodabu/marketing/
├── skills/
│   └── woodabu-brand.md          # Brand guidelines for Claude
├── commands/
│   ├── rsa.md                    # Google Ads RSA generation
│   ├── meta-ads.md               # Meta Ads generation
│   ├── social.md                 # Social media content
│   ├── email.md                  # Email campaigns
│   └── analytics.md              # Analytics & reporting
├── src/
│   ├── apis/
│   │   ├── google-ads.ts         # Google Ads API client
│   │   ├── meta.ts               # Meta Graph/Marketing API client
│   │   ├── shopify.ts            # Shopify Admin API client
│   │   └── ga4.ts                # GA4 Data API client
│   ├── staging/
│   │   ├── reviewer.ts           # Terminal review/approval UI
│   │   └── html-preview.ts       # HTML preview generator for emails
│   ├── analytics/
│   │   ├── aggregator.ts         # Cross-platform data aggregation
│   │   └── insights-store.ts     # Stores learnings for feedback loop
│   └── utils/
│       ├── auth.ts               # OAuth token management
│       └── validators.ts         # Character limits, format validation
├── data/
│   ├── insights/                 # Stored analytics insights (JSON)
│   └── templates/                # Email HTML templates
├── credentials/                    # OAuth key files (gitignored)
│   └── ga4-service-account.json    # GA4 service account key
├── .env                            # API keys and tokens (gitignored)
├── .env.example                    # Template with all required env vars (no values)
├── .gitignore                      # See below
├── package.json
└── tsconfig.json
```

**`.gitignore` contents:**
```
.env
credentials/
data/insights/
*.tmp
node_modules/
```

### 8.2 Tech Stack & Runtime Model

The system is a **standalone Node.js + TypeScript CLI application** that gets invoked from Claude Code via slash commands. Each command (e.g., `/rsa`) triggers a TypeScript script that handles API calls, data processing, and output formatting. Claude Code provides the AI layer (content generation, analysis) while the TypeScript code handles API integration and the staging UI.

- **Runtime:** Node.js + TypeScript
- **Google Ads:** `google-ads-api` npm package (official gRPC client — REST interface is impractical)
- **Meta APIs:** REST via native fetch (well-documented REST endpoints)
- **Shopify:** `@shopify/shopify-api` for Admin API (GraphQL)
- **GA4:** `@google-analytics/data` for GA4 Data API
- **Auth:** OAuth 2.0 with in-memory token cache + automatic refresh. Refresh tokens stored in `.env`, access tokens refreshed at runtime (never written to disk)
- **Templating:** MJML for responsive email HTML (compiles to Shopify-compatible HTML)
- **Data storage:** Local JSON files for insights and cached API responses

### 8.3 Authentication Flow (Canonical)

All refresh tokens / long-lived tokens stored in `.env` (gitignored). Access tokens refreshed in-memory at runtime.

| Service | Auth Method | Token Lifetime | Scopes | Setup |
|---------|-------------|----------------|--------|-------|
| Google Ads | OAuth 2.0 + Developer Token | Access: 1h (auto-refresh) | `ads.readonly`, `adwords` | Google Cloud Console project, Ads API access |
| Meta Marketing API | System User Token | 60 days (auto-warning at 7 days before expiry; every command checks token expiry and warns if <7 days remaining) | `ads_read`, `ads_management` | Meta Business App |
| Meta Graph API (Pages) | Page Access Token (long-lived, derived from System User) | Never expires | `pages_read_engagement`, `pages_manage_posts`, `pages_read_user_content`, `read_insights` | Derived from System User Token via API call |
| GA4 | Service Account (JSON key file at `credentials/ga4-service-account.json`, gitignored) | Access: 1h (auto-refresh) | `analytics.readonly` | Google Cloud Console |
| Shopify | Custom App Access Token | Never expires | `read_products`, `read_orders`, `read_customers`, `write_marketing_events`, `read_marketing_events` | Shopify Admin > Apps > Develop apps |

**Note on Meta tokens:** A single System User Token covers both the Marketing API (ads) and the Graph API (pages/posts). The Page Access Token is derived from it and does not require a separate auth flow.

---

## 9. Human-in-the-Loop Design

Every module follows the same approval pattern:

```
1. GENERATE  →  Claude creates content based on data + brand skills
2. STAGE     →  Content displayed in terminal (or HTML preview for emails)
3. REVIEW    →  User sees each item and chooses:
                 [a] Approve  [e] Edit  [r] Regenerate  [s] Skip
4. CONFIRM   →  Summary of approved items shown, final "Send? [y/n]"
5. PUBLISH   →  Only approved items sent to APIs in safe state:
                 - Google Ads: PAUSED
                 - Meta Ads: DRAFT
                 - Meta Posts: SCHEDULED
                 - Shopify Email: DRAFT
```

Nothing goes live without at least TWO approval points: the staging review + the platform's own draft/paused state.

---

## 10. Success Metrics

| Metric | Current (estimated) | Target |
|--------|-------------------|--------|
| Time to create ad batch | ~30 min | < 5 min |
| Social posts per week | 2-3 (inconsistent) | 5+ (consistent) |
| Time per email campaign | ~2 hours | < 20 min |
| Analytics review | Ad hoc, manual | Weekly automated summary |
| Brand consistency | Variable across channels | Unified via Brand Skills |

---

## 11. Implementation Order

1. **Phase 1 — Foundation:** Project setup, API auth, Brand Skills file
2. **Phase 2 — Ad Engine:** Google Ads RSA + Meta Ads generation with staging
3. **Phase 3 — Social Engine:** Post generation and scheduling
4. **Phase 4 — Email Engine:** Campaign and flow generation
5. **Phase 5 — Analytics Engine:** Cross-platform reporting and feedback loop

Each phase is independently useful — the system delivers value from Phase 2 onward.

---

## 12. Error Handling & Failure Modes

### API Failures

| Scenario | Behavior |
|----------|----------|
| API unreachable / network error | Retry once after 3 seconds. If still failing, log the error and continue in **offline mode**: generate content without performance data context, warn the user that recommendations are not data-informed |
| Rate limit hit (429) | Respect `Retry-After` header. If no header, exponential backoff (1s, 2s, 4s, max 3 retries). Warn user if quota exhausted |
| Partial publish failure (e.g., 3 of 5 ads created, #4 fails) | Continue with remaining items. Report: "3/5 created successfully, #4 failed: [error], #5 skipped. Retry failed items? [y/n]" |
| OAuth token expired mid-review | Auto-refresh transparently using stored refresh token. If refresh fails, prompt user to re-authenticate |
| Shopify Email GraphQL mutation unavailable | Fall back to local HTML generation + browser preview |

### Data Edge Cases

| Scenario | Behavior |
|----------|----------|
| New product with zero sales data | Generate content based on product description and brand guidelines only, without performance context. Flag to user: "No historical data for this product" |
| No past email campaigns | Skip A/B testing recommendations. Use brand guidelines and industry benchmarks for subject line suggestions |
| Empty analytics period | Return "No data available for this period" instead of empty charts |
| Spanish characters in ad copy | Validator counts characters (not bytes). Google Ads headline limit is 30 characters regardless of encoding. Validator warns if close to limit with accented characters |

### API Version Pinning

| API | Version | Deprecation Policy |
|-----|---------|-------------------|
| Meta Graph API | v19.0 (verify at Phase 1 start) | ~2 year lifecycle, check quarterly |
| Shopify Admin API | 2025-01 (verify at Phase 1 start) | ~1 year support per version |
| Google Ads API | v17 (verify at Phase 1 start) | ~1 year per major version |
| GA4 Data API | v1beta (verify at Phase 1 start) | Stable, infrequent breaking changes |

**Phase 1 task:** Before writing any API client code, verify current stable versions for all APIs and update this table.

### GDPR Compliance

- `data/insights/` JSON files must **never** store PII (no customer emails, names, addresses)
- Analytics data is aggregated only (segment-level, never individual-level)
- Shopify customer data is read at runtime for segmentation but never cached locally
- `.gitignore` must include `data/insights/`, `.env`, and any OAuth credential files

---

## 13. Insights Store Schema

The insights store (`data/insights/`) tracks learnings from the Analytics Engine to inform content generation.

**File format:** One JSON file per analysis run, named `YYYY-MM-DD-weekly.json` or `YYYY-MM-DD-[type].json`.

```json
{
  "date": "2026-03-15",
  "type": "weekly",
  "channels": {
    "google_ads": {
      "top_performers": [
        { "id": "ad_123", "headline": "...", "ctr": 0.045, "roas": 3.2 }
      ],
      "patterns": ["Headlines mentioning 'hecho a mano' outperform by 2x"]
    },
    "meta": {
      "top_posts": [
        { "id": "post_456", "text": "Cada mesa tiene una historia...", "engagement_rate": 0.082, "reach": 12500 }
      ],
      "patterns": ["Posts about crafting process get 3x more engagement"]
    }
  },
  "recommendations": [
    { "action": "increase_budget", "target": "campaign_X", "reason": "..." }
  ]
}
```

**Retention:** Keep last 12 weekly reports. Older files auto-deleted on new analysis run. Content generation modules read the 4 most recent files for context.

**Concurrency:** File writes use atomic rename (`write to .tmp` → `rename`) to prevent corruption if multiple commands run simultaneously.
