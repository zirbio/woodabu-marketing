---
name: email
description: Generate email campaigns and flows for Woodabu via Shopify Email
---

You are generating email marketing content for Woodabu.

## Subcommands

### `/email campaign [topic]`
Full campaign with subject line, preheader, HTML body.

### `/email flow [type]`
Automated flows. Supported types:

#### `welcome` — 5 emails over 14 days
1. **Day 0 — Founder story + brand values.** Kiko's journey from corporate life to handcrafting furniture. Why Woodabu exists. Warm, personal, zero product push.
2. **Day 3 — Workshop tour + process.** Behind the scenes: how a piece goes from raw timber to finished furniture. Include workshop photos. Highlight the 3-5 week timeline as a feature, not a limitation.
3. **Day 6 — Materials + FSC + sustainability.** Deep dive into wood sourcing, FSC certification, Zero Waste philosophy. Educate on wood types (oak, walnut, pine) and finishes. Position sustainability as non-negotiable, not a marketing angle.
4. **Day 10 — Social proof + customer reviews.** Real customer stories with UGC photos. Show pieces in real homes. Include specific quotes mentioning quality, craftsmanship, and the unboxing experience.
5. **Day 14 — Soft product recommendation.** Based on browsing behavior or stated interest. "Pieces our community is loving right now." CTA to explore, not to buy.

#### `abandoned-cart` — 3 emails over 72 hours
1. **1 hour — "Tu pieza te espera en el taller."** Product image + key details (wood type, dimensions, finish). Remind of handcrafted nature. Answer common hesitations (delivery time, customization options). NO discount. NO urgency tactics.
2. **24 hours — Social proof + lifetime warranty.** Customer review of the same or similar product. Highlight lifetime warranty and after-sales care. Link to FAQ or WhatsApp for questions.
3. **72 hours — Craftsmanship story.** How this specific product is made. The joints, the finishing, the quality check. Final soft reminder. If they don't convert here, they enter browse-abandonment nurture instead.

**CRITICAL: NEVER offer a discount in abandoned-cart flows.** Woodabu's pricing reflects fair craftsmanship value. Discounting trains customers to abandon carts on purpose and erodes brand positioning.

#### `post-purchase` — 6 touchpoints during 3-5 week production
1. **Order confirmation (immediate).** Thank you + clear expectation setting: "Your piece will be handcrafted over the next 3-5 weeks." Include timeline visualization. Set the tone that this is artisanal, not Amazon.
2. **Production start (Week 1).** Photo of the selected wood that will become their piece. "Kiko has selected this [oak/walnut/pine] for your [product name]." Extremely personal.
3. **Mid-production update (Week 2-3).** Workshop photo showing the piece in progress. Brief note on the current stage (cutting, assembly, sanding). Build anticipation.
4. **Quality check & finishing (Week 3-4).** Photo of the piece receiving its final finish. Explain the finishing process (oils, waxes, natural treatments). Almost there.
5. **Shipping notification (Week 4-5).** Tracking info + delivery expectations. Care instructions preview. What to prepare at home.
6. **Delivery follow-up (Day of delivery).** "Your piece is home." Care guide attachment. Invite to share a photo. Subtle review request seed (full request comes later).

#### `review-request` — 2 emails
1. **7-14 days post-delivery.** "How does your [product name] look in its new home?" Ask for experience + UGC photo request with #MiWoodabu. Link to Google review. Timing is intentional: the piece is set up, they've lived with it, the novelty hasn't worn off.
2. **21 days post-delivery — Personal note from Kiko.** Handwritten-style email from the founder. "I'd love to see how your [product] fits in your space." More intimate, less transactional. Include Trustpilot link as secondary option.

#### `reactivation` — 3 emails after 90-day inactivity
1. **Day 0 — Workshop updates.** What's new in the workshop. New techniques, new wood sources, behind-the-scenes. Re-engage through content, not offers.
2. **Day 7 — New collection / seasonal.** Highlight new pieces or seasonal relevance (e.g., "Refresh your terrace for spring"). Show what's changed since they last visited.
3. **Day 14 — Custom consultation CTA.** "Have something specific in mind? Let's talk." Invite to a free customization consultation via WhatsApp or email. Position Woodabu as a partner, not just a store.

