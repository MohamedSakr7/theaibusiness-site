# Adding, updating and retiring a guide, template or tool

This is the default workflow for every future session in this repository. **A resource file/link and its name are enough: Codex handles the entire scoped job, including Notion, publishing, live testing and cleanup. No preview or approval step is required by default.** This replaces the earlier preview-first process. If the user explicitly asks for a preview, show it and honor that review boundary before publishing. An audit/advice-only request remains read-only.

**Content Assets** in **LinkedIn Content Hub** holds resource and publishing records. **Resource Signups** holds subscribers/visits, separately from the sales CRM. `catalogue.json` generates the website presentation. Reuse the existing nine published resources as examples; do not treat nine as a permanent count.

## 1. What the user supplies

**Required:** the resource's name and its PDF, Google Drive link, public Notion template link or working tool link. A name supplied in the same message as an attachment is sufficient.

**Optional:** a cover, a related LinkedIn post link or a short audience/problem note. Codex creates the Notion record and derives the rest from the actual material; the user does not need to prepare database fields.

Copy-paste message:

```text
Add this new resource end to end: <name> — <file attached or link>.
```

The equivalent “I created a new resource, here it is” plus a name/file/link triggers the same process. To request review first, add “Show me a preview before publishing.” Never ask the user for integration secrets.

## 2. Codex workflow — complete in order

1. **Check scope, access and sources.** Read this SOP, `README.md`, repository instructions, working-tree changes and the current production branch. Check the connected Notion account and availability of create/edit tools. Fetch the current Content Assets schema and existing Resource examples before writing. Current lookup hints: data source `collection://f814fbcb-2c71-4479-bc93-2bca77ad7413`; All resources view `view://a8ea1d49-80f0-4c74-87fc-e731f6b4f11c`. Revalidate them; do not infer current options from memory. Use the saved view and individual fetches if SQL/rows queries are unavailable; paginate to completion. Deduplicate by resource name, source file/tool URL and existing website slug. Reuse an existing record when the supplied item is an update.

2. **Read the actual resource and arrange public delivery.** Read the complete PDF or use the tool, including attachments it offers. Verify correct anonymous viewing and downloading, not just access through the owner's signed-in browser. For Google Drive, inspect sharing and set **Anyone with the link → Viewer** when the connected tools/account permit that change; publication of the supplied resource includes this sharing step. If unable to change it, tell the user exactly: open the file → **Share** → **General access** → **Anyone with the link** → **Viewer** → **Done**, then supply the working link. For a local PDF attachment, follow an existing public-file convention or copy the supplied PDF into a dedicated repo asset folder and publish it with the page; do not demand a separate Drive upload. Confirm anonymous access after deployment. Resolve embedding/delivery problems safely before calling the job complete. Ask only if the material is genuinely unclear, inaccessible or otherwise blocked. Do not invent contents, outcomes, testimonials, counts, dates or prices.

3. **Create or complete the Content Assets record yourself.** Use the current schema and conventions below, matching the existing resources. Create under **LinkedIn Content Hub → Content Assets**, not as a standalone page or sales CRM lead. Fill every applicable resource/publishing field; do not fabricate unrelated post analytics or write formula fields. Create the record during preparation; use truthful interim states while the file/page is not yet public. A locally attached file may require Resource status = In progress until its published file works. Do not mark the website/gate Live before it passes the live checks.

| Field | Final value after successful publication/testing |
| --- | --- |
| Name | The supplied resource name, accurately reflecting its contents. |
| Record type | Resource. |
| Resource status | Live, once the actual file/tool is publicly usable. |
| Format | Existing matching option, such as PDF guide, Template or Interactive tool. |
| Resource URL | Verified public PDF/file or working tool URL; keep it distinct from the lead-capture landing page when they differ. |
| Website status | Listed. Use Not listed during initial preparation. |
| Website URL | The live `https://theaibusiness.net/resources/<slug>/` landing page. |
| Gate URL | That same live landing page. |
| Gate status | Live. Use In progress during preparation. |
| Promoting posts | Link any related LinkedIn post supplied/mentioned by the user. Leave empty if none is known. |

