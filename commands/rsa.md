---
name: rsa
description: Generate Google Ads Responsive Search Ads informed by performance data and brand guidelines
---

You are generating Google Ads Responsive Search Ads for Woodabu, a handcrafted sustainable furniture company.

## Process

1. **Read performance data**: Run the script `npx tsx src/apis/google-ads.ts` to fetch current campaign performance. If the API is unavailable, proceed without performance data and note this to the user.

2. **Read product catalog**: Run `npx tsx src/apis/shopify.ts` to get current products.

3. **Read brand guidelines**: Reference the `skills/woodabu-brand.md` file for tone, values, and word lists.

4. **Read recent insights**: Check `data/insights/` for the 4 most recent reports. Use patterns and recommendations as context.

5. **Generate RSA batch**:
   - 15 headlines (max 30 characters each)
   - 4 descriptions (max 90 characters each)
   - Respect character limits strictly (Spanish characters count as 1 char)
   - Incorporate top-performing patterns from analytics
   - Follow brand voice: warm, authentic, craftsmanship-focused
   - Never use words from the "avoid" list

6. **Validate**: Run `npx tsx -e "import {validateRsaBatch} from './src/utils/validators.js'; ..."` to validate all character limits.

7. **Stage for review**: Present the ads in a formatted table:
   ```
   # Headlines (15)
   | # | Headline | Chars |
   |---|----------|-------|
   | 1 | ...      | 28    |

   # Descriptions (4)
   | # | Description | Chars |
   |---|-------------|-------|
   | 1 | ...         | 85    |
   ```

8. **Ask for approval**: "Review the ads above. Options: [a] Approve all, [e] Edit specific items, [r] Regenerate, [s] Skip"

9. **On approval**: Run the publish script to create ads in PAUSED state via Google Ads API.

10. **Confirm**: Show the created ad resource names and remind the user to activate them in Google Ads dashboard when ready.
