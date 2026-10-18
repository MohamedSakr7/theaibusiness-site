# Step 4: resource library and navigation verification

Verified 18 October 2026. Live library: <https://theaibusiness.net/resources/>.

Implementation commit: `0dd57bfa592eb9c85738efc61632bba1e677c200`.
GitHub Pages: [successful deployment 39140892228](https://github.com/MohamedSakr7/theaibusiness-site/actions/runs/39140892228).

| Check | Local browser | Live browser |
| --- | --- | --- |
| Catalogue cards | All five titles, descriptions, thumbnails and destinations checked | All five checked; all images loaded |
| Filters | Guides = 3, All = 5 | Assessments = 1, Guides = 3, Tools = 1, All = 5 |
| Library signup | New Notion row, First source = library, no resource selected, Signups = 1 | Same; channel Google from UTM |
| Remembered assessment visit | Form skipped; same row gains score-your-gtm, Signups = 2 | Same; First source stays library |
| Return to library | Access confirmation instead of form | Access confirmation instead of form; no additional signup/return POST |
| Resources navigation | Actual desktop link clicks from all existing nav pages; mobile library menu tested | Actual desktop and mobile clicks from all nine pages with nav |
| Layout | Three-column desktop grid, one-column mobile grid and form; no horizontal overflow | Same; no overflow on any of the nine pages at 390 × 844 |
| Console/CORS | No warnings/errors; plain-text POST and readable JSON redirect, no OPTIONS preflight | Same |

The Notion rows were read after library signup and after opening the assessment. Repeated navigation did not increment the count again. Both temporary test rows were moved to Trash; a subsequent All signups query returned no active rows. Only the resource visitor and return-marker test keys were removed from local/live browser storage. The optional form was then visible again, and its mobile layout was checked without another submission.

18 automated checks passed. They include immediate access during network failure, shared form and remember-code reuse, catalogue card/link generation, filters, ItemList metadata, automatic addition of a minimal future resource entry, unchanged resource-detail main content, unchanged assessment application, and exact preservation of footer/newsletter destinations.

Navigation was verified on `/`, `/about/`, `/methodology/`, `/newsletter/`, `/404.html`, both guide pages, `/resources/score-your-gtm/`, and `/resources/`. The original assessment tool has no shared site nav and was not edited.

Cards use manual order (10–50). Only score-your-gtm links to its dedicated website page. The other four keep their current Beehiiv links, represented by `pageUrl`; their full content and dedicated pages remain for step 5. No new resource detail pages were built in this step.
