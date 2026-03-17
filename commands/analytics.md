---
name: analytics
description: Cross-platform marketing analytics for Woodabu
---

You are analyzing Woodabu's marketing performance across all channels. Your goal is to surface actionable insights that drive revenue growth, improve ROAS, and optimize customer acquisition costs across paid, organic, email, and CRM channels.

## Subcommands

### `/analytics weekly`
Executive weekly summary with full performance breakdown (see Weekly Summary Structure below).

### `/analytics channel [name]`
Deep dive: google-ads, meta, shopify, organic, email.

### `/analytics product [name]`
Cross-channel performance for a specific product.

### `/analytics compare [period1] vs [period2]`
Temporal comparison. Formats: `YYYY-MM-DD:YYYY-MM-DD` or aliases: `last-week`, `last-month`, `last-quarter`, `last-year`.

### `/analytics funnel`
Shows the full conversion funnel with drop-off analysis:
- **Impressions** → **Clicks** → **Page Views** → **Add to Cart** → **Checkout** → **Purchase**
- Calculate drop-off rate at each stage
- Highlight the biggest leakage point
- Compare against benchmarks:
  - Click-through rate from impressions: 1-3% (paid), 3-8% (organic)
  - Page view to add-to-cart: 8-12% (typical for premium furniture)
  - Add-to-cart to checkout: 30-50%
  - Checkout to purchase: 50-70%
  - Overall cart abandonment: 70-80% is normal for this price range (€200-800 AOV)
- Break down funnel by channel (Google Ads, Meta, Organic, Email, Direct) to identify which sources produce the highest-quality traffic
- Flag any stage where drop-off exceeds benchmark by more than 15 percentage points

### `/analytics email`
Deep dive into email and CRM metrics:
- **Flow performance by type:**
  - Welcome flow: completion rate, revenue per recipient
  - Abandoned cart: recovery rate (benchmark: 5-10% recovery for premium furniture), revenue recovered
  - Post-purchase: cross-sell/upsell conversion rate
  - Review request: response rate, average rating from email-prompted reviews
  - Win-back: re-engagement rate
- **Segment performance:**
  - Compare metrics across customer segments (new, repeat, VIP, at-risk)
  - Revenue per segment
  - Engagement trends per segment
- **Subject line performance:**
  - Open rates by subject line style (question, urgency, personalized, emoji vs no emoji)
  - Top 5 and bottom 5 subject lines by open rate
- **Unsubscribe rate trend:**
  - Weekly unsubscribe rate (flag if >0.5% per send)
  - Identify which flow or campaign type drives the most unsubscribes
  - List growth vs churn (net subscriber change)

### `/analytics reviews`
Track review metrics across platforms:
- **Google Reviews:**
  - Total count, average rating, new reviews this week
  - Rating distribution (1-5 stars)
  - Response rate and average response time
- **Trustpilot:**
  - Total count, average rating, new reviews this week
  - Gap analysis: target is 50+ reviews to normalize score and reduce impact of outliers
  - TrustScore trend
- **Common themes in recent reviews:**
  - Positive: extract top 3 recurring praise points (e.g., quality, design, customer service)
  - Negative: extract top 3 recurring complaints (e.g., delivery time, packaging, assembly)
  - Flag any new negative theme not seen in previous weeks
- **Review response rate:**
  - Percentage of reviews responded to (target: 100% for negative, 50%+ for positive)
  - Average time to respond

## Weekly Summary Structure

The `/analytics weekly` report MUST include all of the following sections, in this order:

### a) Revenue & Spend Overview
- Total revenue for the week
- Total ad spend across all channels
- Blended ROAS (total revenue / total ad spend)
- Revenue by channel breakdown:
  - Google Ads (brand + non-brand separated)
  - Meta Ads
  - Organic (SEO + social)
  - Email / CRM
  - Direct / Other
- Comparison vs previous week: show absolute and % change for revenue, spend, and ROAS
- Month-to-date pacing: are we on track to hit the monthly target?

### b) Paid Media Performance
- **Google Ads:**
  - Total spend, CPC, CTR, conversions, conversion rate, ROAS
  - Impression share (brand terms) — target: >90%
  - Top 3 campaigns by ROAS
  - Bottom 3 campaigns by ROAS (candidates for optimization or pause)
  - Search term insights: any new high-intent terms worth adding?

- **Meta Ads:**
  - Total spend, CPC, CPM, CTR, ROAS, frequency
  - Top 3 ad sets by ROAS
  - Bottom 3 ad sets by ROAS
  - Creative performance: which format (video, carousel, static) is winning?
  - Audience performance: prospecting vs retargeting breakdown

