# Adding, updating and retiring a guide or tool

This is the workflow for The AI Business Resources library. **Content Assets** holds the material and publishing records; **Resource Signups** holds form submissions and remembered visits, separately from the sales CRM. The website catalogue generates the public presentation. A resource can be ready as a file while its website page is still awaiting approval.

## 1. Your preparation

**Required:** create or complete one entry in Notion **Content Assets**:

| Field | What to enter |
|---|---|
| Name | The guide/tool's name. |
| Record type | Resource. |
| Resource status | Live, when the actual file/tool is ready to share. |
| Format | PDF guide or Interactive tool, as appropriate. |
| Resource URL | The final PDF or working tool link. For Google Drive, use “Anyone with the link” → Viewer. It must open without signing into your account. |

**Optional:** link relevant posts in **Promoting posts**, add a short note about the intended reader/problem, or supply an existing cover image. A PDF cover can be made from its first page, so you do not need to prepare one. For a tool, Codex can capture its real interface. Posts are helpful but not required.

Leave the website/gate fields alone; Codex updates them after publication and live testing. Do not put any integration secret in Notion notes, chat or the website repo.

## 2. The message to send

```text
Add a new resource: <exact Name from Notion Content Assets>.
```

If names are ambiguous, include the Notion page link. Codex will prepare a local preview. After reviewing it, you can say:

```text
Approve the preview — publish it and finish the live checks.
```

## 3. Codex workflow — follow in order

1. **Establish the source and scope.** Read this SOP and the README. Check repo instructions, working-tree changes and the current production branch. Fetch the current Content Assets schema and identify the exact Resource record; deduplicate by record/file URL as well as name. Read its Name, Format, Resource URL, page body and all linked Promoting posts. Do not infer current fields from old memory.
2. **Read and verify the material.** Download/read the actual PDF or inspect/use the tool. Verify anonymous viewing and download access, including any additional attachment offered on the page. Confirm that the tool can run in the page; if embedding is blocked, resolve the delivery method before calling it complete. If the source cannot be accessed, explain the missing item and request only what is needed. Do not invent contents, counts, claims, outcomes, testimonials or results. Label fictional examples and dated prices accurately.
3. **Write the page in the user's voice.** Use plain, direct B2B language: what it is, who it helps, the actual contents and what the reader can do afterward. Include a specific H1, introduction, contents, audience, outcomes, 3–5 useful FAQs and 2–3 relevant live pages plus the library link. Say guide, assessment, toolkit or tool in public copy. Real explanatory content must be in static HTML; only access to the file/tool is gated. Address the problem people search/ask AI about without keyword stuffing or promises of ranking/citation.
4. **Add the catalogue entry.** Copy a complete entry in `resources/catalogue.json`. Use a unique, readable slug and `/resources/<slug>/` page URL; keep existing slugs stable. Supply the content, SEO title, meta description, date added, type/format, manual order, real cover/alt text, delivery/viewer/download URLs, labels and related slugs. PDF guides use `type: guide`; this assessment uses `type: assessment`. Add another type only for a genuinely different format. For a tool, use a real screenshot; for a PDF, render its actual first page. Do not use a generic illustration or stretch/crop away essential cover content. Keep the assessment first, then place guides by reader task, not the date they were entered. Add useful incoming related links by editing other entries in the same catalogue when appropriate.
5. **Reuse the existing access system.** Keep one shared form: Full name * and Email * required; Role and Company website optional; newsletter consent; invisible, accessibility-hidden honeypot. A company URL stays in `company` → Notion `Company`; the `website` field must stay empty. Keep the existing field limits, storage keys, captured channel, plain-text JSON background POST and once-per-browser return logic. Unlock inline immediately, independently of backend success. PDFs need an inline viewer and Download PDF; the assessment/tool must run on the same page without a second signup or download email. No Google Sheet, new backend, duplicated gate or repo secrets.
6. **Generate and verify locally.** Run the commands below. The builder creates the landing page, library, counts, filters, metadata/schema and sitemap additions. Inspect the generated output rather than hand-editing it. Compare the entire active catalogue/library set with Content Assets records where Record type = Resource and Resource status = Live; account for any specifically approved pending/retiring entry. Check titles, descriptions, real covers, order, duplicate slugs/files, public landing-page links, remembered direct destinations, related/back links, sitemap entries and all linked files/images. Test both library states and pages on desktop and mobile. Counts and assertions must derive from the catalogue, never a hard-coded library total.

```text
node scripts/build-resources.cjs
node --test tests/resource-gate.test.cjs tests/resource-library.test.cjs tests/resource-viewer.test.cjs
node scripts/preview.cjs 4186 --mock-signups
```

