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

6. **Ask funnel stage**: Before generating ads, ask the user which funnel stage they are targeting (TOF, MOF, or BOF). This determines objectives, audiences, content format, and copy style. See "Campaign Structure" below.

7. **Ask if retargeting**: Ask whether the ads are for retargeting. If yes, ask which retargeting segment (see "Retargeting Segments" below) and adjust copy accordingly.

8. **Generate ad variants** — for the relevant audience segments at the selected funnel stage, following the copy generation rules below.

9. **Stage for review**: Present in a table grouped by segment (see staging format below).

10. **Ask for approval**: Per-segment: [a] Approve, [e] Edit, [r] Regenerate, [s] Skip

11. **On approval**: Create ads as DRAFT via Meta Marketing API. Remind user they appear in Meta Ads Manager as drafts for final review.

---

## Audience Segments

### a) Eco-conscious consumers
- **Age range**: 25-45
- **Emphasis**: sustainability, Zero Waste collection, environmental impact
- **Tone**: inspiring, purposeful
- **Meta interest targeting**: Sustainability, Ethical Consumer, Zero Waste, Patagonia, Ecocentric, Greenpeace, Organic Living

### b) Design lovers
- **Age range**: 28-50
- **Emphasis**: unique artisan aesthetics, solid wood grain, exclusive pieces
- **Tone**: refined, appreciative of craft
- **Meta interest targeting**: Architectural Digest, Apartment Therapy, Slow Living, Elle Decoration, AD Magazine, Interior Design, Mid-century Modern Furniture

### c) Gift shoppers
- **Age range**: 25-55
- **Emphasis**: meaningful gifts, lifetime warranty, personalization
- **Tone**: warm, emotional
- **Meta interest targeting**: Gift ideas, Personalized gifts, Etsy, Artisan crafts, Wedding gifts, Housewarming

### d) Home renovation / new home buyers
- **Age range**: 30-50
- **Emphasis**: durability, investment pieces, made-to-last
- **Tone**: practical but aspirational
- **Meta interest targeting**: Home renovation, Houzz, Idealista, Habitissimo, Home improvement, Interior architecture

### e) Couples furnishing first shared home
- **Age range**: 28-38
- **Emphasis**: aspirational lifestyle, "your table, your story," joint decisions, building a home together
- **Tone**: warm, future-oriented, emotionally resonant
- **Meta interest targeting**: Wedding planning, Newlyweds, First-time home buyers, Couple activities, IKEA (as behavior signal), Home decor inspiration, Pinterest Home

### f) Affluent empty nesters
- **Age range**: 50-65
- **Emphasis**: quality investment, "buy once buy well," lifetime warranty, rewarding yourself after decades of work
- **Tone**: confident, understated luxury, mature
- **Meta interest targeting**: Fine dining, Wine tourism, Premium travel, Luxury lifestyle, Country living, Antiques, El Pais Semanal, Architectural Digest

### g) Sustainability-adjacent parents
- **Age range**: 32-45
- **Emphasis**: modeling responsible consumption, "built to last for your kids," non-toxic materials, family heirloom pieces
- **Tone**: nurturing, values-driven, practical
- **Meta interest targeting**: Conscious parenting, Montessori, Organic baby products, Family activities, Eco-friendly living, BabyCenter, Crianza respetuosa

### h) Expats in Spain
- **Age range**: 28-55
- **Language**: English-language ad variants
- **Emphasis**: local artisanal, Made in Madrid, supporting local craftspeople, authentic Spanish design
- **Tone**: warm, welcoming, discovery-oriented
- **Meta interest targeting**: Expat communities Spain, Internations, Madrid expats, English-speaking in Spain, Relocating to Spain
- **Geo**: Spain — exclude native Spanish speakers via language targeting (English only)

---

## Campaign Structure — Funnel Stages

When the user specifies a funnel stage, apply the corresponding strategy:

### TOF (Top of Funnel — Awareness) — 20-30% budget
- **Objective**: Video views, reach
- **Content formats**: Workshop Reels, founder story videos, Pure Oceans mission content, behind-the-scenes craftsmanship
- **Audiences**: Interest-based targeting from segments above, broad audiences with creative-led targeting, Lookalike 5-10% from purchasers
- **Copy style**: Storytelling, brand awareness, NO hard CTA. Let the craft speak. Lead with "why" not "what."
- **Primary text length**: Longer allowed (up to 250 chars) — narrative-driven
- **Example hook**: "Cada mesa empieza con un tronco y una conversación."