- **Benchmark comparison** — flag any metric outside target range with a brief explanation:

  | Metric | Google Target | Meta Target | Status |
  |--------|--------------|-------------|--------|
  | CPC | €0.80-1.80 | €0.40-1.20 | OK / ABOVE / BELOW |
  | CTR | 3-6% | 0.8-1.8% | OK / ABOVE / BELOW |
  | ROAS | 3-5x (non-brand) | 3-6x | OK / ABOVE / BELOW |
  | CPA | €80-180 | €60-150 | OK / ABOVE / BELOW |

- For any metric outside target range, provide:
  - The actual value
  - How far it deviates from the target
  - Likely cause (e.g., audience fatigue, seasonality, creative staleness, competitor activity)
  - Recommended corrective action

### c) Organic & Social Performance
- **Instagram:**
  - Engagement rate (benchmark: 1.5-3% for furniture brands)
  - Reach and impressions
  - Saves and shares (more valuable than likes — these indicate purchase intent and virality)
  - Follower growth (net new followers)
  - Profile visits and website clicks from bio
- **Best performing post type:** Reel vs carousel vs static image — rank by engagement rate
- **DM volume and conversion:** how many DMs received, how many led to website visits or purchases
- **Content themes:** which topics drove the most engagement (lifestyle, product close-up, behind-the-scenes, UGC)

### d) Email & CRM Performance
- Open rate (benchmark: 15-20% for furniture D2C)
- Click-through rate (benchmark: 2-4%)
- Revenue attributed to email (total and per-send)
- Flow performance summary:
  - Abandoned cart recovery rate (benchmark: 5-10%)
  - Welcome flow completion rate
  - Post-purchase flow engagement
- List health: growth rate, bounce rate, spam complaint rate

### e) Product Performance

**Reference data (Shopify, March 2026):** 59 active products, 149 total. AOV ~€833. 17,997 customers, 3,251+ orders.

**Current Best Sellers (Shopify collection):**
1. Cabecero de madera Tulum (€518 base)
2. Mesa Extensible Forest (~€2,149)
3. Cabecero de madera Belle Ville (~€419-521)
4. Espejo Pure Oceans (€465 base)
5. Mesa extensible Butterfly
6. Mesa de comedor circular Oasis (€669 base)
7. Mesa de comedor Oasis (€645 base)
8. Perchero Vintage Valley RE (€279)
9. Mesa de comedor Off Line (€669 base)
10. Mesa Extensible Winblack (~€2,249)

**Product categories by type (active):** Cabecero (10), Mesa comedor (8), Mesas de centro (7), Banco (6), Espejo (6), Mesa extensible (5), Cuadro (4), Puerta (4), Mesita de noche (3), Perchero (3), Consola (2), Silla (2), Tabla cocina (6), Taburete (1)

- **Top 5 products by units sold** — with revenue and margin if available
- **Top 5 products by revenue** — with average selling price and discount rate
- **Optimization opportunities:** products with high page views but low conversion rate
  - For each, suggest a hypothesis (price, imagery, description, reviews) and a test
- **Stock alert:** flag any top performer with low inventory
- **New product performance:** if any product launched in the last 30 days, show its metrics vs expectations
- **MARKET collection performance:** track sell-through rate of ex-display pieces (30 products, typically faster delivery ~1 week)

### f) Customer Insights

**Reference baselines (Shopify, March 2026):**
- Total customer base: 17,997
- AOV baseline: ~€833
- Shopify customer segments available: Abandoned carts (30d), Email subscribers, From Spain, Non-buyers (0 orders), Repeat buyers (>1 order), Single-purchase buyers (≥1 order)
- Primary market: Spain (ES)

- New vs returning customer split (orders and revenue) — compare against Shopify "repeat buyer" vs "single purchase" segments
- AOV trend (this week vs 4-week average vs €833 baseline)
- Geographic distribution: top 5 regions/cities by orders
- Customer acquisition cost (CAC) by channel
- Repeat purchase rate trend — benchmark against Shopify "Clientes que han comprado más de una vez" segment

### g) Actionable Recommendations
Always end the report with 3-5 specific, prioritized actions. Use this format:

**[ACTION TYPE]: [WHAT TO DO] because [WHY / DATA POINT]. Expected impact: [ESTIMATE].**

Action types: INCREASE BUDGET, DECREASE BUDGET, PAUSE, LAUNCH, TEST, OPTIMIZE, FIX, INVESTIGATE

Examples:
- "INCREASE BUDGET: Scale Meta Campaign X by 20% because ROAS is 6.2x (above 5x target) and frequency is only 1.8. Expected: €X additional revenue at maintained efficiency."
- "PAUSE: Google Ads campaign Y because ROAS has been below 1.5x for 3 consecutive weeks despite creative refresh. Expected: save €X/week to reallocate."
- "TEST: New carousel format featuring customer reviews because UGC posts show 2.3x higher engagement. Expected: 15-25% CTR improvement."
- "FIX: Abandoned cart flow email #2 has 3% open rate (vs 35% for email #1). Subject line or timing issue. Expected: recovering additional €X/week."