#### `cross-sell` — room-based logic
Triggered 30-60 days post-delivery. Recommendations follow room completion logic:
- **Bedroom:** headboard → nightstand → bench → wardrobe
- **Dining:** dining table → bench → sideboard → wall art
- **Living room:** coffee table → shelving → media console
- **Entry:** console table → coat rack → mirror frame

Always reference their existing piece: "Your [product name] in [wood type] pairs perfectly with..." Never generic recommendations.

#### `browse-abandonment`
Triggered when a visitor views the same product 2+ times without purchasing. Lighter touch than abandoned-cart (no cart intent signal):
1. **Email 1 (24h after second view).** "Still thinking about [product name]?" Educational content about the piece: materials, dimensions, customization options. Answer questions they might have.
2. **Email 2 (72h).** Social proof: customer photo of the same product in a real home. "Here's how [customer name] styled theirs."

### `/email newsletter`
Weekly/monthly newsletter.

---

## Segmentation Guidelines

When generating email content, tailor messaging to these segments:

### By purchase behavior
- **Non-buyers:** Education-first. Workshop stories, material guides, sustainability content. Build trust before any product focus.
- **First-time buyers:** Post-purchase nurture is critical. They need to feel the handcrafted experience was worth the wait. Prime them for cross-sell.
- **Repeat buyers:** Community members. Early access to new collections, consultation invitations, referral program.
- **High AOV (>€1,000):** White-glove communication. Personal emails from Kiko. Custom project invitations. These are design-conscious buyers.
- **Entry AOV (<€400):** Likely bought a smaller piece (shelf, stool, wall art). Educate on larger pieces. Show how small pieces complement bigger ones.

### By collection interest
- **Zero Waste:** Lead with sustainability, reclaimed materials, environmental impact metrics.
- **Pure Oceans:** Ocean plastics story, collaboration details, limited-edition angle.
- **Originals:** Timeless design, classic materials, versatility in any interior style.

### By room / need
- **Bedroom, dining, living room, entry, terrace.** Tailor product recommendations and imagery to the room context. Cross-sell within the same room first.

### By engagement level
- **Active (opened < 30 days):** Full communication. Campaigns + flows.
- **Engaged (< 90 days):** Standard cadence. Monitor for drop-off signals.
- **At-risk (90-180 days):** Trigger reactivation flow. Reduce campaign frequency to avoid fatigue.
- **Dormant (> 180 days):** Last-chance reactivation, then suppress from campaigns. Do not keep emailing unengaged contacts — it hurts deliverability.

---

## Email Tone Guidelines

### Subject lines that work
- **Craft curiosity:** "Lo que no se ve en tu mesita de noche"
- **Specificity about their piece:** "Tu cabecero de roble está tomando forma"
- **Social proof:** "Por qué María eligió nogal para su salón"
- **Education:** "Roble vs. nogal: cuál es para ti"
- **Founder voice:** "Una cosa que aprendí lijando a mano — Kiko"

### Preview text
Never repeat the subject line. Continue the story or add a complementary detail. The preview text is a second hook, not a summary.

### Personalization
Use customer name. Reference specific product, material, and wood type. Mention their city if available (for delivery context). Reference past purchases in cross-sell flows.

### CTA language
Use: **"Descubrir," "Ver en detalle," "Conocer la historia," "Explorar la colección," "Hablar con Kiko."**

**NEVER use:** "COMPRAR AHORA," "OFERTA," "ÚLTIMA OPORTUNIDAD," or any urgency/scarcity language. Woodabu sells considered purchases, not impulse buys.

### Frequency cap
- **Campaigns:** Maximum 1-2 per month. Quality over quantity.
- **Transactional flows:** Separate from campaign count. These are expected and welcomed.
- **If a customer is in an active flow** (e.g., post-purchase), suppress campaigns to avoid overload.

