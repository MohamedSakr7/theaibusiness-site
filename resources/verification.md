# Resource migration proof: score-your-gtm

Verified 18 October 2026 on the local preview and the live website.

Live page: <https://theaibusiness.net/resources/score-your-gtm/>

Implementation commit: `141c6e17effd4bc33e3b019489175ecc5627bf96`.
GitHub Pages deployment: [successful run 39139297787](https://github.com/MohamedSakr7/theaibusiness-site/actions/runs/39139297787).

| Check | Local browser | Live browser |
| --- | --- | --- |
| New signup | One Notion row, Signups = 1 | One Notion row, Signups = 1 |
| Repeat signup, same email with different capitalization | Same row, Signups = 2 | Same row, Signups = 2 |
| Remembered visitor | Form skipped, link immediately visible, minimal return POST, Signups = 3 | Form skipped, link immediately visible, minimal return POST, Signups = 3 |
| Further reload | No additional return POST | No additional return POST |
| Attribution | LinkedIn from utm_source | AI search from utm_source=chatgpt |
| Network | POST → redirect GET → readable JSON, HTTP 200; no preflight | POST → redirect GET → readable JSON, HTTP 200; no preflight |
| Browser console | No errors or warnings | No errors or warnings |

The saved Notion rows were read after each operation. Names and first-touch fields remained unchanged when the same email was submitted again; previously empty Role was filled. No duplicate test email rows were created.

Both temporary Notion test rows were moved to Trash after verification, and a fresh All signups query returned no active rows. Only the two resource-gate test keys were removed from the local and live test browser storage; the live form was then visible again.

Additional verification:

- 10 resource test groups passed, covering backend failures, a request that never resolves, storage denial/quota, validation, channel detection, returning visitors, public metadata/FAQ, and unchanged homepage/library/assessment/shared styles.
- 12 Apps Script offline test groups passed. The bridge's six live tests also passed earlier in step 2, confirmed in the user's execution log.
- Mobile preview tested at 390 × 844: no horizontal overflow, usable form/access button, existing mobile navigation retained.
- Resource copy, H1, overview, inside/audience lists, FAQ, metadata and JSON-LD are present in the generated HTML without relying on client-side rendering.
- Existing `/resources/`, homepage navigation, other pages, and `/score-your-gtm/` assessment content were not edited. The sitemap gained the new resource-detail URL.
- The new gate sends no email; the existing assessment application remains unchanged.

Only score-your-gtm is in the catalogue in this step. Future resources are added as catalogue entries; the build generates their pages and sitemap entries automatically.
