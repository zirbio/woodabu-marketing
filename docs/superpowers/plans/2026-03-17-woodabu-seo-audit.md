# Woodabu SEO Audit — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a comprehensive SEO audit and optimization for woodabu.com covering technical SEO, Google Business Profile, keyword research, on-page optimization, and blog content strategy.

**Architecture:** This is a hybrid operational + code project. Most tasks are manual SEO operations executed via browser and external tools, with supporting automation built in this repo (GA4 organic metrics extraction, `/seo` slash command, content brief templates). The plan follows the "Quick Wins First" approach: technical fixes and GBP in weeks 1-2, keyword research and on-page in weeks 3-4, blog content strategy in weeks 5-8.

**Tech Stack:** Google Search Console, GA4, Google Business Profile, Screaming Frog (free), Ubersuggest (freemium), PageSpeed Insights, this repo's GA4 API client (`src/apis/ga4.ts`), Shopify admin.

**Spec:** `docs/superpowers/specs/2026-03-17-woodabu-seo-audit-design.md`

---

## Task 0: Extract KPI Baselines

Before making ANY changes, capture the current state of all metrics so we can measure impact.

**Files:**
- Modify: `src/apis/ga4.ts` (add organic traffic methods)
- Create: `commands/seo.md` (new slash command)
- Create: `data/seo-baseline.json` (baseline snapshot)

- [ ] **Step 1: Export Search Console baseline data**

Go to Google Search Console → Performance → Search Results:
- Set date range: last 3 months
- Export full query list (CSV): all queries with impressions, clicks, CTR, position
- Export page-level data (CSV): all pages with impressions, clicks, CTR, position
- Save both exports to `data/` locally (gitignored)

Record in `data/seo-baseline.json`:
```json
{
  "date": "2026-03-17",
  "searchConsole": {
    "totalClicks3m": 0,
    "totalImpressions3m": 0,
    "averageCTR": 0,
    "averagePosition": 0,
    "keywordsInTop10": 0,
    "keywordsInTop20": 0
  }
}
```

- [ ] **Step 2: Export GA4 organic traffic baseline**

Go to GA4 → Reports → Acquisition → Traffic Acquisition:
- Filter: Session default channel group = "Organic Search"
- Date range: last 3 months
- Record: sessions, users, engagement rate, conversions, revenue

Add to `data/seo-baseline.json`:
```json
{
  "ga4Organic": {
    "sessions3m": 0,
    "users3m": 0,
    "engagementRate": 0,
    "conversions3m": 0,
    "revenue3m": 0,
    "organicRevenueShare": 0
  }
}
```

- [ ] **Step 3: Export GBP baseline**

Go to Google Business Profile → Performance:
- Record: impressions (last 3 months), website clicks, direction requests, phone calls
- Record: total reviews count, average rating

Add to `data/seo-baseline.json`:
```json
{
  "gbp": {
    "impressions3m": 0,
    "websiteClicks3m": 0,
    "directionRequests3m": 0,
    "phoneCalls3m": 0,
    "totalReviews": 0,
    "averageRating": 0
  }
}
```

- [ ] **Step 4: Record blog baseline**

Count: total articles, last publish date, articles published in last 90 days.

Add to `data/seo-baseline.json`:
```json
{
  "blog": {
    "totalArticles": 13,
    "lastPublishDate": "2025-07-17",
    "articlesLast90d": 0
  }
}
```

- [ ] **Step 5: Set quantitative targets**

Using the baseline data, define targets for 6- and 12-month milestones. Add to `data/seo-baseline.json`:

```json
{
  "targets": {
    "6months": {
      "organicSessionsGrowth": "+50%",
      "keywordsInTop10": 20,
      "organicRevenueGrowth": "+30%",
      "articlesPublished": 24,
      "gbpPostsPublished": 48
    },
    "12months": {
      "organicSessionsGrowth": "+100%",
      "keywordsInTop10": 40,
      "organicRevenueShareTarget": "TBD based on baseline",
      "articlesPublished": 48
    }
  }
}
```

Adjust these numbers based on the actual baseline. If organic traffic is currently very low, growth percentages will be higher. If already decent, be more conservative.

- [ ] **Step 6: Add `getOrganicTraffic` method to GA4 client**

Add a new method to `src/apis/ga4.ts` for extracting organic SEO metrics programmatically:

```typescript
export interface OrganicTraffic {
  date: string;
  sessions: number;
  users: number;
  engagementRate: number;
  conversions: number;
  revenue: number;
}

// Add to GA4Client class:
async getOrganicTraffic(startDate: string, endDate: string): Promise<OrganicTraffic[]> {
  const [response] = await this.client.runReport({
    property: this.propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'engagementRate' },
      { name: 'conversions' },
      { name: 'purchaseRevenue' },
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'sessionDefaultChannelGroup',
        stringFilter: { value: 'Organic Search' },
      },
    },
  });

  if (!response.rows) return [];

  return response.rows.map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? '',
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
    users: Number(row.metricValues?.[1]?.value ?? 0),
    engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
    conversions: Number(row.metricValues?.[3]?.value ?? 0),
    revenue: Number(row.metricValues?.[4]?.value ?? 0),
  }));
}
```

- [ ] **Step 7: Write test for `getOrganicTraffic`**

Create test in `src/apis/ga4.test.ts` following existing test patterns (vitest + msw). Verify the method filters by Organic Search channel and maps response correctly.

- [ ] **Step 8: Run tests**

```bash
npm run test -- src/apis/ga4.test.ts
npm run typecheck
```

Expected: all tests pass, 0 TypeScript errors.

- [ ] **Step 9: Commit baseline + GA4 method**

```bash
git add data/seo-baseline.json src/apis/ga4.ts src/apis/ga4.test.ts
git commit -m "feat(seo): capture KPI baseline and add GA4 organic traffic method"
```

---

## Task 1: Technical SEO — Screaming Frog Crawl

**Tools:** Screaming Frog SEO Spider (free, download from screamingfrog.co.uk)

- [ ] **Step 1: Install Screaming Frog**