---

## Post-Purchase Critical Rule

**If delivery will exceed the quoted 3-5 week window, proactive communication MUST happen BEFORE the customer asks.**

This is non-negotiable. The email comes from Kiko personally, explaining:
- What happened (honest reason: wood grain wasn't right, extra finishing needed, supply delay)
- New expected timeline
- That quality will never be compromised for speed

This turns a potential negative experience into a brand-building moment. Customers who receive proactive delay communication rate their experience higher than customers who received on-time delivery without updates. Transparency is Woodabu's superpower.

---

## Email Design Rules

- **Always include a handcrafted element:** workshop photo, close-up of wood grain, artisan signature, hand-drawn illustration. Every email should feel like it came from a workshop, not a marketing department.
- **A/B test minimum 2 subject lines per campaign.** Track open rates per segment, not just overall.
- **Unsubscribe options:** Offer frequency preferences (weekly vs. monthly) and topic preferences (campaigns vs. workshop updates only). Do not offer only a full unsubscribe.
- **Reference products specifically:** Always use the product name, wood type, and finish. "Your Mesa Nara in solid oak with natural oil finish" — NEVER "your order" or "your item."
- **Mobile-first design:** 70%+ of Woodabu's audience reads email on mobile. Single-column layout, large tap targets, optimized images.

---

## Review Collection Strategy

### Satisfaction gate
Before asking for a public review, ask internally: **"How was your experience?"** (simple 1-5 scale or thumbs up/down).

### Routing logic
- **Happy customers (4-5 stars):** Direct to **Google review first** (highest SEO impact), then Trustpilot as secondary.
- **Unhappy customers (1-3 stars):** Route to customer service immediately. Kiko or team responds personally. Resolve the issue before any public review request.

### Timing
- **Ask at 7-14 days post-delivery**, not at delivery. The customer needs time to set up the piece, live with it, and form a genuine opinion. Day-of-delivery reviews are superficial.

### UGC photo request
- Include with every review request. "We'd love to see your [product] in its new home."
- Suggest the hashtag **#MiWoodabu** for social sharing.
- Offer to feature their photo on the website (with permission) as an incentive.

---

## WhatsApp Integration

### Response SLA
- **< 2 hours during business hours.** WhatsApp sets an expectation of speed. If you can't meet this, set auto-replies with realistic timeframes.

### Tone
- Most casual channel. Conversational, warm, first-name basis.
- **Voice notes are OK** for customization explanations — hearing Kiko explain wood grain options is more powerful than reading about them.
- Emojis are acceptable here (unlike email).

### Use cases
- **Pre-purchase:** Dimensions, materials, customization options, "will this fit in my space?" consultations.
- **During production:** Progress photos, wood selection confirmation, finish samples.
- **Post-delivery:** Care instructions, minor issues, compliments (capture these as testimonials with permission).

### Compliance
- **NOT for marketing broadcasts.** GDPR and ePrivacy regulations require explicit opt-in for marketing messages via WhatsApp. Use it for 1:1 conversations and transactional updates only.
- Every WhatsApp conversation should feel like talking to the craftsman, not a brand.

---

## Process

1. **Read customer data**: Fetch segments and top products from Shopify.
2. **Read brand guidelines**: Reference `skills/woodabu-brand.md`.
3. **Read insights**: Check `data/insights/` for email patterns.
4. **Generate email** — includes:
   - 3 subject line variants (for A/B testing, minimum 2)
   - Preheader text (never repeating subject line)
   - Body in MJML format following brand style
   - Product recommendations from Shopify (personalized by segment)
   - Handcrafted visual element (workshop photo, wood close-up, artisan signature)
5. **Compile**: Use `src/staging/html-preview.ts` to compile MJML to HTML.
6. **Stage**: Save HTML to temp file, open in browser for preview. Show summary in terminal.
7. **On approval**: Attempt to create draft via Shopify GraphQL API. If unavailable, instruct user to copy HTML into Shopify Email manually.
