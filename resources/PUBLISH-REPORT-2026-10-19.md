# Resource library: publication and affected live checks

Report date: 19 October 2026. This covers the seven approved fixes and the separately approved adjustment that lets the main page, rather than its embedded assessment, send pending requests.

## Publication

The changes were published in the requested order:

1. Added **Request IDs**, a text property, to the existing **Resource Signups** database. Hid it from **All signups** and **To review**. Preserved the original visible columns, their order, Last seen sorting and the unchecked Promote to CRM review filter.
2. Updated **Code.gs** in the existing **Resource Signups** Apps Script project. Its configuration check verified all **13 property types**. Used **Manage deployments → Edit → New version → Deploy** to update the existing deployment to **version 2**, rather than creating another deployment.
3. Pushed the website changes to the existing production branch, `main`. Main fix commit: `2371ccbe49fefb0568fbcd41862d1200c07526c1`. The separately approved iframe refinement is commit `79373c7990095711e106c3168042934820240ca9`. Both were confirmed on the live site; its HTML loads `resource-gate.js?v=6`.

The public library is <https://theaibusiness.net/resources/>. The public assessment page is <https://theaibusiness.net/resources/score-your-gtm/>.

The web app URL was checked before and after deployment and is **exactly unchanged**:

```text
https://script.google.com/macros/s/AKfycbxJiYVu-5Iii9yCnth3CA3LhHjh_ISVnM9lygX5WVsKKxV0baE0BNIs5uW7IZBYLmoP/exec
```

No integration secret was copied, changed, printed or committed. The two private Script Properties were left untouched. Notion remains the only permanent signup store; no Google Sheet was added.

## What visitors notice

- Old assessment links now lead to the proper public page and shared signup form. The assessment itself no longer collects another name/email or sends a FormSubmit email.
- An invalid email gets a clear correction message and does not unlock or get remembered.
- Valid access remains immediate, even when the background service fails or is slow. Failed requests stay in that browser for a later page load.
- A second person using **Use different details** on the same browser gets their own visits recorded.
- A perfect assessment result gives improvement advice. A high overall score with a weak area names that weak area. The score calculations have not changed.
- The library fits tablet widths without sideways scrolling. The general design and contents remain the same.

Attribution and request bookkeeping happen in the background. Remembering is still browser-based access, not an account login.

## What changes in Notion

The normal two views look the same. The new hidden field holds only the **20 most recent request IDs per person**. The script saves an ID in the same write as the count; replaying an ID still in that recent list does not add another count or update Last seen.

LinkedIn attribution now survives a homepage → Resources journey. Name, Role and Company still fill only when empty. First source, First seen, Channel and manual review/notes are preserved on later updates. Resource slugs continue to accumulate.

## Affected live test results

| Fix | Result | Live evidence |
| --- | --- | --- |
| R4 — old assessment | Pass | `/score-your-gtm/` redirected to `/resources/score-your-gtm/`. Embedded mode still ran the complete assessment, had no legacy contact inputs and declared `noindex,follow` with the public landing page as canonical. |
| S1 — attribution | Pass | Opened the homepage with `utm_source=linkedin`, followed its Resources navigation and signed up. The new Notion row had Channel = LinkedIn and First source = library. |
| R1 — email validation | Pass | `bad..email@example.com` showed “Please enter a valid email address, such as name@example.com.” The page stayed locked; there was no remembered identity, pending request or new Notion row. |
| R3 — lost requests | Pass | A deliberately unreachable signup unlocked instantly and stayed queued. Reload saved it once. A resource return then saved successfully but its response was deliberately discarded: it stayed pending/unmarked, retried with the same ID, and the row stayed at Signups = 2. A direct replay test also kept the first row at Signups = 1. |
| R2 — shared browser | Pass | Used different details for a second email, then opened the same assessment. Each email had its own row, visit marker and one assessment tag. Both finished at Signups = 2; reopening sent zero additional signup/return POSTs and did not increase the count. |
| S2 — advice | Pass | Completed the live assessment at 100/100 and 89/100. The perfect result offered “Keep the parts working together” and “Run one measured experiment.” The mixed result named Getting found as the weak spot rather than claiming strength across the board. |
| S3 — tablet scroll | Pass | Both library states at viewport widths 760, 768, 820 and 1024 had identical document and available client widths: no horizontal overflow. |