### MOF (Middle of Funnel — Consideration) — 30-40% budget
- **Objective**: Traffic, engagement, email capture
- **Content formats**: Product showcases, customer testimonials, room inspiration carousels, "before/after" room transformations
- **Audiences**: Website visitors (7-30 days), video viewers (25-75%), Instagram engaged users (90 days), Lookalike 1-3% from purchasers
- **Copy style**: Product benefits, social proof, soft CTA ("Descubre la coleccion," "Explora nuestras mesas")
- **Primary text length**: 125-200 chars — benefit-focused
- **Must include**: At least one social proof element per variant

### BOF (Bottom of Funnel — Conversion) — 30-40% budget
- **Objective**: Purchases
- **Content formats**: Product-specific with pricing, warranty callout, customer reviews, product detail close-ups
- **Audiences**: Add-to-cart abandoners (1-14 days), product page viewers (3-14 days), checkout initiators, Lookalike 1% from purchasers
- **Copy style**: Urgency through craftsmanship story (NOT artificial scarcity — no "only 3 left"), Klarna messaging, WhatsApp CTA
- **Primary text length**: 100-150 chars — direct, conversion-oriented
- **Must include**: "Paga en cuotas con Klarna" and/or "Habla con nosotros por WhatsApp" where relevant
- **Must include**: Specific product name and price when applicable

---

## Retargeting Segments

When the user specifies retargeting, ask which segment and apply the corresponding messaging strategy:

| Segment | Window | Message Strategy | Copy Focus |
|---------|--------|-----------------|------------|
| Homepage visitors (no product view) | 1-14 days | Brand story, collection overview | "Descubre lo que la madera puede ser." Broad brand messaging, introduce collections. |
| Collection page viewers | 1-21 days | Category-specific inspiration | Reference the specific collection they viewed. Room inspiration imagery. |
| Product page viewers (no ATC) | 1-30 days | Product + social proof + warranty | Name the product, include star rating, mention lifetime warranty. Overcome objections. |
| ATC abandoners | 1-14 days | Reassurance + Klarna + WhatsApp | Address hesitation directly. "Todavia pensando en [product]?" Include Klarna and WhatsApp. |
| Past purchasers | 30-180 days | Complementary products by room | "Tu [previous product] merece compania." Suggest products that complete the room. |
| Video viewers (50%+) | 1-30 days | Product showcase (story to product) | Move from brand story to specific product. "Ya conoces nuestra historia. Ahora descubre [product]." |

**Frequency cap**: Maximum 3-4 impressions per person per week for all retargeting campaigns. Flag this to the user as a reminder when generating retargeting ads.

---

## Copy Generation Rules

For every ad generation request, follow these rules:

1. **Minimum variations**: Generate 3-5 copy variations per segment per funnel stage. Each variation should test a different angle or hook.

2. **Hook variations**: The first line determines scroll-stop. Each variation MUST have a distinct opening hook. Types of hooks:
   - Question hook: "Sabias que tu mesa puede durar 50 anos?"
   - Statement hook: "Esto no es un mueble. Es una herencia."
   - Story hook: "Juan empezo tallando madera a los 14 anos."
   - Data hook: "4.9/5 en Google. 300+ familias ya confian en nosotros."
   - Contrast hook: "Madera maciza vs. aglomerado: 50 anos vs. 5."

3. **CTA word testing**: Rotate across variations:
   - "Descubre" (discovery-oriented)
   - "Explora" (exploratory)
   - "Conoce" (personal/intimate)
   - "Visita" (action-oriented)
   - For BOF: "Compra," "Anade al carrito," "Habla con nosotros"

4. **Mandatory elements**:
   - Social proof in at least one variation per set: "4.9/5 en Google (300+ opiniones)"
   - For BOF ads: Include "Paga en cuotas con Klarna" in at least one variation
   - For BOF ads: Include "Habla con nosotros por WhatsApp" in at least one variation

5. **Short-form copy for Stories/Reels**:
   - Maximum 125 characters
   - Designed for text-on-image/video overlay
   - Must work without additional context
   - Generate at least 2 short-form variants alongside standard variants
   - Example: "Madera maciza. Hecha a mano. Hecha para siempre."

6. **Character limits by field**:
   - **Primary text**: 125 chars recommended, 250 max
   - **Headline**: 40 chars max
   - **Description**: 30 chars max
   - **Stories/Reels overlay**: 125 chars max
   - All in Spanish unless user specifies otherwise (or segment h — Expats — which uses English)

