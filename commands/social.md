---
name: social
description: Generate and schedule social media posts for Woodabu's Instagram/Facebook
---

You are generating social media posts for Woodabu across multiple platforms: Instagram (primary), TikTok, Pinterest, Facebook, and LinkedIn.

---

## Subcommands

### `/social weekly`

Generate a weekly content calendar of 5-7 Instagram feed posts, with adapted variants for TikTok (3-5 posts) and Pinterest (5-10 pins). Each day's content must follow the Content Pillars mix and Format Mix defined below. Output the full week as a table, then each post in detail.

### `/social product [name]`

Generate a multi-platform post set for a specific product:
- **Instagram**: feed post (Reel or Carousel) + 2-3 Story frames
- **Facebook**: cross-post version (slightly longer copy, no hashtags in body)
- **Pinterest**: vertical pin (1000x1500px spec) with SEO-rich description and board suggestion
- **TikTok**: script outline for a 30-60s making-of or product showcase Reel

### `/social campaign [theme]`

Generate a multi-platform campaign series (5-10 posts over 1-2 weeks) around a theme (e.g., "Pure Oceans Launch", "Black Friday Consciente", "Vuelta al Cole"). Include:
- Campaign narrative arc (teaser → reveal → social proof → urgency → wrap-up)
- Platform-specific adaptations for Instagram, TikTok, Pinterest, and Facebook
- Suggested paid boost budget split across platforms
- A branded campaign hashtag in addition to #MiWoodabu

---

## Content Pillars

When generating any weekly calendar, distribute content across these pillars:

| Pillar | Share | Content Examples |
|--------|-------|-----------------|
| **Maker / Process** | 35-40% | Reels showing workshop footage, sanding, finishing, assembly, tool close-ups, time-lapses of a piece going from raw plank to finished product |
| **Product in Context** | 20-25% | Finished pieces styled in real customer homes, room staging, "before/after" room transformations, seasonal styling |
| **Sustainability Story** | 15% | Pure Oceans collection, Zero Waste philosophy, FSC certification explainers, Tree Nation planting updates, packaging choices |
| **Founder / Team** | 10-15% | Kiko in the workshop, artisan spotlights, UFIL youth program stories, "a day in the life", founder reflections |
| **Customer Stories (UGC)** | 10% | #MiWoodabu reposts from customer homes, delivery reaction videos, testimonial quotes as graphics, unboxing content |
| **Education** | 5% | Wood care tips, material comparison carousels ("roble vs. nogal"), "how to choose the right dining table", styling guides |

---

## Format Mix — Instagram

Target this distribution for Instagram feed posts each week:

| Format | Share | Best For |
|--------|-------|----------|
| **Reels** | 50-60% | Workshop process, before/after reveals, making-of time-lapses, delivery reactions, Kiko talking to camera |
| **Carousels** | 25-30% | Educational content, product comparisons, room styling guides, sustainability explainers, "5 razones para elegir madera maciza" |
| **Static images** | 10-15% | Hero product photography, customer delivery photos, review quote graphics, announcement posts |

**Stories**: Recommend 3-5 per day, using interactive elements:
- Polls ("Roble claro o nogal oscuro?")
- Workshop-in-progress updates
- Q&A stickers ("Pregunta lo que quieras sobre madera")
- Countdown stickers for launches or restocks
- Reshare every customer Story mention within 4 hours

---

## Posting Cadence

| Platform | Feed Posts/Week | Stories/Day | Notes |
|----------|----------------|-------------|-------|
| **Instagram** | 5-7 | 3-5 | Primary platform. All original content starts here |
| **TikTok** | 3-5 | N/A | Repurpose best Reels. Lean into raw/unpolished workshop footage, trending audio |
| **Pinterest** | 5-10 pins | N/A | Vertical pins (1000x1500). SEO-heavy descriptions. Boards: "Muebles de Madera Maciza", "Decoracion Sostenible", "Salon Nordico" |
| **Facebook** | 3-4 (cross-post) | N/A | Cross-post top Instagram content. Slightly longer copy. No hashtags in body text |
| **LinkedIn** | 2-3 (Kiko personal) | N/A | Founder-voice posts: business learnings, sustainability industry insights, UFIL program, team milestones |

---

## Hashtag Strategy

Use **8-12 hashtags per Instagram post**. Structure in tiers:

| Tier | Count | Volume | Examples |
|------|-------|--------|----------|
| **Niche** | 3-4 | <100K posts | #MueblesDeMaderaMaciza, #MuebleSostenible, #EbanisteriaArtesanal, #DisenoConsciente |
| **Mid-tier** | 3-4 | 100K-1M posts | #MueblesAMedida, #DecoNordica, #MadeInSpain, #SlowDesign |
| **Broad** | 2-3 | 1M+ posts | #InteriorDesign, #HomeDecor, #SustainableLiving |
| **Branded** | 1-2 | — | #Woodabu, #MiWoodabu |

**Location hashtags** (include 1-2 per post when relevant):
- #MadridDesign, #MadeInMadrid, #AlcobendasDesign, #HechoEnEspana

**Community/lifestyle hashtags** (rotate 1-2 per post):
- #SlowLiving, #ConsciousHome, #IntentionalLiving, #WabiSabi, #VidaConsciente, #ConsumoResponsable

**Branded UGC hashtag**: Always encourage customers to use **#MiWoodabu** when sharing their pieces. Include it in:
- Delivery thank-you cards
- Post-purchase email sequence
- Instagram bio
- Pinned comment on popular posts

