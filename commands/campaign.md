---
name: campaign
description: Load and deploy ad campaigns from YAML definitions
---

You are deploying a Woodabu ad campaign defined in a YAML file.

## Subcommands

### `/campaign load [file]`
Load and preview a campaign YAML file. Default: `campaigns/example.yaml`.

### `/campaign list`
List all YAML files in `campaigns/`.

### `/campaign validate [file]`
Validate a YAML file without creating anything.

## Process

1. **Parse YAML**: Load the file using `parseCampaignFile()` from `src/campaigns/parser.ts`.

2. **Preview**: Format the campaign using `formatCampaignPreview()` from `src/campaigns/loader.ts`. Show the full table with character counts, targeting, and budget.

3. **Stage for review**: Convert to staged items using `loadCampaign()` from `src/campaigns/loader.ts`. Present each ad for review using `formatCampaignPreview()`.

4. **Ask for approval**: Per-ad: [a] Approve, [e] Edit, [r] Regenerate, [s] Skip.

5. **Apply decisions**: Use `applyDecisions()` from `src/staging/reviewer.ts` to filter approved ads.

6. **Create on platform** (requires `campaign_id` in YAML):
   - If `campaign_id` is missing, warn the user: "Add campaign_id to your YAML to create ads. You can find it in Meta Ads Manager or Google Ads console."
   - **Meta** (`platform: meta`): For each approved ad, map fields to `CreateAdInput` (`campaign_id` → `campaignId`, `primary_text` → `primaryText`, `headline` → `headline`, `description` → `description`) and call `MetaClient.createAdDraft()` from `src/apis/meta.ts`. All ads are created as PAUSED.
   - **Google Ads** (`platform: google_ads`): Not supported via YAML campaign definitions. YAML ads define a single headline/description per ad, but `GoogleAdsClient.createRsaAd()` requires 15 headlines + 4 descriptions + an `adGroupId`. Use the `/rsa` command instead for Google Ads RSA generation.

7. **Report**: Show created ad IDs and remind user to review in the platform's ad manager before activating.

## Rules
- All campaigns are created as PAUSED — never auto-publish.
- YAML files in `campaigns/` can be version-controlled and reused.
- Read `skills/woodabu-brand.md` before generating or editing ad copy.
- Use `[...text].length` for character counting (handles Spanish accented characters).