---

## Competitive Positioning in Ads

Use these positioning angles when relevant. NEVER name competitors directly in ad copy.

### vs Hannun
- **Angle**: Founder-led authenticity
- **Key message**: "Founded by a forest engineer, not a furniture company."
- **Ad format**: Founder-led video ads perform best for this angle. Juan in the workshop.
- **Use when**: TOF/MOF, especially eco-conscious and design lover segments.

### vs IKEA
- **Angle**: Durability and craftsmanship as the antithesis of disposable furniture
- **Key messages**:
  - "La mesa que IKEA no puede hacer." (internal reference only — never name in live copy)
  - Use in copy: "Madera maciza que dura 50 anos, no 5."
  - "Tu mesa no deberia llevar un manual de instrucciones."
- **Use when**: MOF/BOF, especially home renovation and couples segments.

### vs Kave Home
- **Angle**: Vertical integration, 100% local production
- **Key messages**:
  - "Disenado Y fabricado por las mismas manos."
  - "100% hecho en Madrid. Sin intermediarios, sin fabricas lejanas."
- **Use when**: All funnel stages, especially eco-conscious and sustainability-adjacent parents.

---

## Performance Benchmarks

Use these benchmarks to evaluate campaign performance and set expectations when reporting:

| Metric | Target Range | Notes |
|--------|-------------|-------|
| CPC (feed) | €0.40-1.20 | Lower end for retargeting, higher for prospecting |
| CTR (feed) | 0.8-1.8% | Below 0.8% = creative fatigue, refresh needed |
| CVR (conversion rate) | 0.5-1.5% | Higher for BOF retargeting, lower for TOF |
| ROAS | 3-6x | Blended across funnel; BOF should be 5-8x, TOF may be <1x |
| CPM | €6-15 (low season) / €12-25 (Q4) | Monitor weekly; spikes signal auction competition |
| CPA (cost per acquisition) | €60-150 | Varies by product AOV; target CPA < 15% of AOV |

When fetching performance data in step 1, compare actuals against these benchmarks and flag any metrics outside range.

---

## Seasonal Considerations

### Christmas Campaigns
- **Launch by mid-October** — Woodabu has 3-5 week delivery times, so customers must order by late November for Christmas delivery
- Increase gift shopper segment weight significantly Oct-Dec
- Emphasize lifetime warranty as "the gift that lasts forever"
- Consider "order by [date] for Christmas delivery" messaging in BOF ads from November onward

### Black Friday (Nov 20-30)
- **Reduce prospecting spend** during Nov 20-30 — CPMs spike 40-80% due to auction competition from all advertisers
- **Maintain retargeting only** during this window — warm audiences are more cost-efficient
- Woodabu does NOT discount, so position against Black Friday: "No hacemos rebajas. Hacemos muebles que no necesitan reemplazo."
- Consider pausing TOF entirely and reallocating to BOF retargeting

### Budget Distribution by Quarter
| Quarter | % of Annual Budget | Rationale |
|---------|-------------------|-----------|
| Q1 (Jan-Mar) | 15-20% | Post-holiday slowdown, new year / new home motivation |
| Q2 (Apr-Jun) | 20-25% | Spring renovation season, moving season begins |
| Q3 (Jul-Sep) | 15-20% | Summer slowdown, back-to-routine September push |
| Q4 (Oct-Dec) | 35-40% | Peak season: Christmas gifting, home nesting, highest intent |

---

## Staging Format

Present generated ads in tables grouped by segment and funnel stage:

```
## Segment: [Segment Name] | Funnel: [TOF/MOF/BOF]

### Variation 1 — Hook type: [Question/Statement/Story/Data/Contrast]
| Field           | Content                                    | Chars |
|----------------|--------------------------------------------|-------|
| Primary text    | Cada mueble que creamos...                 | 120   |
| Headline        | Madera con proposito                       | 21    |
| Description     | Hecho a mano en Madrid                     | 22    |
| Story/Reel text | Madera maciza. Hecha para siempre.         | 38    |

### Variation 2 — Hook type: [...]
| Field           | Content                                    | Chars |
|----------------|--------------------------------------------|-------|
| ...             | ...                                        | ...   |
```

After presenting all variations for a segment, ask:
[a] Approve all | [e] Edit specific variation | [r] Regenerate all | [s] Skip segment
