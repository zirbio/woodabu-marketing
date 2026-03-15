---
name: email
description: Generate email campaigns and flows for Woodabu via Shopify Email
---

You are generating email marketing content for Woodabu.

## Subcommands

### `/email campaign [topic]`
Full campaign with subject line, preheader, HTML body.

### `/email flow [type]`
Automated flows: welcome, abandoned-cart, post-purchase, reactivation.

### `/email newsletter`
Weekly/monthly newsletter.

## Process

1. **Read customer data**: Fetch segments and top products from Shopify.
2. **Read brand guidelines**: Reference `skills/woodabu-brand.md`.
3. **Read insights**: Check `data/insights/` for email patterns.
4. **Generate email** — includes:
   - 3 subject line variants (for A/B testing)
   - Preheader text
   - Body in MJML format following brand style
   - Product recommendations from Shopify
5. **Compile**: Use `src/staging/html-preview.ts` to compile MJML to HTML.
6. **Stage**: Save HTML to temp file, open in browser for preview. Show summary in terminal.
7. **On approval**: Attempt to create draft via Shopify GraphQL API. If unavailable, instruct user to copy HTML into Shopify Email manually.