Download and install Screaming Frog SEO Spider (free version supports up to 500 URLs, which covers woodabu.com's ~200-300 URLs).

- [ ] **Step 2: Run desktop crawl**

Open Screaming Frog → enter `https://woodabu.com` → Start crawl. Wait for completion.

- [ ] **Step 3: Run mobile crawl**

Configuration → User-Agent → Googlebot Smartphone. Re-crawl. Compare results with desktop crawl for mobile-first indexing differences.

- [ ] **Step 4: Export and analyze key reports**

Export the following tabs to CSV (save to `data/` locally):
- **Page Titles:** Find duplicates, missing, too long (>60 chars), too short
- **Meta Descriptions:** Find duplicates, missing, too long (>160 chars)
- **H1:** Find duplicates, missing, multiple H1 per page
- **Images:** Find missing alt text (filter: Alt Text = empty)
- **Response Codes:** Find 404s, 301/302 redirect chains
- **Canonicals:** Verify Shopify canonical tags are correct (no `/collections/X/products/Y` indexed when `/products/Y` exists)
- **Orphan Pages:** Identify pages with 0 internal links pointing to them

- [ ] **Step 5: Audit on-page basics for all product + collection pages**

Using the Screaming Frog data, create a dedicated audit of all 59 product pages + collection pages covering:
- Meta title: present? unique? within 60 chars? includes target keyword?
- Meta description: present? unique? within 160 chars?
- H1: present? only one? includes primary keyword?
- Internal links: how many inlinks does each page have?

This is the diagnostic step — corrections happen in Task 10. Record findings per page.

- [ ] **Step 6: Create findings spreadsheet**

Create a spreadsheet with columns: URL, Issue Type, Severity (Critical/High/Medium/Low), Current Value, Recommended Fix, Status.

Priority guide:
- **Critical:** 404 errors, missing canonical tags, duplicate content
- **High:** Missing meta titles/descriptions on product pages, missing H1s
- **Medium:** Missing alt text, meta descriptions too long/short
- **Low:** Non-essential pages with minor issues

- [ ] **Step 7: Sign up for Ahrefs Webmaster Tools**

Go to ahrefs.com/webmaster-tools (free). Sign up, verify woodabu.com ownership via Search Console integration. Once verified:
- Export backlink profile: total backlinks, referring domains, top linked pages
- Run site health audit: note health score and top issues
- Save summary to `data/seo-audit-technical-findings.md`

This provides the baseline for any future link building phase.

- [ ] **Step 8: Commit findings summary**

Save a summary of top findings (not the full CSV) as `data/seo-audit-technical-findings.md`. Commit.

```bash
git add data/seo-audit-technical-findings.md
git commit -m "docs(seo): add technical SEO audit findings from Screaming Frog crawl"
```

---

## Task 2: Technical SEO — Core Web Vitals

**Tools:** Google PageSpeed Insights (web), Google Search Console (Core Web Vitals report)

- [ ] **Step 1: Check CrUX field data availability**

Go to Google Search Console → Experience → Core Web Vitals. Check if field data exists for woodabu.com. If yes, note any URLs in "Poor" or "Needs Improvement" buckets. If no field data, note this and proceed with lab data.

- [ ] **Step 2: Run PageSpeed Insights on 5 key pages**

Test each URL on pagespeed.web.dev. For each, record LCP, INP, CLS (both mobile and desktop):

1. `https://woodabu.com` (homepage)
2. `https://woodabu.com/products/cabecero-de-madera-tulum` (best seller — verify exact URL)
3. `https://woodabu.com/collections/mesas-extensibles` (high-value collection — verify exact URL)
4. `https://woodabu.com/blogs/noticias` (blog index)
5. Most recent blog article URL

Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1

- [ ] **Step 3: Document findings and quick fixes**

For each page, document:
- Current scores (mobile + desktop)
- Top 3 opportunities from PageSpeed (usually: image optimization, unused JavaScript, render-blocking resources)
- Shopify-actionable fixes: convert images to WebP, enable lazy loading, compress hero images, remove unused apps/scripts

Add results to `data/seo-audit-technical-findings.md`.

- [ ] **Step 4: Commit updated findings**

```bash
git add data/seo-audit-technical-findings.md
git commit -m "docs(seo): add Core Web Vitals audit results"
```

---

## Task 3: Technical SEO — Schema Markup Validation

**Tools:** Google Rich Results Test (search.google.com/test/rich-results)

- [ ] **Step 1: Validate homepage schema**

Test `https://woodabu.com` in Rich Results Test. Verify FurnitureStore, Organization, WebSite schemas are valid. Document any errors or warnings.

- [ ] **Step 2: Validate a product page**

Test a product page (Cabecero Tulum). Check if Product schema exists with `price`, `availability`, `name`, `image`. Note if `aggregateRating` is absent (expected — needs reviews app).

- [ ] **Step 3: Validate a blog article**

Test a blog article URL. Check if BlogPosting schema exists. If not, this needs to be added via Shopify theme or app.

- [ ] **Step 4: Validate FAQ page**

Test the FAQ page. Check if FAQ schema exists. If not, add it.

- [ ] **Step 5: Document schema status**

Create a table in `data/seo-audit-technical-findings.md`:

| Page Type | Schema Found | Schema Missing | Action |
|---|---|---|---|
| Homepage | FurnitureStore, Organization, WebSite | — | OK |
| Product | ? | Product (price, availability) | Add via theme/app |
| Blog article | ? | BlogPosting | Add via theme |
| FAQ | ? | FAQ | Add via theme/app |

- [ ] **Step 6: Evaluate Shopify reviews app**

Research reviews apps that output valid Product schema with aggregateRating:
- **Judge.me** (free plan available, generates Product + AggregateRating schema)
- **Loox** (paid, visual reviews with schema)
- **Stamped** (paid, comprehensive reviews with schema)

Recommend Judge.me (free, solid schema output) unless specific needs dictate otherwise.

- [ ] **Step 7: Commit schema findings**

```bash
git add data/seo-audit-technical-findings.md
git commit -m "docs(seo): add schema markup audit results and reviews app recommendation"
```

---

## Task 4: Technical SEO — Indexation & Sitemap

**Tools:** Google Search Console, browser

- [ ] **Step 1: Review sitemap**

Open `https://woodabu.com/sitemap.xml` in browser. Verify it includes:
- All 59 active product pages
- All collection pages
- All blog articles
- Homepage
- Key static pages (About, FAQ, Contact)

Note any missing pages or unexpected inclusions.

- [ ] **Step 2: Check Search Console indexation**

Go to Search Console → Indexing → Pages:
- Record: total indexed pages, total excluded pages
- Review excluded pages by reason: identify any that SHOULD be indexed but aren't
- Check for "Discovered — currently not indexed" or "Crawled — currently not indexed" — these indicate Google found but chose not to index (thin content, duplicate, or quality issue)

- [ ] **Step 3: Check for out-of-stock handling**

Navigate to a product that appears out of stock (if any). Verify:
- Does it return 200 with "out of stock" message? (preferred — keeps SEO value)
- Does it 404? (bad — loses accumulated ranking signals)
- Does it redirect? (acceptable — transfers SEO value to relevant page)

- [ ] **Step 4: Document indexation findings**

Add to `data/seo-audit-technical-findings.md`. Commit.

```bash
git add data/seo-audit-technical-findings.md
git commit -m "docs(seo): add indexation and sitemap audit results"
```

---

## Task 5: GBP — Category & Attributes Audit

**Tools:** Chrome browser, Google Maps, Google Business Profile dashboard

- [ ] **Step 1: Document current GBP categories**

Log in to Google Business Profile dashboard. Record:
- Current primary category
- All secondary categories
- All current attributes

- [ ] **Step 2: Research competitor categories**

Search Google Maps for these queries and note which competitors appear in Map Pack. For each Map Pack competitor, open their listing and record primary + secondary categories:

1. "muebles sostenibles Madrid"
2. "muebles a medida Madrid"
3. "cabeceros madera Madrid"
4. "tienda muebles Alcobendas"
5. "ebanista Madrid"

Create a spreadsheet: competitor name, primary category, secondary categories, star rating, review count.

- [ ] **Step 3: Identify missing categories**

Compare competitor categories against Woodabu's. Highlight any category that 2+ competitors have that Woodabu doesn't. Likely candidates:
- "Taller de ebanistería" / "Carpintería"
- "Tienda de decoración"
- "Tienda de muebles de diseño"
- "Fabricante de muebles"

- [ ] **Step 4: Research competitor attributes**

For the same competitors, record all visible attributes. Identify which Woodabu is missing.

- [ ] **Step 5: Update GBP categories and attributes**

In GBP dashboard:
- Add identified missing secondary categories
- Add missing attributes (especially: "Productos artesanales", "Empresa con conciencia ecológica", "Envío a domicilio", "Cita previa")

- [ ] **Step 6: Document changes**

Record all changes made to GBP in `data/seo-audit-gbp-changes.md`. Commit.

```bash
git add data/seo-audit-gbp-changes.md
git commit -m "docs(seo): document GBP category and attribute optimizations"
```

---

## Task 6: GBP — Services, Description & NAP

- [ ] **Step 1: Optimize services section**

In GBP dashboard → Services, add/update each service with optimized descriptions. Services to include:

1. **Muebles a medida** — "Diseñamos y fabricamos muebles de madera maciza a medida en nuestro taller de Alcobendas. Cada pieza es única, hecha a mano por ebanistas profesionales. Envío a toda España."
2. **Cabeceros de madera** — "Cabeceros artesanales de madera maciza en diseños exclusivos: Tulum, Belle Ville, Pampa y más. Hechos a mano con madera certificada FSC. Garantía de por vida."
3. **Mesas extensibles** — "Mesas extensibles de madera maciza para comedor. Diseños como Forest, Butterfly y Winblack. Fabricación artesanal en Madrid con materiales sostenibles."
4. **Mesas de comedor** — "Mesas de comedor de madera maciza artesanales. Circulares, rectangulares y extensibles. Diseños exclusivos hechos a mano en España."
5. **Espejos y decoración** — "Espejos de madera y elementos decorativos artesanales. Colección Pure Oceans fabricada con redes de pesca recicladas del océano."
6. **Muebles sostenibles** — "Muebles ecológicos con madera FSC, acabados naturales y packaging ecológico. Colección Zero Waste con madera recuperada. 1 árbol plantado por pieza vendida."

- [ ] **Step 2: Write 3 versions of GBP description**

Version 1 — Keyword-focused (750 chars max):
```
Woodabu — Taller de muebles de madera maciza artesanales en Alcobendas, Madrid. Fabricamos cabeceros, mesas extensibles, mesas de comedor, espejos y decoración con madera certificada FSC. Cada pieza es diseñada y hecha a mano por ebanistas profesionales. Colección Pure Oceans (redes de pesca recicladas) y Zero Waste (madera recuperada). Garantía de por vida. 1 árbol plantado por pieza vendida vía Tree Nation. Envío a toda España. Visita nuestro showroom con cita previa.
```

Version 2 — Conversion-focused (750 chars max):
```
¿Buscas muebles únicos que cuenten una historia? En Woodabu cada pieza es irrepetible: diseñada por un ingeniero forestal y fabricada a mano en nuestro taller de Madrid. Más de 300 familias nos han dado 4,9/5 estrellas. Cabeceros desde 279€, mesas extensibles, espejos y decoración en madera maciza. Garantía de por vida — porque un mueble Woodabu está hecho para durar generaciones. Visita nuestro showroom en Alcobendas o compra online con envío a toda España. Pide cita y descubre la diferencia de lo artesanal.
```

Version 3 — Balanced (750 chars max):
```
Woodabu es un taller de muebles artesanales de madera maciza en Alcobendas, Madrid. Fundado por Kiko Izard, ingeniero forestal, cada pieza se diseña y fabrica a mano con madera FSC y acabados ecológicos. Cabeceros, mesas extensibles, mesas de comedor, espejos y decoración. Colecciones Pure Oceans (redes de pesca recicladas) y Zero Waste. 300+ reseñas a 4,9 estrellas. Garantía de por vida y 1 árbol plantado por venta. Showroom con cita previa. Envío a toda España.
```

Apply Version 3 (balanced) first. Test 30 days, then rotate.

- [ ] **Step 3: NAP consistency audit**

Search for "Woodabu" on each platform and verify Name, Address, Phone are identical:

| Platform | URL | NAP Correct? | Action needed |
|---|---|---|---|
| Google Business Profile | (dashboard) | — | Reference |
| Bing Places | bing.com/maps | ? | Verify/claim |
| Apple Maps | mapsconnect.apple.com | ? | Verify/claim |
| Yelp Spain | yelp.es | ? | Verify/claim |
| Páginas Amarillas | paginasamarillas.es | ? | Verify |
| Instagram | instagram.com/woodabu | ? | Check bio |
| Facebook | facebook.com/woodabu | ? | Check info |
| LinkedIn | linkedin.com/company/woodabu | ? | Check info |

Fix any inconsistencies immediately.

- [ ] **Step 4: Update documentation and commit**

Add all changes to `data/seo-audit-gbp-changes.md`. Commit.

```bash
git add data/seo-audit-gbp-changes.md
git commit -m "docs(seo): add GBP services, description, and NAP audit results"
```

---

## Task 7: GBP — Review Strategy & Templates

- [ ] **Step 1: Analyze current review velocity**

In GBP Insights, check reviews received per month for the last 6 months. Calculate average monthly velocity.

Check top 3 competitor review counts and estimate their velocity (total reviews / months since oldest visible review as approximation).

- [ ] **Step 2: Create review response templates**

Create file `data/templates/review-responses.md`:

```markdown
# Woodabu — Review Response Templates

## 5 Stars — Variation A
"¡Muchas gracias, [nombre]! Nos alegra saber que tu [producto/pieza] de madera maciza ha encontrado su hogar perfecto. Cada pieza sale de nuestro taller en Alcobendas con mucho cariño — saber que lo valoras nos motiva a seguir creando. ¡Un abrazo del equipo Woodabu!"

## 5 Stars — Variation B
"¡Gracias por tus palabras, [nombre]! Es un orgullo saber que disfrutas de tu mueble artesanal. En Woodabu ponemos el alma en cada pieza, y comentarios como el tuyo hacen que todo merezca la pena. ¡Esperamos verte pronto en el taller!"

## 5 Stars — Variation C
"[Nombre], ¡qué ilusión leerte! Cada mueble que sale de nuestro taller de madera maciza en Madrid lleva horas de trabajo artesanal, y saber que lo aprecias tanto es la mejor recompensa. ¡Gracias por confiar en Woodabu!"

## 4 Stars — Variation A
"¡Gracias por tu valoración, [nombre]! Nos encanta que disfrutes de tu pieza de madera maciza. Si hay algo que podamos mejorar, no dudes en escribirnos — en Woodabu siempre buscamos la excelencia artesanal. ¡Un saludo!"

## 4 Stars — Variation B
"Gracias, [nombre]. Valoramos mucho tu opinión y nos alegra que tu experiencia con Woodabu haya sido positiva. Si hay algún detalle que podamos perfeccionar, estamos a tu disposición. ¡Gracias por elegirnos!"

## 3 Stars — Variation A
"Gracias por tu feedback, [nombre]. En Woodabu nos tomamos cada opinión muy en serio. Nos encantaría saber más sobre tu experiencia para poder mejorar. ¿Podrías escribirnos a [email/contacto]? Queremos asegurarnos de que tu mueble artesanal cumple todas tus expectativas."

## 1-2 Stars — Variation A
"Lamentamos que tu experiencia no haya sido la que esperabas, [nombre]. En Woodabu cuidamos cada detalle de nuestros muebles artesanales y queremos resolver cualquier incidencia. Por favor, contáctanos directamente en [email/teléfono] para que podamos atenderte personalmente. Tu satisfacción es nuestra prioridad."

## 1-2 Stars — Variation B
"[Nombre], sentimos mucho leer esto. No es la experiencia que queremos para nuestros clientes. Nos gustaría conocer los detalles y buscar una solución. ¿Podrías contactarnos en [email/teléfono]? Nuestro equipo te atenderá de forma prioritaria."
```

- [ ] **Step 3: Respond to all pending reviews**

Go through ALL unresponded reviews in GBP. Respond using the templates above, personalizing each one with the reviewer's name and specific product/service mentioned.

- [ ] **Step 4: Commit templates**

```bash
git add data/templates/review-responses.md
git commit -m "feat(seo): add GBP review response templates with keyword-rich variations"
```

---

## Task 8: GBP — Posts Calendar & Photo Plan

- [ ] **Step 1: Audit competitor GBP posts**

Check the GBP posts section for 3-4 competitors. For each, note:
- Number of posts in last 90 days
- Post types (What's New, Event, Offer)
- Whether they include images and CTAs
- Posting frequency

Most competitors likely don't post at all — this is the opportunity.

- [ ] **Step 2: Create 8-week GBP post calendar**

Create file `data/templates/gbp-post-calendar.md` with 2-3 posts per week:

```markdown
# Woodabu — GBP Post Calendar (8 Weeks)

## Week 1
- Mon: [What's New] Pieza terminada del mes — foto del producto final + "Hecho a mano en nuestro taller de Alcobendas"
- Thu: [What's New] Behind-the-scenes — foto del proceso artesanal + "Así nace un cabecero de madera maciza Woodabu"

## Week 2
- Mon: [Offer] Producto destacado — best seller con CTA "Visita nuestra tienda online"
- Thu: [What's New] Colección Pure Oceans — "Muebles fabricados con redes de pesca recicladas del océano"
- Sat: [What's New] Entrega/cliente satisfecho (con permiso) — "Otro hogar con alma Woodabu en Madrid"

## Week 3
- Mon: [What's New] Detalle de madera — macro del grano/veta + "Cada pieza de madera maciza es única"
- Thu: [What's New] El taller — foto del equipo trabajando + "Ebanistas profesionales en Alcobendas"

## Week 4
- Mon: [What's New] Mesa extensible en acción — abierta vs cerrada + "Mesas extensibles de madera maciza para toda la familia"
- Thu: [What's New] Colección Zero Waste — "Madera recuperada, diseño con segunda vida"

## Week 5-8
(Repetir el patrón: producto, proceso, colección, entrega, detalle.
Adaptar temas a estacionalidad: primavera = renovación del hogar, terrazas)
```

Each post must:
- Include at least 1 keyword naturally (muebles artesanales, madera maciza, Madrid, Alcobendas)
- Have a high-quality photo (no stock)
- Include a CTA button (Book, Learn More, Call, Order Online)

- [ ] **Step 3: Create photo plan checklist**

Add to the same file a weekly photo shooting checklist:
- 1 producto terminado (fondo neutro, luz natural)
- 1 proceso artesanal (taller, herramientas, manos trabajando)
- 1 detalle de madera (grano, vetas, acabados)
- 1 entrega/instalación en casa de cliente (con permiso)
- 1 equipo/taller ambiente

- [ ] **Step 4: Commit calendar**

```bash
git add data/templates/gbp-post-calendar.md
git commit -m "feat(seo): add 8-week GBP post calendar and photo plan"
```

---

## Task 9: Keyword Research

**Tools:** Google Search Console (data export), Ubersuggest or SE Ranking (freemium)

- [ ] **Step 1: Extract Search Console keyword data**

Export all queries from Search Console (last 3 months). Sort by impressions. Identify:
- **Low-hanging fruit:** Keywords in positions 5-20 with 50+ monthly impressions — these are closest to page 1 / top 3
- **High-impression/low-CTR:** Keywords with lots of impressions but CTR < 2% — these need better meta titles/descriptions
- **Already winning:** Keywords in positions 1-3 — protect these, don't break what works

Create a spreadsheet with columns: Query, Clicks, Impressions, CTR, Position, Category (low-hanging/high-imp-low-ctr/winning), Action.

- [ ] **Step 2: Run keyword research in Ubersuggest**

Sign up for Ubersuggest (free tier: 3 searches/day) or SE Ranking (trial).

Research each cluster from the spec and record monthly search volume:
- "cabecero madera maciza", "cabecero madera", "cabeceros de cama madera"
- "mesa extensible madera", "mesa extensible madera maciza", "mesa comedor madera maciza"
- "muebles sostenibles", "muebles ecológicos", "muebles artesanales"
- "muebles a medida Madrid", "muebles madera Madrid"
- "muebles madera reciclada", "muebles zero waste"
- Long-tail variations that Ubersuggest suggests

Update the keyword cluster table in the spec with actual volumes.

- [ ] **Step 3: Competitor gap analysis**

In Ubersuggest or Ahrefs Webmaster Tools, enter competitor domains one by one:
- hannun.com
- decowood.com
- muebleslufe.com
- wood-stock.es

For each, export their top organic keywords. Identify keywords where they rank in top 20 but woodabu.com doesn't appear at all. Filter for relevance (ignore "muebles baratos", "IKEA", etc.).

Create a "keyword gaps" tab in the spreadsheet.

- [ ] **Step 4: Prioritize keywords**

Combine Search Console data + Ubersuggest volume + gap analysis. Score each keyword cluster:
- Volume × relevance × competition difficulty = priority score
- Group into: Quick Win (optimize existing page), New Content (create blog article), Product Page (optimize product listing)

- [ ] **Step 5: Save keyword research and commit**

Save the keyword spreadsheet summary as `data/seo-keyword-research.md`. Commit.

```bash
git add data/seo-keyword-research.md
git commit -m "docs(seo): add keyword research results with cluster prioritization"
```

---

## Task 10: On-Page Optimization — Product Pages

**Tools:** Shopify Admin, Screaming Frog export from Task 1

- [ ] **Step 1: Create meta title/description templates**

Using keyword research from Task 9, create optimized meta titles and descriptions for all 59 product pages. Save as `data/seo-product-meta-optimization.md`.

Format per product:
```markdown
### Cabecero Tulum
- **Current title:** [from Screaming Frog export]
- **New title:** Cabecero Tulum de Madera Maciza Artesanal | Woodabu (54 chars)
- **Current description:** [from Screaming Frog export]
- **New description:** Cabecero Tulum hecho a mano en madera de castaño. Diseño exclusivo, acabados naturales, garantía de por vida. Envío gratis a toda España. (142 chars)
- **Target keyword:** cabecero madera maciza
- **Alt text for main image:** Cabecero Tulum de madera maciza de castaño, diseño artesanal con textura natural
```

Prioritize: best sellers first, then by search volume of target keyword.

- [ ] **Step 2: Apply meta optimizations in Shopify (batch 1: top 15 products)**

In Shopify Admin → Products → Edit each product:
- Update SEO title
- Update SEO description
- Update main image alt text
- Verify H1 is correct (Shopify uses product title as H1)

Start with the 15 highest-priority products (best sellers + highest search volume keywords).

- [ ] **Step 3: Apply meta optimizations in Shopify (batch 2: remaining 44 products)**

Continue with the remaining products. Same process.

- [ ] **Step 4: Optimize collection pages**

For each collection page (cabeceros, mesas extensibles, mesas de comedor, espejos, etc.):
- Write unique meta title with keyword (e.g., "Cabeceros de Madera Maciza Artesanales | Woodabu")
- Write unique meta description (150-160 chars)
- Verify the collection has a descriptive text block (not just products) — add one if missing

- [ ] **Step 5: Enrich product description body copy (top 15 products)**

For the top 15 products (best sellers + highest search volume keywords), write or expand the product description body in Shopify Admin. Each description should be 300-500 words following this structure:

1. **Opening hook** with primary keyword (1-2 sentences)
2. **Key features** — design, dimensions, customization options
3. **Materials + certifications** — wood type, FSC certification, natural finishes
4. **Care instructions** — how to maintain the piece
5. **Sustainability story** — connection to Woodabu's mission, Tree Nation partnership

Reference `skills/woodabu-brand.md` for tone (benefit hierarchy pyramid: lead with artisan hook, support with sustainability, close with trust).

Each description must be unique — no duplicated boilerplate between products.

- [ ] **Step 6: Commit optimization document**

```bash
git add data/seo-product-meta-optimization.md
git commit -m "docs(seo): add product and collection page SEO optimization map"
```

---

## Task 11: Internal Linking Architecture

**Tools:** Screaming Frog data (orphan pages), Shopify Admin

- [ ] **Step 1: Map current internal linking**

Using Screaming Frog's "Inlinks" report, identify:
- Orphan pages (0 internal links) → must fix
- Pages with only 1 internal link → should add more
- Most-linked pages → understand current structure

- [ ] **Step 2: Create internal linking plan**

Create `data/seo-internal-linking-plan.md` with specific link additions:

```markdown
# Internal Linking Plan

## Product → Product (cross-sell)
- Cabecero Tulum → link to: Mesita de Noche X, Espejo Y, Cabecero Belle Ville
- Mesa Forest → link to: Banco X, Silla Y, Mesa Oasis
- [repeat for all 59 products — 2-3 related products each]

## Product → Blog
- Cabecero Tulum → "Guía para elegir cabecero de madera"
- Mesa Forest → "Guía de mesas extensibles"
- [map each product to relevant blog article]

## Blog → Product
- "Guía de mesas extensibles" → link to: Mesa Forest, Mesa Butterfly, Mesa Winblack
- [map each blog article to 2+ relevant products]

## Blog → Blog (within cluster)
- [map once topic clusters are defined in Task 13]

## Orphan pages to fix
- [list from Screaming Frog]
```

- [ ] **Step 3: Implement priority links in Shopify**

Start with product descriptions: add "También te puede interesar" or "Combina con" sections linking to related products.

Add blog links where natural in product descriptions (e.g., "Descubre cómo elegir el cabecero perfecto en nuestra guía").

- [ ] **Step 4: Commit linking plan**

```bash
git add data/seo-internal-linking-plan.md
git commit -m "docs(seo): add internal linking architecture plan"
```

---

## Task 12: Blog Audit — Optimize Existing Articles

**Tools:** Browser, Shopify Admin (Blog editor)

- [ ] **Step 1: Audit all 13 existing blog articles**

For each article, check and record:

| Article | Target Keyword? | Meta Title OK? | Meta Desc OK? | H1 OK? | Internal Links to Products? | Internal Links to Blog? | Alt Text? | CTA? |
|---|---|---|---|---|---|---|---|---|
| [title] | yes/no/unclear | yes/no | yes/no | yes/no | count | count | yes/no | yes/no |

Save as `data/seo-blog-audit.md`.

- [ ] **Step 2: Identify articles to optimize vs create**

From the audit:
- **Optimize:** Articles that cover a useful topic but lack SEO basics (keywords, meta, links). Especially "Guía definitiva para elegir una mesa extensible..." — this should become the pillar article for the mesas extensibles cluster.
- **Leave:** Articles that are brand/storytelling focused and don't need SEO treatment
- **Create:** Topics from the keyword research that no existing article covers

- [ ] **Step 3: Optimize top 3 priority articles**

For each priority article, update in Shopify blog editor:
- Add/fix meta title with target keyword (< 60 chars)
- Add/fix meta description with keyword + hook (< 160 chars)
- Ensure single H1 with keyword
- Add 2+ internal links to relevant products
- Add 1+ internal link to related blog article
- Fix image alt text
- Add CTA at bottom (button to relevant product/collection)

- [ ] **Step 4: Commit blog audit**

```bash
git add data/seo-blog-audit.md
git commit -m "docs(seo): add blog article audit results and optimization priorities"
```

---

## Task 13: Blog Content Strategy — Topic Clusters & Calendar

- [ ] **Step 1: Finalize topic cluster map**

Using keyword research from Task 9, create the definitive topic cluster map in `data/seo-content-strategy.md`:

```markdown
# Content Strategy — Topic Clusters

## Cluster 1: Mesas Extensibles
- **Pillar:** Guía completa de mesas extensibles de madera maciza (OPTIMIZE existing article)
- **Satellite 1:** Tipos de madera para mesas de comedor (CREATE)
- **Satellite 2:** Mesa extensible vs fija: cuál elegir (CREATE)
- **Satellite 3:** Cómo cuidar una mesa de madera maciza (CREATE)
- **Satellite 4:** Qué medida de mesa necesito según comensales (CREATE)
- **Target keywords:** mesa extensible madera maciza, mesa comedor madera, tipos madera muebles

## Cluster 2: Cabeceros
- **Pillar:** Cabeceros de madera: estilos, materiales y cómo elegir (CREATE)
- **Satellite 1:** Cabecero madera maciza vs tablero (CREATE)
- **Satellite 2:** Cómo decorar tu dormitorio con madera natural (OPTIMIZE existing)
- **Satellite 3:** Tendencias en cabeceros 2026 (CREATE)

## Cluster 3: Sostenibilidad
- **Pillar:** Muebles sostenibles: qué son y cómo identificarlos (OPTIMIZE existing)
- **Satellite 1:** FSC vs PEFC: diferencias que importan (CREATE)
- **Satellite 2:** Greenwashing en muebles: cómo detectarlo (CREATE)
- **Satellite 3:** La madera puede salvar vidas (OPTIMIZE existing)

## Cluster 4: Decoración con Madera
- **Pillar:** Decorar con madera natural: guía por estancias (CREATE)
- **Satellite 1:** Decoración sostenible para salones (OPTIMIZE existing)
- **Satellite 2:** 10 ideas para personalizar tu casa con madera (OPTIMIZE existing)
- **Satellite 3:** Combinar madera con otros materiales (CREATE)
```

- [ ] **Step 2: Create 8-week editorial calendar**

Starting from current date, plan 1 article/week for 8 weeks:

```markdown
## Editorial Calendar

| Week | Date | Article | Type | Cluster | Content Mix |
|---|---|---|---|---|---|
| 1 | [date] | OPTIMIZE: Guía mesas extensibles (expand to pillar) | Pillar | Mesas | SEO |
| 2 | [date] | OPTIMIZE: Decoración sostenible para salones | Satellite | Decoración | SEO |
| 3 | [date] | CREATE: Cabeceros de madera — estilos y cómo elegir | Pillar | Cabeceros | SEO |
| 4 | [date] | CREATE: Así nace un mueble Woodabu — del tronco a tu casa | Story | Brand | Storytelling |
| 5 | [date] | OPTIMIZE: Muebles sostenibles — qué son realmente | Pillar | Sostenibilidad | SEO |
| 6 | [date] | CREATE: Tipos de madera para mesas de comedor | Satellite | Mesas | SEO |
| 7 | [date] | CREATE: Decorar con madera natural por estancias | Pillar | Decoración | SEO |
| 8 | [date] | CREATE: Renueva tu terraza esta primavera con madera natural | Seasonal | Spring | Seasonal |
```

**Monthly mix:** Following spec Section 6.3: ~2 SEO pillar/satellite + 1 brand/storytelling + 1 seasonal/general per month.

**Seasonal note:** Current date is March 2026 — Spring renovation peak is NOW. Weeks 7-8 include Spring-relevant content. Adjust future months to target September (back-to-routine) 6-8 weeks ahead.

Prioritize: optimize existing articles first (weeks 1, 2, 5), then create new ones.

- [ ] **Step 3: Create content brief template**

Create `data/templates/seo-content-brief-template.md`:

```markdown
# Content Brief: [Article Title]

## SEO
- **Target keyword:** [primary keyword]
- **Secondary keywords:** [2-3 secondary/long-tail]
- **Search volume:** [monthly volume]
- **Current competition:** [who ranks in top 5?]
- **Target URL:** /blogs/noticias/[slug]

## Content
- **Type:** Pillar / Satellite
- **Cluster:** [which cluster]
- **Word count target:** [2000+ for pillar, 800-1200 for satellite]
- **Outline:**
  - H1: [title with keyword]
  - H2: [section 1]
  - H2: [section 2]
  - ...

## Internal Links (required)
- Link TO products: [product 1 URL], [product 2 URL]
- Link TO blog: [related article URL]
- Link FROM (update these articles to link here): [article URLs]

## CTA
- Primary: [link to relevant product/collection]
- Secondary: [newsletter signup / contact]

## Images
- Hero image: [description]
- In-body images: [descriptions with alt text]

## Brand Voice Check
- Reference: skills/woodabu-brand.md
- Tone: [paz/tranquilidad/fuerza — which fits this topic?]
- Lead benefit: [which benefit from the hierarchy?]
```

- [ ] **Step 4: Map differentiating content to calendar slots**

The spec (Section 6.5) identifies assets competitors cannot replicate. Map each to specific content types:

| Differentiator | Article / Content Type | Calendar Slot |
|---|---|---|
| Real artisan process | "Así nace un mueble Woodabu" — step-by-step from log to delivery | Monthly storytelling slot |
| Founder story | Kiko as forest engineer, grandmother naming, Béjar origin | Quarterly brand piece |
| Pure Oceans collection | "De redes de pesca fantasma a tu espejo" — the Pure Oceans story | Monthly storytelling slot |
| Zero Waste collection | "Madera con segunda vida" — reclaimed wood design | Monthly storytelling slot |
| Real data / social proof | "300+ familias confían en Woodabu" — customer stories | Quarterly brand piece |

These feed into the storytelling/brand monthly slots in the editorial calendar.

- [ ] **Step 5: Create standalone per-article SEO checklist**

Create `data/templates/seo-article-checklist.md`:

```markdown
# SEO Article Publication Checklist

Use this checklist BEFORE publishing any blog article on Shopify.

## URL & Meta
- [ ] URL is clean with target keyword: `/blogs/noticias/[keyword-slug]`
- [ ] Meta title includes keyword at start (< 60 chars)
- [ ] Meta description includes keyword + hook (< 160 chars)

## Content Structure
- [ ] Single H1 with primary keyword
- [ ] H2/H3 headings include secondary/long-tail keywords
- [ ] Word count meets target (2000+ pillar, 800-1200 satellite)

## Internal Links
- [ ] At least 2 links to relevant product pages
- [ ] At least 1 link to another blog article (same cluster)
- [ ] If this is a satellite, links to its pillar article

## Images
- [ ] All images have descriptive alt text with natural keyword
- [ ] Images are WebP format and compressed
- [ ] Hero image is relevant and high-quality

## Brand Voice
- [ ] Tone aligns with `skills/woodabu-brand.md`
- [ ] Communicates paz, tranquilidad, or fuerza
- [ ] Uses correct benefit hierarchy level for the content type

## CTA
- [ ] Clear CTA present (view product, request quote, contact)
- [ ] CTA links to relevant product or collection page

## Final
- [ ] Proofread for typos and grammar
- [ ] Scheduled publish date aligns with editorial calendar
```

Reference this checklist in the content brief template.

- [ ] **Step 6: Define content workflow ownership**

Create a "Content Workflow" section in `data/seo-content-strategy.md`:

```markdown
## Content Workflow

| Step | Owner | Tool | SLA |
|---|---|---|---|
| 1. Create content brief | [TBD — assign before Phase 4] | `/seo content-brief` command | 1 day before draft |
| 2. Write draft | [TBD — AI-assisted or human writer] | `/seo blog-post` + manual editing | 2-3 days |
| 3. Brand review | Kiko / [TBD reviewer] | Manual review vs `skills/woodabu-brand.md` | 1 day |
| 4. SEO check | [TBD — same or different] | `data/templates/seo-article-checklist.md` | 30 min |
| 5. Publish on Shopify | [TBD] | Shopify Blog editor | Scheduled date |
```

**Action required:** Assign owners to each step before starting Week 5 execution.

- [ ] **Step 7: Commit content strategy**

```bash
git add data/seo-content-strategy.md data/templates/seo-content-brief-template.md data/templates/seo-article-checklist.md
git commit -m "feat(seo): add topic cluster map, editorial calendar, content brief template, and article checklist"
```

---

## Task 14: Create `/seo` Slash Command

**Files:**
- Create: `commands/seo.md`

- [ ] **Step 1: Create the SEO command**

Create `commands/seo.md`:

```markdown
---
name: seo
description: SEO audit, optimization, and content tools for Woodabu
---

You are managing Woodabu's SEO strategy across technical SEO, Google Business Profile, keyword optimization, and content. Reference `docs/superpowers/specs/2026-03-17-woodabu-seo-audit-design.md` for the full audit spec.

## Subcommands

### `/seo status`
Show current status of the SEO audit implementation:
- Read `data/seo-baseline.json` for baseline KPIs
- Check which tasks from the audit plan are complete
- Show progress summary

### `/seo keywords`
Analyze current keyword performance:
- Read Search Console data export from `data/`
- Identify low-hanging fruit (positions 5-20, decent impressions)
- Identify high-impression/low-CTR opportunities
- Cross-reference with keyword research in `data/seo-keyword-research.md`

### `/seo content-brief [topic]`
Generate a content brief for a blog article:
- Use template from `data/templates/seo-content-brief-template.md`
- Cross-reference with topic clusters in `data/seo-content-strategy.md`
- Include keyword data, outline, internal links, and brand voice guidance
- Reference `skills/woodabu-brand.md` for tone alignment

### `/seo blog-post [topic]`
Write a full SEO-optimized blog article:
- Generate based on content brief (run `/seo content-brief` first if none exists)
- Follow per-article SEO checklist from spec Section 6.6
- Apply brand voice from `skills/woodabu-brand.md`
- Include internal links to products and related blog articles
- Output ready to paste into Shopify blog editor

### `/seo gbp-post`
Generate a GBP post:
- Follow the calendar in `data/templates/gbp-post-calendar.md`
- Include at least 1 keyword naturally
- Suggest CTA button type
- Reference `skills/woodabu-brand.md` for voice

### `/seo review-response [rating] [reviewer-name] [context]`
Generate a personalized review response:
- Use templates from `data/templates/review-responses.md`
- Personalize with reviewer name and product/service mentioned
- Include keywords naturally (muebles artesanales, madera maciza, Madrid)

### `/seo audit-check`
Run a quick health check:
- Fetch a product page and validate: meta title length, meta description length, H1 presence, alt text on images
- Report any issues found

## Process
1. Check what data files exist in `data/` for context
2. Reference the audit spec for guidelines and standards
3. Use `skills/woodabu-brand.md` for all content generation
4. Present actionable output — not generic advice
```

- [ ] **Step 2: Commit the command**

```bash
git add commands/seo.md
git commit -m "feat(commands): add /seo slash command for SEO audit and content tools"
```

---

## Task 15: Monthly Review Setup

- [ ] **Step 1: Create monthly review checklist**

Create `data/templates/seo-monthly-review.md`:

```markdown
# SEO Monthly Review Checklist

**Month:** [YYYY-MM]
**Reviewed by:** [name]

## 1. Search Console (last 30 days vs previous 30 days)
- [ ] Total clicks: ___ → ___ (Δ ___%)
- [ ] Total impressions: ___ → ___ (Δ ___%)
- [ ] Average CTR: ___% → ___% (Δ ___pp)
- [ ] Average position: ___ → ___ (Δ ___)
- [ ] Keywords in top 10: ___ → ___
- [ ] New keywords appearing: ___

## 2. GA4 Organic (last 30 days vs previous 30 days)
- [ ] Organic sessions: ___ → ___ (Δ ___%)
- [ ] Organic revenue: €___ → €___ (Δ ___%)
- [ ] Organic conversion rate: ___% → ___%
- [ ] Organic share of total revenue: ___% → ___%

## 3. GBP (last 30 days)
- [ ] GBP impressions: ___
- [ ] Website clicks from GBP: ___
- [ ] Direction requests: ___
- [ ] Phone calls: ___
- [ ] New reviews this month: ___
- [ ] All reviews responded? [ ] Yes [ ] No
- [ ] GBP posts published this month: ___

## 4. Blog
- [ ] Articles published this month: ___ (target: 4)
- [ ] Top performing article by traffic: ___
- [ ] Worst performing article: ___ → action: ___

## 5. Milestone Check
- [ ] Compare current KPIs vs baseline (`data/seo-baseline.json`)
- [ ] Compare current KPIs vs targets (`data/seo-baseline.json` → targets)
- [ ] On track for 6-month targets? [ ] Yes [ ] No — adjustments: ___

## 6. Actions for Next Month
1. ___
2. ___
3. ___
```

- [ ] **Step 2: Commit**

```bash
git add data/templates/seo-monthly-review.md
git commit -m "feat(seo): add monthly SEO review checklist template"
```

---

## Execution Order Summary

| Week | Tasks | Type |
|---|---|---|
| **Week 1** | Task 0 (baselines + GA4 method + targets) + Task 1 (crawl + on-page audit + Ahrefs) + Task 5 (GBP categories) | Foundation |
| **Week 1-2** | Task 2 (CWV) + Task 3 (schema) + Task 4 (indexation) + Task 6 (GBP services/desc/NAP) | Technical + GBP |
| **Week 2** | Task 7 (reviews) + Task 8 (GBP posts calendar) + Task 14 (/seo command) | GBP + Tooling |
| **Week 3** | Task 9 (keyword research) | Research |
| **Week 3-4** | Task 10 (product pages + description body copy) + Task 11 (internal linking) | On-Page |
| **Week 4** | Task 12 (blog audit) | Content Prep |
| **Week 5** | Task 13 (content strategy + calendar + checklist + workflow ownership) | Content Strategy |
| **Week 5-8** | Execute editorial calendar (1 article/week using `/seo blog-post`) | Content Execution |
| **Monthly** | Task 15 (monthly review with milestone checkpoints) | Ongoing |
