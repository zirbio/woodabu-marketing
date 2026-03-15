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