For a supplied LinkedIn post, find its Content Assets Post record by exact LinkedIn URL/activity ID and link the existing record. If absent, read the post and create a factual Post record using known values, then link it through Promoting posts; avoid duplicates and leave unavailable analytics unknown. Do not publish, comment on or message anyone on LinkedIn. Preserve existing relations, notes and history. Other post-only fields can remain empty on resource records, as with the existing nine; formula values calculate automatically.

4. **Write the landing page from the resource, in the user's voice.** Use plain, specific B2B language: what it is, who it helps, what is actually inside and what the reader can do afterward. Include an H1, useful introduction, contents, audience/outcomes, 3–5 factual FAQs, 2–3 relevant live related guides/tools and a library back link. Say guide, assessment, template, toolkit or tool in public copy; Resources is the collection/navigation name. Keep substantial explanatory content readable in static HTML with JavaScript off; gate only access to the file/tool. Address real search and AI-search questions naturally, without invented claims, keyword stuffing or promises of rankings/citations. Supply unique title, meta description, canonical, Open Graph and fitting CreativeWork/SoftwareApplication plus FAQPage structured data through the existing templates.

5. **Add the catalogue entry, cover and links.** Use a complete `resources/catalogue.json` entry, a unique readable slug and `/resources/<slug>/`. Preserve existing slugs. Fill content, SEO fields, date added, type/format, manual order, actual cover dimensions/alt text, viewer/download/tool URLs, button labels and related slugs. Use a real PDF first-page cover or a screenshot of the actual tool, not a generic illustration. A supplied cover is optional. Keep the assessment first and order guides by reader task. Add useful incoming related links by updating other catalogue entries. Existing types include guide, assessment and template; add another only when appropriate. Counts, cards, filters and collection metadata must derive from the catalogue, never a hard-coded total. Public library cards link to landing pages; remembered visitors get the correct direct destination.

6. **Reuse the shared access system.** Keep Full name * and Email * required, Role and Company website optional, the newsletter consent and hidden/accessibility-hidden `website` honeypot. Company website is `company` → Notion Company; it is not the honeypot. Preserve exact frontend/backend validation, first-page attribution across internal navigation, normalized identity, per-email/resource return markers, persistent pending request IDs, latest-20 backend deduplication and acknowledgement-only completion. Keep background POSTs as plain-text JSON to the existing configured `/exec` URL, immediate inline access independent of backend success and queue sending in the main page only. PDFs need inline viewing and working download; tools must run on the page without a second contact form/email. Notion templates unlock a direct public Notion link with duplication instructions; no PDF or iframe is required. Verify anonymous guide/database access and the Duplicate entry point, and explain that saving a copy requires a Notion account. No Google Sheet, duplicate gate, new deployment or secret in the repo. If a backend contract change is genuinely required, follow `../apps-script/RELIABILITY-UPDATE.md` and deploy backend changes before the frontend using the existing deployment.

7. **Generate and test locally without a user checkpoint.** Run the builder and applicable checks below. Inspect generated output, images, metadata/schema, public content, library order/count/filters, every changed related/back link and sitemap. Compare the active catalogue with Content Assets records where Record type = Resource and Resource status = Live, accounting for the new item currently being prepared. Test desktop/mobile and both access states. Fix routine issues autonomously. Local mock tests do not prove live Notion writes. If the user explicitly requested a preview, show the concrete page and screenshot here and wait for their review/publication approval; otherwise continue straight to publishing.

```text
node scripts/build-resources.cjs
node --test tests/resource-*.test.cjs
node scripts/preview.cjs 4186 --mock-signups
```

Run backend contract tests as well if backend behavior changed. Keep runtime verification proportionate; documentation-only edits do not require a new signup audit.

