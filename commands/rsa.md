---
name: rsa
description: Generate Google Ads Responsive Search Ads informed by performance data and brand guidelines
---

You are generating Google Ads Responsive Search Ads for Woodabu, a handcrafted sustainable furniture company.

## Campaign Type Context

Before generating, ask the user which campaign type they are generating for:

- **Brand campaigns** — ROAS target 5-8x, impression share target 90%+. Headlines should reinforce brand identity, trust, and direct navigation intent.
- **Non-brand campaigns** — ROAS target 3-5x. Headlines must match generic search intent tightly. Keyword relevance is critical for Quality Score.
- **Competitor campaigns** — Differentiation angles vs Hannun, IKEA, Kave Home. Emphasize what Woodabu does that they cannot: true artisan craftsmanship, FSC-certified solid wood, lifetime guarantee, made in Madrid.

## Keyword Alignment

When generating headlines, ask for or infer the target ad group keywords. Headlines MUST match search intent:

- If keywords = "mesa comedor madera" → headlines must mention dining tables + solid wood
- If keywords = "cabecero madera natural" → headlines must mention headboards + natural wood
- If keywords = "muebles sostenibles" → headlines must emphasize sustainability + FSC + Zero Waste
- If keywords = brand terms → headlines should reinforce trust, authority, and direct brand recall
- If keywords = competitor terms → headlines should highlight Woodabu differentiators without naming competitors

## Process

1. **Read performance data**: Run the script `npx tsx src/apis/google-ads.ts` to fetch current campaign performance. If the API is unavailable, proceed without performance data and note this to the user.

2. **Read product catalog**: Run `npx tsx src/apis/shopify.ts` to get current products.

3. **Read brand guidelines**: Reference the `skills/woodabu-brand.md` file for tone, values, and word lists.

4. **Read recent insights**: Check `data/insights/` for the 4 most recent reports. Use patterns and recommendations as context.

5. **Generate RSA batch** following the headline and description structures below.

6. **Validate**: Run `npx tsx -e "import {validateRsaBatch} from './src/utils/validators.js'; ..."` to validate all character limits, then apply the full validation checklist in the "Validation Checklist" section below.

7. **Stage for review**: Present the ads in a formatted table:
   ```
   # Headlines (15)
   | # | Category | Headline | Chars |
   |---|----------|----------|-------|
   | 1 | Keyword  | ...      | 26    |

   # Descriptions (4)
   | # | Role | Description | Chars |
   |---|------|-------------|-------|
   | 1 | Benefit + Material | ... | 85 |
   ```

8. **Ask for approval**: "Review the ads above. Options: [a] Approve all, [e] Edit specific items, [r] Regenerate, [s] Skip"

9. **On approval**: Run the publish script to create ads in PAUSED state via Google Ads API.

10. **Confirm**: Show the created ad resource names and remind the user to activate them in Google Ads dashboard when ready.

## Headline Categories (15 total, max 30 chars each)

When generating 15 headlines, organize them by type. Each headline must be ≤30 characters. Examples shown with character counts in parentheses.

### 3-4 Keyword-match headlines (match search intent directly)

These are the highest-impact headlines for Quality Score. They must contain the exact or near-exact target keywords from the ad group.

- "Mesa Comedor Madera Maciza" (26)
- "Cabeceros Madera Natural" (24)
- "Mesa Extensible Roble" (21)
- "Muebles Sostenibles Madrid" (26)

### 3-4 Value proposition headlines

Communicate what makes Woodabu worth choosing. Focus on materials, process, and quality.

- "Madera Maciza, Hecha a Mano" (28)
- "100% Artesanal y Sostenible" (28)
- "Diseño Único en Madera" (22)

### 2-3 Social proof headlines

Build trust with numbers and ratings. Use real, verifiable data points.

- "4.9★ en Google | 300+ Opiniones" (30)
- "300 Familias Ya Confían" (23)

### 2-3 CTA headlines

Drive action. Use imperative verbs that invite participation.

- "Personaliza Tu Mesa Hoy" (24)
- "Pide Tu Presupuesto Gratis" (27)
- "Visita Nuestro Taller" (22)

### 2-3 Differentiator headlines

Highlight what competitors cannot claim. Origin, guarantee, philosophy.

- "Garantía de Por Vida" (20)
- "Hecho en Madrid con Alma" (24)
- "Del Bosque a Tu Hogar" (21)

### 1-2 Price-anchoring headlines (pre-qualify clicks, reduce wasted spend)

Including a price point filters out users outside the budget range, reducing wasted clicks and improving ROAS.

- "Mesas Desde 645€" (17)
- "Cabeceros Desde 399€" (20)

## Description Lines (4 total, max 90 chars each)

Always generate exactly 4 descriptions. Each serves a specific role to maximize ad relevance across different combinations Google may assemble.

### Description 1: Product benefit + material

Lead with the core product value and material quality.

> "Mesas de comedor de madera maciza FSC. Artesanales, sostenibles y con garantía de por vida."

### Description 2: Social proof + trust

Reinforce credibility with real numbers and location.

> "Más de 300 familias confían en Woodabu. 4.9/5 en Google. Hecho a mano en nuestro taller de Madrid."

### Description 3: Differentiator + CTA

Highlight the founder story and invite action. Include a tangible benefit like free shipping.

> "Diseñado por un ingeniero forestal. Personaliza medidas, acabados y colores. Envío gratis."

### Description 4: Emotional / story

Connect emotionally. Describe the craft and sensory experience.

> "Cada pieza cuenta una historia. Madera seleccionada a mano, tintes naturales, barniz al agua."

## Performance Benchmarks

Use these benchmarks to evaluate current campaign performance and set expectations:

| Metric | Brand Search | Non-Brand |
|--------|-------------|-----------|
| CPC | €0.30-0.60 | €0.80-1.80 |
| CTR | 6-10% | 3-6% |
| CVR | 2-4% | 1-2.5% |
| ROAS | 5-8x | 3-5x |

If current performance deviates significantly from these benchmarks, flag it to the user with a recommendation.

## Validation Checklist

After generating all headlines and descriptions, apply every check below. Do not present the batch to the user until all checks pass.

1. **Character limits**: ALL 15 headlines must be ≤30 characters. ALL 4 descriptions must be ≤90 characters. Spanish characters (ñ, á, é, í, ó, ú, ü) count as 1 character each.
2. **Headroom warning**: Flag any headline that is exactly 30 characters — it has no room for dynamic keyword insertion or location insertion. Recommend shortening by 2-3 chars if possible.
3. **Primary keyword present**: At least 1 headline must contain the primary keyword from the ad group. If none do, add one.
4. **Price pre-qualification**: At least 1 headline must mention a price or price range. This reduces wasted clicks from users outside the budget.
5. **Social proof present**: At least 1 headline must include social proof (rating, number of customers, or review count).
6. **Brand voice compliance**: Cross-check all copy against the brand guidelines in `skills/woodabu-brand.md`. No words from the "avoid" list may appear.
7. **Category distribution**: Verify the 15 headlines cover all 6 categories listed above. If any category is missing, add headlines until all are represented.
8. **No duplicate messaging**: No two headlines should communicate the same idea in nearly the same words. Each headline must add a distinct angle.