Prioritize recommendations by expected impact (revenue potential or cost savings).

## Process

1. **Fetch data** from all APIs:
   - Google Ads: campaign performance via `src/apis/google-ads.ts`
   - Meta: ad + post insights via `src/apis/meta.ts`
   - GA4: traffic by channel, funnel events, and user segments via `src/apis/ga4.ts`
   - Shopify: sales, orders, products, and customer data via `src/apis/shopify.ts`
   - Email/CRM platform: flow metrics, campaign metrics, list health

2. **Aggregate**: Use `src/analytics/aggregator.ts` to combine cross-platform data.
   - Deduplicate conversions across channels
   - Apply consistent attribution windows (see Attribution Guidance below)
   - Calculate derived metrics: blended ROAS, CAC, LTV estimates

3. **Analyze**: Identify patterns, top/bottom performers, and generate recommendations.
   - Compare current period against previous period and against benchmarks
   - Detect trends (3+ weeks of consistent direction = trend)
   - Identify anomalies (any metric moving >20% week-over-week warrants investigation)
   - Cross-reference data: e.g., if Meta CTR drops, check if creative frequency is rising

4. **Advanced analysis**: Run the following modules from `src/analytics/`:
   - `detectTrends()` from `trends.ts` — identify rising/falling/stable trends per metric
   - `detectAnomalies()` from `anomalies.ts` — flag metrics deviating >2 stddev from historical mean
   - `computeCorrelations()` from `correlations.ts` — find cross-channel metric correlations (requires 5+ periods)
   - `computeProjections()` from `projections.ts` — project key metrics 2 and 4 weeks forward

   Include results in the report under new sections: "Trends", "Anomalies", "Cross-Channel Correlations", "Projections (2w/4w)".

5. **Present**: Format summary in terminal using `formatWeeklySummary()`.
   - Use tables for benchmark comparisons
   - Use color coding: green (on/above target), yellow (within 10% of target boundary), red (outside target)
   - Lead with the most important finding or change

6. **Save insights**: Store report in `data/insights/` via `InsightsStore.save()` for use by other modules.
   - See Insights Storage Enhancement below for required fields.

7. **Export**: Always save the report to `output/YYYY-MM-DD/analytics-{type}.md` using `saveOutput()` from `src/utils/exporter.ts`, in addition to saving raw data to `InsightsStore` (dual save).

## Attribution Guidance

Different channels require different attribution windows to accurately credit conversions:

- **Meta Ads:** Use 28-day click, 7-day view attribution window. This captures the longer consideration cycle typical of furniture purchases while including view-through conversions for awareness campaigns.
- **Google Ads:** Use 90-day attribution window. Search campaigns often capture high-intent users earlier in the journey; the longer window accounts for research-to-purchase lag in premium furniture.
- **Email/CRM:** Use 5-day click attribution. Email drives more immediate action.
- **Organic/Direct:** Use last-touch attribution by default.

Important attribution principles:
- **Track multi-touch paths:** First-click attribution tells the acquisition story (what channel introduced the customer). Last-click attribution tells the conversion story (what channel closed the sale). Report both when available.
- **Separate new customer vs returning customer ROAS:** A 2x ROAS on new customers may be more valuable than a 5x ROAS on returning customers who might have purchased anyway. Always break down ROAS by customer type when the data supports it.
- **Blended ROAS is the north star:** Individual channel ROAS is useful for optimization, but blended ROAS (total revenue / total ad spend) is the metric that reflects actual business health.
- **Beware of double-counting:** When multiple channels claim the same conversion, use the platform with the most reliable tracking as the source of truth (typically Shopify orders matched against channel data).

## Insights Storage Enhancement

When saving insights via `InsightsStore.save()`, include the following additional fields beyond the basic report data:

- **Best performing content TYPE:** Rank Reel, carousel, and static by engagement rate. The social engine uses this to prioritize content creation.
- **Best performing TOPICS:** Extract the top 3-5 content topics by engagement. Feed this back into the content strategy calendar.
- **Customer acquisition cost by channel:** Store CAC per channel so the budget allocation engine can optimize spend distribution.
- **Creative fatigue indicators:**
  - Flag any ad set or campaign where frequency exceeds 3.5
  - Flag any creative where CTR has declined more than 20% from its peak
  - Include the date the creative launched and its current age in days
  - These signals trigger creative refresh recommendations
- **Funnel drop-off data:** Store conversion rates at each funnel stage so the funnel subcommand can show trends over time.
- **Email flow metrics:** Store per-flow performance so the email subcommand can track improvements.
- **Review sentiment summary:** Store aggregated review themes for the brand health dashboard.
- **Week-over-week deltas:** Store the % change for key metrics so trend detection works across reports without re-fetching historical data.
