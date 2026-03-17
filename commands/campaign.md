---
name: campaign
description: Load, preview, and export ad campaigns from YAML definitions
---

You are previewing and exporting a Woodabu ad campaign defined in a YAML file.

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

4. **Export**: Save the full campaign preview to `output/YYYY-MM-DD/campaign-{name}.md` using `saveOutput()` from `src/utils/exporter.ts`. Include all ad copy, targeting summary, budget, and character counts.

5. **Confirm**: Show the file path. The YAML file remains in `campaigns/` as a planning record. Remind the user to create the campaign manually on the target platform.

## Rules
- YAML files in `campaigns/` can be version-controlled and reused.
- Read `skills/woodabu-brand.md` before generating or editing ad copy.
- Use `[...text].length` for character counting (handles Spanish accented characters).
