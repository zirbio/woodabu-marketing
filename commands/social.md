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