The 20-ID limit was checked live with 22 accepted submissions on one test person. The row retained exactly `retention-02` through `retention-21`: 20 IDs, with the older two gone.

### Network observations and the iframe refinement

The deliberate outage and discarded-response tests produced their expected console errors. Separately, a real return produced one “Failed to fetch” and several temporary “signup service is busy” responses during repeated tests. It remained queued, later received confirmation, cleared its pending entry and stayed at the correct count. No visitor-facing error or lost access appeared. A successful browser request followed the normal POST → redirect → JSON response path, with no OPTIONS preflight.

The embedded assessment was also attempting to flush its parent's queue. The separately approved refinement stops that redundant sender; the main page continues to retry normally. **Final live recheck passed:** temporarily failed a signup on the public assessment page and let its embedded tool fully load. Access was instant, the signup remained pending, the iframe sent zero backend requests and Notion stayed empty. Reloading sent exactly two requests, both from the main page: the original queued signup and one new remembered return. They created one row with Signups = 2, two different saved IDs, First source = score-your-gtm and one assessment tag. The queue cleared and the return marker appeared only after success. Reopening sent zero further POSTs. No network failures occurred in this final recheck.

Local validation passed **38 website checks** and **12 backend test groups**. The broad original E2E audit and unrelated links/browsers were not rerun; these live checks were restricted to the affected behavior.

## File-by-file explanation

Paths below are relative to the repository root. Rebuilt pages use the shared implementation; they do not contain separate copies of the signup logic.

| File | Change and reason |
| --- | --- |
| `resource-gate.js` | One shared place for matching backend email rules, first-page attribution, per-email visit markers, persistent pending requests and acknowledgement-based retries. The embedded tool leaves sending to its parent page. |
| `resource-library.css` | Kept the decorative hero background within its horizontal bounds to remove tablet overflow. |
| `score-your-gtm/index.html` | Redirected old public links, removed old contact/FormSubmit collection, made the tool noindex/canonicalized, and corrected perfect/mixed-result advice without changing scoring. Captures attribution before redirecting. |
| `apps-script/resource-signups.gs` | Accepts request IDs, ignores recently processed IDs and stores only the latest 20 with the count. Uses the same 200-character email rule as the form and verifies the new property. |
| `templates/resource-form.html` | Set the email length limit to the shared backend limit. The existing name/email requirements, company website mapping and consent remain. |
| `templates/resource-page.html` | Loads the latest shared gate code so every generated landing page receives the fixes. |
| `templates/resource-library.html` | Loads the latest gate and tablet stylesheet. |
| `resources/index.html` | Rebuilt the library using those shared templates. Cards, filters, content and resource count were not changed. |
| `resources/score-your-gtm/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/10-ai-workflows/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/build-your-gtm-in-one-ai-workflow/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/does-chatgpt-recommend-you/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/rewrite-your-homepage-with-ai/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/prepare-sales-calls-using-ai/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/why-you-lose-deals/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/which-channels-bring-clients/index.html` | Rebuilt with the latest shared form/gate. |
| `resources/the-ultimate-future-proof-gtm-tool-stack/index.html` | Rebuilt with the latest shared form/gate. |
| `index.html` | Loads shared attribution/retry code, so a homepage arrival is remembered before navigation. |
| `about/index.html` | Loads the same code, so this can be the arrival or retry page. |
| `methodology/index.html` | Loads the same code, so this can be the arrival or retry page. |
| `guides/check-ai-visibility/index.html` | Loads the same code, so this can be the arrival or retry page. |
| `guides/ai-go-to-market-roi/index.html` | Loads the same code, so this can be the arrival or retry page. |
| `newsletter/index.html` | Loads shared attribution/retry code. Newsletter destinations were not changed. |
| `404.html` | Loads shared attribution/retry code even if the next page is a missing URL. |
| `scripts/preview.cjs` | Local preview now exercises the actual Apps Script source against simulated Notion data, so retry checks need no live credentials. |
| `apps-script/resource-signups.local.test.cjs` | Makes the offline backend simulator reusable and can simulate a response lost after a successful save. |
| `tests/resource-gate.test.cjs` | Added attribution, matching validation, persisted retry, lost response, shared-browser, concurrent-tab and iframe tests. |
| `tests/resource-assessment-reliability.test.cjs` | Checks actual advice rendering, redirects, backend replay protection and the 20-ID limit. |
| `tests/resource-library.test.cjs` | Allows the approved shared-script additions while continuing to protect page content and navigation. |
| `tests/resource-viewer.test.cjs` | Keeps public assessment-question checks working after the legacy form logic was removed. |
| `apps-script/README.md` | Explains the new field, 20-ID window and coordinated deployment. |
| `apps-script/SETUP.md` | Updates setup/schema checks, matching email limits and safe retry instructions. |
| `apps-script/RELIABILITY-UPDATE.md` | Records the backend-first deployment steps and requirement to update the existing deployment. |
| `resources/README.md` | Documents shared attribution, queue keys, per-email markers, matching validation, local preview and the bounded replay history. |
| `resources/SOP.md` | Updates test-data cleanup so pending test requests cannot recreate deleted rows and real pending requests remain untouched. |
| `AGENTS.md` | Makes future sessions preserve this contract and backend-first deployment order. |
| `resources/LIVE-E2E-REPORT-2026-10-19.md` | Saved the preceding audit that motivated these fixes; it remains a historical snapshot. |
| `resources/FIXES-PREVIEW-2026-10-19.md` | Saved the approved local-preview findings; its publication status describes that earlier point in time. |
| `resources/PUBLISH-REPORT-2026-10-19.md` | This publication, test and cleanup report. |