---

## UGC Integration

### Monthly UGC Quota
- Feature **2-4 UGC posts per month** from real customer homes
- Reshare all customer Story mentions within **4 hours** during business hours (10:00-19:00 CET)

### Review-to-Content Pipeline
- Pull the best Google review quotes weekly
- Design as branded quote graphics (brand colors + customer first name + city)
- Post 1 review graphic per week as a static post or Story
- Include star rating and "4.9/5 en Google (300+ opiniones)" watermark

### UGC Sourcing
- Monitor #MiWoodabu daily
- DM customers who post organically to request permission + high-res images
- After each delivery, send a follow-up requesting a photo ("Ensenanos como queda en tu casa!")
- Curate a running folder of approved UGC in `data/ugc/`

---

## Community Management Guidelines

### Response Times (during business hours: 10:00-19:00 CET, Mon-Sat)

| Channel | Target Response Time |
|---------|---------------------|
| Instagram/Facebook comments | < 2 hours |
| Instagram/Facebook DMs | < 1 hour |
| Google Reviews | < 24 hours |
| TikTok comments | < 4 hours |

### Comment Response Framework

| Type | Action |
|------|--------|
| **Product question** | Answer directly + include product link. If complex, invite to DM |
| **Compliment / praise** | Thank warmly + ask a follow-up question ("Cual es tu pieza favorita?") to drive engagement |
| **Purchase intent** | Answer + soft CTA ("Te escribimos por DM con todos los detalles!") |
| **Negative feedback** | Acknowledge publicly ("Sentimos mucho esta experiencia") + move to DM immediately. Never argue publicly |
| **Spam / offensive** | Hide or delete. Never engage |

**Rules:**
- Never delete negative comments unless they are spam, offensive, or contain personal information
- Always respond in the language the commenter uses (ES/EN)
- Use the commenter's first name when visible
- Like every comment on your posts, even if not replying individually

---

## Social Proof Integration

### Story Highlights
- Maintain a pinned **"Opiniones"** Story Highlight — update monthly with fresh review screenshots and UGC
- Maintain a **"Proceso"** Story Highlight showing workshop footage
- Maintain a **"Tu Casa"** Story Highlight with customer home UGC

### Review Presence
- Post 1 **review quote graphic** per week (static or carousel compiling 3-5 reviews)
- Include **"4.9/5 ★ Google (300+ opiniones)"** as social proof in:
  - Every Meta ad (primary text or headline)
  - Instagram bio
  - Product launch posts
  - Carousel last slides as a trust closer

---

## Process

1. **Read engagement data**: Fetch recent post performance from Meta Graph API via `npx tsx src/apis/meta.ts`. Analyze:
   - Top-performing posts by engagement rate (not just likes — weight saves and shares 2x)
   - Best posting times by day of week and hour
   - Reel vs. Carousel vs. Static performance comparison
   - Hashtag reach contribution
   - Follower growth trends

2. **Read products**: Fetch catalog from Shopify via `npx tsx src/apis/shopify.ts`. Identify:
   - New arrivals or restocks to feature
   - Best sellers to reinforce with social proof
   - Products with low visibility that need a content push
   - Seasonal relevance (e.g., outdoor pieces in spring, dining tables before holidays)

3. **Read brand guidelines**: Reference `skills/woodabu-brand.md` for:
   - Tone of voice (warm, authentic, never corporate)
   - Benefit hierarchy (lead with craft, support with sustainability, close with trust)
   - Brand tensions/manifesto lines for long-form content
   - Product naming conventions and descriptions

4. **Read insights**: Check `data/insights/` for:
   - Content patterns that historically drive engagement
   - Audience demographic shifts
   - Competitor content benchmarks
   - Seasonal content performance patterns

5. **Generate posts** — each post includes:
   - **Platform**: which platform(s) this post targets
   - **Format**: Reel / Carousel / Static / Story / Pin
   - **Content Pillar**: which pillar from the mix above
   - **Copy**: in Woodabu tone (ES primary, warm, authentic, never salesy). Lead with a hook in the first line. Include a CTA
   - **Hashtags**: 8-12 per post following the tier structure above (Instagram only; omit for Facebook/LinkedIn)
   - **Optimal publish time**: based on engagement data analysis from step 1
   - **Image/video suggestion**: product photo URL from Shopify catalog, or a brief for workshop footage / UGC to source
   - **Pinterest variant** (if applicable): vertical format description with SEO keywords, suggested board
   - **TikTok variant** (if applicable): adapted caption, trending audio suggestion, raw/unpolished tone

6. **Stage**: Show each post formatted in terminal, organized by day. User approves, edits, or skips individually. For each post, display:
   - Preview of copy (truncated to first 3 lines + "...")
   - Platform badges: [IG] [TT] [PIN] [FB] [LI]
   - Pillar tag
   - Scheduled time

7. **On approval**: Schedule via Meta Graph API. Posts are SCHEDULED (cancellable from Meta Business Suite). For non-Meta platforms:
   - TikTok: output copy + instructions for manual posting or Later/Buffer scheduling
   - Pinterest: output pin details for Tailwind or manual scheduling
   - LinkedIn: output copy for Kiko to post manually from his personal account

8. **Remind**: User must:
   - Upload images/videos manually in Meta Business Suite for each scheduled post
   - Schedule TikTok and Pinterest posts through their respective tools
   - Review and post LinkedIn content from Kiko's personal account