8. **Publish autonomously.** The user's resource request authorizes the scoped Notion, supplied-file sharing/hosting, page/library, commit/push, live tests and disposal of this run's synthetic test data. Recheck the remote head, preserve unrelated changes, commit/push source, assets and generated pages, confirm deployment and verify the actual live HTML/assets match the intended version. Use an authenticated connected GitHub route when terminal authentication is unavailable; do not ask the user for tokens or to perform routine publishing steps. Do not expand into unrelated redesigns, infrastructure or outreach. If an external approval/access control blocks an action, explain the exact blocker; do not bypass it.

9. **Test the complete live journey.** Record pre-test signup/browser state without committing real visitor details. Use fresh unique emails such as `e2e-test+<slug>-<date>-<nonce>@example.com` and names starting **E2E TEST**. Track the exact row IDs created by this run. Verify all of the following:

   - Fresh visitor submits on the new landing page: it unlocks **on that same page immediately**, and Notion has exactly one correct row (normalized email, name, role/company, source/resource slug, channel, first/last seen and Signups = 1).
   - The correct PDF displays and downloads without signing into Google. For Notion templates, check the public guide pages, example databases and Duplicate entry point; verify the correct destination and copying instructions on desktop/mobile. For tools, finish the full flow and verify meaningful results, back/restart and mobile results; for a scored assessment, include low/high/mixed answers where applicable.
   - A repeated signup with the same email updates that row, preserves existing details/first source and does not create a duplicate. No invalid email should unlock or be remembered.
   - A remembered visitor gets direct access with no form on a new resource page, and its return is acknowledged/logged once; reopening does not send/log it again. Confirm the union of resources in Notion.
   - The new library card goes to its landing page when not remembered and the correct direct file/tool when remembered. Check filters, count, cover, related/back links, sitemap and metadata.
   - Desktop/mobile layout and keyboard/form behavior work. Inspect console and network for unexpected site/CORS errors. Investigate and safely fix failures, rerun affected checks and keep the results honest; do not dismiss an unresolved issue as a pass. Use the existing retry/error standards if shared gate/backend code changed.

10. **Clean up only your test data.** First remove pending requests for the synthetic emails so they cannot recreate deleted rows. Remove only this run's test rows from Resource Signups and verify their exact IDs are absent. Preserve every real signup and its properties; compare pre/post state, accounting for legitimate visitors arriving during testing. Clear only synthetic identity, per-email `aib.resource-returns.v2.*`, `aib.resource-pending.v1.*` and the test tab's `aib.resource-channel.v1`; restore any pre-existing browser ID/visitor state. Remove any unused test-only select options you created, but never the real new resource slug or options used by real people. Close temporary tabs, reset viewport/cache/network overrides and stop owned preview servers. Do not delete Content Assets records or source files as test cleanup.

11. **Finalize Notion and verify it.** After successful live checks and cleanup, set all applicable final values in the table above, including Website status = Listed and Gate status = Live. Read back the exact record, URLs, source and post relations; preserve unrelated fields. A failed/blocked deployment must retain truthful interim statuses. Do not make the user update the database themselves.

12. **Report briefly.** Give the live landing-page link, confirm **100% live and tested against the checks above only when every applicable check passed**, and provide a three-line summary: the Notion record created/updated; the page/library/delivery published; the live tests and test-data cleanup completed. Disclose any actual limitation or unfinished check instead of giving an absolute success claim. This is verification of the delivered workflow, not a guarantee of future uptime or search rankings.

## 3. Updating an existing guide or tool

The same autonomous process applies: read, update Notion/catalogue, build/test locally, publish, live-test, clean up and report. No preview/approval checkpoint unless requested. Do not create a duplicate record.

- **Replacement file/version:** keep the existing record and slug, read the replacement, fix/verify public sharing, update Resource URL and all affected catalogue delivery links, factual copy, page counts, cover and attachment links. Preserve signup history and manual fields. Verify the replacement views/downloads anonymously and the old links are deliberately handled.
- **Copy or title edit:** edit the catalogue, not generated HTML; use the actual material as the source. Regenerate metadata and related links, publish and check affected live behavior. Keep the slug/delivery URL unless a change is required/requested.
- **URL migration:** preserve a useful old URL through a supported redirect or clear notice, update all internal/related links, sitemap and Notion Website/Gate URLs, and test both old and new destinations. Resolve routine choices yourself; ask only if the intended resource or destination is genuinely ambiguous.

