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