`resource-config.js` was unchanged: it already contained the correct public endpoint. The catalogue, resource files, covers, scoring definitions, website styling outside the tablet correction and newsletter/footer destinations were not changed.

## Cleanup and remaining limits

The starting signup dataset contained **0 rows**. **All four synthetic rows were removed to Notion Trash**, after their browser queues/markers were cleared. Both **All signups** and **To review** were queried after the final deletion and returned **0 rows**, with no further pages to retrieve. The test browser was returned to its original empty resource-storage state, the form was visible again, viewport/cache overrides were reset, temporary assessment/editor tabs were closed and the owned local preview server was stopped.

The four rows created and removed by this run were:

| Clearly marked test name | Email | Notion row ID |
| --- | --- | --- |
| E2E TEST Backend release | e2e-test+release-backend-1019@example.com | `3fecf6ad-d791-8154-9f83-e3e5a74f2de4` |
| E2E TEST Live retry | e2e-test+release-retry-1019@example.com | `3fecf6ad-d791-81f4-953a-ebeb84e40907` |
| E2E TEST Second person | e2e-test+release-second-1019@example.com | `3fecf6ad-d791-81ee-9413-cc68578d9ea0` |
| E2E TEST Iframe refinement | e2e-test+release-iframe-1019@example.com | `3fecf6ad-d791-81df-82b5-c02bdb4f1db4` |

The added hidden field and its view settings remain intentionally; “back to the pre-test state” refers to the signup data, not undoing the requested schema change. No new test select options were created: tests used existing library/assessment values. No real signup row was edited or deleted.

The Notion connector's SQL/rows query allowance was reached during verification. Checks continued successfully through the existing All signups view and individual page fetches; this did not stop signup writes or cleanup.

Two operating limits remain: duplicate protection covers the latest 20 requests, as requested, so a much older replay after 20 newer accepted requests can count again; and a browser that blocks storage cannot persist failures across page loads. Google/network service interruptions can still delay background logging while access remains available. These are disclosed limits, not guarantees of zero network errors.

**Final verdict: all seven fixes and the separately approved refinement are live; every affected test passed and cleanup is complete. No action is required from the user.** The temporary network/busy responses described above are included for transparency; the final recheck completed without them. This does not promise that Google or the visitor's connection can never fail.