7. **Show the preview and get approval.** Share the local library/page links, final title/meta description, source limitations and a screenshot. Explain any change beyond the requested entry. `--mock-signups` simulates local signup success without touching Notion; do not report it as a live integration test. Wait for approval before pushing/publishing the changes; local commits may record draft work without changing production. Approval for the reviewed result covers the remaining publish/test/cleanup/readiness steps; do not ask for each separately.
8. **Publish.** Recheck the remote head, preserve unrelated work, commit/push the approved source, assets and generated output, and confirm GitHub Pages deployment success. Use the connected GitHub channel if terminal authentication is unavailable; do not request or expose tokens unnecessarily. Verify the actual production source has the reviewed changes before testing.
9. **Run real live checks.** Use a new synthetic test email, for example `test+<slug>-<date>@theaibusiness.net`. Submit through the new landing page: it must open inline immediately and create exactly one row in **Resource Signups** with the right First source, Resources taken, normalized email and Company website value. Open a second page as the remembered visitor; it must skip the form, open inline and add its slug once. Open it again and verify no repeated automatic return. Re-submit the same email, including different capitalization: update the same row and preserve existing details. Test the library form if changed (source `library`, empty resource), every affected direct button/viewer/download, desktop/mobile layout, console and CORS. Keep the live/local evidence distinct.
10. **Clean up.** Remove only the synthetic rows created in **Resource Signups** for this run and verify they are absent from the active database. Remove pending requests for the test emails before deleting their rows, so a later retry cannot recreate them. Clear only test identity, per-email `aib.resource-returns.v2.*` markers, test `aib.resource-pending.v1.*` entries, and the test tab's `aib.resource-channel.v1` session attribution. Restore any pre-existing visitor/browser-ID state; never discard real visitors' pending requests. Close temporary test tabs, reset viewport overrides and stop owned preview servers when the review/testing no longer needs them. Do not delete Content Assets records, real signup history or resource tags/options.
11. **Update Content Assets after successful publication/testing.** Set only **Website status = Listed**, **Website URL = the landing page**, **Gate URL = the same landing page**, and **Gate status = Live**. Fetch/read back and verify those values, comparing other properties to confirm they stayed intact. Preserve Promoting posts, source URL, notes and other fields unless their change was explicitly part of an update/retirement request. Do not mark a local-only or failed deployment Live.
12. **Report plainly.** Give the live library/page links, what changed, source limitations, actual test results, cleanup and Notion update confirmation. Disclose anything not checked, failed or blocked. Do not claim new search rankings or AI recommendations without measuring them.

## 4. Updating an existing guide or tool

- **New file/version:** keep the existing record and slug unless this is genuinely a different guide. Read the replacement, check anonymous access, update all catalogue delivery URLs and any changed claims/page counts, and replace the cover if needed. If the user has not already updated Notion's Resource URL, synchronize that field to the approved replacement after publication as part of the explicit replacement request. Preserve signup history and the existing email/upsert rules. Preview, get approval, publish, live-test and clean up as above.
- **Page/copy edit:** edit the catalogue entry, not its generated HTML. Check the new wording against the actual material; regenerate affected pages, metadata and related links. Preview and obtain approval before publication. Keep the slug and delivery URL unless their change is requested.
- **Title change:** update the display/SEO wording as appropriate while keeping the slug stable. A deliberate URL migration needs an approved old-URL plan and updates to all internal links and Notion URL fields.

## 5. Retiring a guide or tool

1. Confirm which record is being retired and whether a replacement should be recommended. Prepare the complete retirement locally for review; do not delete the source file or Notion record.
2. Remove its active catalogue entry and references from other entries' related lists. Rebuild the library and affected pages. Counts/filters adjust automatically.
3. **Handle the old URL explicitly.** Default to a clear retired notice, a library link and an appropriate replacement link, with no active signup/download gate. If a redirect is preferred, agree that behavior in the preview and implement a method supported by the static site. Do not leave a working-looking gate pointing to a dead file.
4. Remove the old entry from `sitemap.xml`. The current builder **adds** sitemap URLs and does not delete obsolete HTML or sitemap entries automatically; inspect and handle both explicitly. Check there are no dangling related links or unintended orphaned download pages. Update active-slug regression expectations only for the specifically approved retirement; preserve unrelated checks and useful old URLs.
5. Show the removal/old-URL preview, wait for approval, publish and verify the live library, count, filters, old URL and replacement links.
6. Then set **Resource status = Retired**, **Website status = Not listed**, **Gate status = Not needed**, and clear **Gate URL**. Keep Website URL if it points to the deliberate retired notice/replacement; clear it if no website page remains. Preserve Resource URL, Promoting posts and historical signup data. These retirement-specific fields are explicitly part of the retirement workflow; do not change unrelated records/properties.

## 6. Before saying “done”

- [ ] Source record and actual material read; facts and anonymous sharing verified.
- [ ] Catalogue and active live Notion set reconciled; no missing, duplicated or extra entries.
- [ ] Correct public copy, type, cover, order, counts, filters, both access states, related/back links and sitemap.
- [ ] Generated output checked; applicable automated checks pass; desktop/mobile preview reviewed.
- [ ] User approved this preview; correct commit deployed and verified at the live URL.
- [ ] Real signup, inline unlock, remembered visit, once-only return, Notion upsert and file/tool access verified; no site console/CORS errors.
- [ ] Synthetic rows/browser state cleaned up; unrelated data preserved.
- [ ] Correct operation-specific Notion fields read back; no unrelated changes.
- [ ] Final report distinguishes verified results and any remaining limits.

If work is awaiting preview approval, report **ready for review**, not published or done. For an audit/documentation-only task, mark the publication/integration steps not applicable rather than implying they were rerun.