## 4. Retiring a guide or tool

A request to retire an identified item authorizes the complete retirement, with no default preview checkpoint. If identification is ambiguous, resolve it before changing records.

1. Find the exact Notion record and catalogue entry. Choose a clearly relevant replacement if one exists; otherwise use the library. Preserve the source file, Content Assets record, promoting-post relations and signup history.
2. Remove the active catalogue entry and its references in other entries' related lists; rebuild the library and affected pages so counts/filters stay accurate.
3. Handle the old URL deliberately: default to a clear retired notice with a library link and an appropriate replacement, without an active signup/download gate. Use a supported redirect when the request calls for it or it is an unambiguous replacement. Do not leave a dead-file gate or silently redirect to an unrelated tool.
4. Remove the retired page from the sitemap and handle obsolete generated HTML explicitly. The current generator adds sitemap entries; it does not automatically remove old entries/files. Check old URLs and all remaining related links; do not create unintended orphaned download/gate pages.
5. Publish and test the live library, count, filters, old URL, replacement/back links and desktop/mobile view. Apply any requested preview boundary; otherwise do not wait for another approval.
6. Update Notion yourself: **Resource status = Retired**, **Website status = Not listed**, **Gate status = Not needed**, clear **Gate URL**. Keep Website URL only if it points to the deliberate retired notice/replacement; otherwise clear it. Preserve Resource URL, post relations and history. Read back, clean up any synthetic test data and report the outcome.

## 5. Access limits and when to ask

The current connection exposes Notion create/edit operations and can access Content Assets; recheck each session. Reconnection/re-sharing may be required if the connector is disconnected, its account/workspace changes, permissions are revoked or the database moves outside accessible scope. Tool availability alone is not proof that a particular write succeeded: verify actual results. SQL/rows lookup allowances may be limited even while create/edit and saved-view reads remain available; use the working lookup route rather than asking the user to maintain records. Drive ownership/organization policy, GitHub access or tool availability can also block publication/sharing.

Only stop dependent work for a real blocker: inaccessible file/sharing you cannot change, unclear material/identity, missing access, or a failing test you cannot safely resolve. Continue independent work and ask one focused question with exact required clicks/actions. Routine copy, cover, slug, catalogue order, Notion fields and deployment choices are Codex's work. Do not ask for permission merely because this workflow publishes; the resource request plus these instructions supplies that authorization within scope. Higher-priority platform controls still apply and must be explained if they intervene.

## 6. Before saying “done”

- [ ] Resource file/link and name identified; duplicates avoided; actual content and anonymous delivery verified.
- [ ] Correct Content Assets record created/updated by Codex; all applicable final resource/website/gate fields and supplied post relations read back.
- [ ] Real cover, useful public copy/FAQ, metadata, catalogue, library card, count/filters, sitemap and related/back links correct.
- [ ] Applicable local checks pass; correct commit is deployed and verified live.
- [ ] Signup unlocks inline; file downloads/views anonymously or tool finishes; Notion row/upsert and once-only remembered access verified.
- [ ] Signed-out and remembered library card, desktop/mobile, form/keyboard, console and CORS checks pass; no unresolved failure hidden.
- [ ] Only this run's test rows/options/browser data removed; real signup data and prior browser state preserved; cleanup verified.
- [ ] Any explicitly requested preview/review boundary was honored; no extra approval was imposed by default.
- [ ] Final reply gives the live link, an evidence-based live/tested confirmation and a three-line summary, with any blockers/limits stated honestly.

For an audit or documentation-only task, mark publication/integration checks not applicable rather than implying new live tests were run. If blocked or awaiting an explicitly requested review, say so; do not report “done” or “100% live and tested.”
