# Live resources system: end-to-end audit

**Verdict: NOT READY for a clean sign-off.** The normal signup, library, PDF and assessment journeys work, but there are confirmed gaps that can lose signup/visit information. Browser coverage is also incomplete. No website or Apps Script fixes were made during this audit.

Tested on **19 October 2026**, against **https://theaibusiness.net/** and the deployed Apps Script, with live Notion readbacks. Website revision: `56004f01e2b7376a4e266f010df616f910196b93`. Main interactive testing began around 06:05 UTC; the audit resumed later that day for final checks, evidence and cleanup. This report records the tested release, not a promise about future changes.

## 1. Results by requested section

“Partial” means a confirmed problem or a named coverage gap; it does not mean the section passed in full.

| Requested section | Result | What happened |
|---|---|---|
| 1. Every page and button | **PARTIAL** | Homepage, library, all nine landing pages, both editorial guides, methodology, about and the custom 404 were exercised. Internal links, related/back links, images, filters, expandable sections and mobile menus worked. Tablet overflow and console observations are listed below. The LinkedIn profile blocked the automated HTTP checker, so that external destination is not independently certified here. |
| 2. Every resource to the end | **PARTIAL** | All nine live landing pages unlocked inline after real form submissions. Eight correct PDFs downloaded anonymously; the extra ZIP also worked. Assessment scores, bottlenecks, restart, back and mobile result rendering worked, but some result recommendations/copy conflict with the answers. |
| 3. Signup and logging | **FAIL** | Basic creates, repeat-email updates, normalization, field preservation, races and storage failure passed. Switching people and failed background requests can leave missing visit data. |
| 4. Validation and spam | **PARTIAL** | Required-field checks, malformed request rejection, honeypot, Unicode and length boundaries passed. Some email formats pass the browser form but are rejected by the backend after access is granted. |
| 5. Channel tracking | **PARTIAL** | Direct landing attribution passed for LinkedIn, Google, all five AI providers, Direct and Other. Attribution was lost on a real homepage → Resources journey. Provider referrers were simulated as described below. |
| 6. Devices and browsers | **INCOMPLETE** | Chrome and the in-app Chromium browser were used. Desktop, tablet and phone widths and keyboard form navigation were checked. Safari/WebKit, Firefox, Edge and an actual screen reader were not available through the connected browser controls. |
| 7. Search, AI search and health | **PARTIAL** | All 15 main content pages have unique titles/descriptions, correct canonicals, valid structured data and sitemap entries. Real content remains readable without JavaScript. Robots allows crawling. The old standalone assessment URL needs an explicit indexing/routing decision. Lighthouse results are below. |
| 8. Security | **PASS within tested scope** | No recognizable Notion/GitHub tokens or private-key headers found in tracked text files or text-file Git history. Sampled browser requests contain the expected public payload and no Notion credential. Unsupported API request types and malformed payloads were safely rejected. This was not a penetration or sustained-abuse test. |
| 9. Cleanup | **PASS** | All 23 rows created by this audit were moved to Notion Trash. Active rows returned from 0 before testing to 0 after cleanup. Browser keys were restored, test-created source options were removed, and the leftover `signup-test-resource` option was removed. No real rows were changed. |

## 2. Confirmed issues and proposed fixes

These are proposals only. The production files, backend and deployment remain unchanged.

### Red flags — signup or visit data can be missing

| ID | What happens and where | Evidence | Proposed fix |
|---|---|---|---|
| R1 | **The form and backend disagree about a valid email.** On the shared library/resource gate, a single-label domain can unlock and be remembered but produce no Notion row. | `e2e-test+1019-invalid@example` unlocked the live guide. Apps Script replied `A valid email address is required.` Only the console reported the rejection; Notion had no matching row. Ordinary missing-name, missing-email and obviously malformed-email cases stayed locked. | Apply the same email rules on the form as on the backend, and show a readable field error before unlocking for invalid input. Keep immediate unlock for valid input when the network is slow or unavailable. |
| R2 | **A second person inherits the first person's “already logged” markers.** “Use different details” replaces the identity but leaves a browser-wide resource history. | Person A signed up through the library and opened all nine items. Person B then used the actual form in that browser. B's assessment opened without a form, but their row stayed at Signups = 1 with no Resources taken. | Scope automatic-return markers to the normalized email as well as resource, or otherwise reset them safely when the identity changes. Preserve once-only logging for each person. |
| R3 | **A failed background request is not recovered.** Access remains available, as required, but there is no durable pending queue. A return is marked done before its request succeeds. | A deliberately failed library-card return was not recorded. After restoring the real connection, clicking again and reloading/clicking again sent no retry; the row still lacked that resource. Simulated slow/offline signups also unlocked without being saved. | Keep access immediate, but retain pending submissions/returns and retry after recovery. Mark a return complete only after acknowledgement. Make server retries safe so a lost response cannot cause a duplicate count. |
| R4 | **The old standalone assessment has a separate contact-collection path.** `/score-your-gtm/` without `?embedded=1` still has its old name/email step and FormSubmit delivery code rather than the Notion bridge. It is indexable and lacks a canonical. | Verified the live served HTML: contact fields and `formsubmit.co/ajax/` are present; `resource-gate.js` is absent. The embedded mode correctly bypasses this old submission path. A legacy completion email was deliberately not sent. This finding is based on the live form/code, not a claimed email-delivery test. | Send standalone visitors through `/resources/score-your-gtm/`, retain the embedded quiz without its old lead form/email sender, and make the implementation URL's canonical/indexing policy explicit. All visitor contact collection should use the shared Notion flow. |

### Should fix

| ID | What happens and where | Proposed fix |
|---|---|---|
| S1 | **First-visit attribution is lost during internal navigation.** A real visit to `/?utm_source=linkedin`, followed by the Resources nav link and library signup, produced Channel = Other. The library saw the site's own homepage as its referrer. | Capture the external/UTM channel at the first site landing and carry it through internal navigation until signup. Do not replace a known external source with the site's own referrer. |
| S2 | **Some assessment advice contradicts the result.** At 100/100, with Tracking = 6/6, the next steps still say “Get everything into one view” and “Put one person's name on each number.” In the mixed test, 89/100 says “Solid across the board. What's left is fine-tuning,” while Getting found = 2/6 is identified as the bottleneck. | Add appropriate recommendations for the no-bottleneck case. Make the overall band wording acknowledge a weak individual stage rather than calling every part strong. Keep the verified numerical scoring unless a separate scoring change is approved. |
| S3 | **The public library can scroll sideways at tablet width.** With a 768px viewport, the page had a 753px content width and an 809px scroll width. Other tested pages fit at this width. | Constrain/clip the library's decorative hero glow at intermediate widths; check its negative pseudo-element insets. Re-test the page without hiding useful content or menus. |
| S4 | **The requested browser/assistive-technology coverage is unfinished.** Actual Chrome and in-app Chromium passed the exercised flows. Safari/WebKit, Firefox and Edge were not controllable in this session; spoken screen-reader behavior was not tested. | Complete genuine runs in those engines and with a screen reader before claiming full compatibility. Viewport changes and browser names in a user-agent string are not substitutes. |
| S5 | **Two transient console errors need attribution.** The long rapid-navigation test run recorded `MutationObserver` errors saying its parameter was not a Node, without an originating source URL. They were not reproduced in the separate clean public-page sweep. | Reproduce with a clean browser trace and identify whether the origin is the site's viewer, Google Drive or test instrumentation before proposing a code change. Do not treat these as a proven first-party defect without that trace. |

### Nice to have

Lighthouse suggested longer cache lifetimes, less render-blocking/unused CSS and some image-size savings. All three audited public pages already scored 98–100 for mobile performance; these are improvements, not access blockers. The homepage calendar emitted a third-party Cal.com CSS-variable reset warning, but its calendar and booking destination were usable; no booking was submitted.

## 3. Resource-by-resource results

Each landing page received a real signup and was read back in Notion. The same test person was intentionally reused on the assessment and the full-GTM guide to test updates rather than creating an extra row.

| Landing page | Inline unlock | Correct delivery | Anonymous download |
|---|---|---|---|
| `/resources/score-your-gtm/` | Pass | Embedded assessment; no second lead form | Not applicable to the quiz itself |
| `/resources/10-ai-workflows/` | Pass | Correct viewer and 10-page PDF | Pass |
| `/resources/build-your-gtm-in-one-ai-workflow/` | Pass | Correct viewer and 19-page PDF | Pass |
| `/resources/does-chatgpt-recommend-you/` | Pass | Correct viewer and 14-page PDF | Pass |
| `/resources/rewrite-your-homepage-with-ai/` | Pass | Correct viewer and 12-page PDF, plus Claude skill ZIP | Pass; ZIP also returned a valid archive |
| `/resources/prepare-sales-calls-using-ai/` | Pass | Correct viewer and 27-page PDF | Pass |
| `/resources/why-you-lose-deals/` | Pass | Correct viewer and 10-page PDF | Pass |
| `/resources/which-channels-bring-clients/` | Pass | Correct viewer and 7-page PDF | Pass |
| `/resources/the-ultimate-future-proof-gtm-tool-stack/` | Pass | Correct viewer and 17-page PDF | Pass |

The eight downloads were fetched with no Google login or cookies and checked for a real PDF signature, readable pages and the expected document content. This avoids calling a Google sign-in/error HTML page a successful download. The extra ZIP returned HTTP 200 and a ZIP signature. Google Drive viewer content was observed in the browser, including the actual document titles/pages. Not every duplicate link was manually mouse-clicked: the audit combines live browser journeys, destination checks and anonymous file fetches.

The library filters showed **All = 9, Guides = 8, Assessments = 1** and the approved order. Public listing links go to the nine landing pages; remembered cards go to the original PDFs/tool. The assessment screenshot and the eight PDF covers load correctly.

### Assessment runs

| Pattern | Expected calculation | Observed result | Assessment |
|---|---|---|---|
| Lowest available answers | 1/36, rounded to 3/100; the lowest first AI answer still earns 1 point | 3; offer bottleneck; offer-related actions | Numerical/diagnostic pass |
| Highest answers | 36/36 | 100; no clear bottleneck; six areas at 6/6 | Numerical pass; recommendations need S2 |
| Mixed, weak acquisition | Offer 6, Getting found 2, remaining areas 6: 32/36 | 89; Getting found bottleneck; acquisition-related actions | Numerical/diagnostic pass; overall band wording needs S2 |

Restart cleared all checked answers. Back retained the selected answers and business context; Continue stayed disabled until the outstanding question was answered. A further mixed run confirmed mobile output. The 390px-wide result had no horizontal overflow, reached its final Download as PDF / Start over controls and displayed the research notes at its bottom.

The tool was also completed inside the real landing-page iframe using test-controlled DOM clicks; its result was 100/100. Native iframe automation had scrolling/focus limitations, so this is not represented as a completely manual Chrome iframe run. The three main answer-pattern runs used the live embedded-mode tool directly. The assessment's Download as PDF invokes browser printing; an actual OS print/save dialog and a saved result PDF were **not** verified. The eight guide PDF downloads are separately verified above.

## 4. Signup scenarios — Notion checked after each

All created identities used `e2e-test+1019-<scenario>@example.com` and names beginning `E2E TEST`. Deliberately invalid/missing email requests never created rows. The invalid single-label email retained the same clear test prefix.

| Scenario | Result and readback |
|---|---|
| a. New resource signup | One row; correct name, normalized email, role, bare company domain, source, resource, LinkedIn channel, dates, Signups = 1; Promote to CRM false and Notes blank. |
| b. Same page again | Same row; Signups = 2. Original details and first-touch values preserved. Last seen advanced on later visits; the connector presents dates at minute precision, so this is not a millisecond-level timestamp test. |
| c. Another resource | Same row; Signups = 3; both slugs retained; original source unchanged. |
| d. Capitals and spaces | ` E2E-TEST+1019-PERSON@EXAMPLE.COM ` matched the normalized existing email. |
| e. Initially empty role/company | Blank fields were filled on the next signup. Arabic role and full company URL saved correctly. |
| f. Conflicting later details | Original name, role and company stayed unchanged. The Unicode name also survived later conflicting submissions. |
| g. New library signup | First source = library, initially no resource; Signups = 1. All nine pages then opened without a form; the same row reached Signups = 10 with all nine resource slugs. |
| h. Library signup by an existing person | No duplicate; original resource-page source and channel stayed unchanged. |
| i. Remembered new resource / reopen | First open added the slug and incremented once. Reopening the same resource did not increment again. |
| j. Second person, same browser | The “Use different details” form was reachable and created the second person's row. Their access worked, but visit logging failed for a previously claimed resource: R2. |
| k. Cleared browser storage | Form returned. Signing up with the original email updated the same row and added the new resource. This was cleared storage, not a separate incognito-engine run. |
| l. Blocked storage | A test-only throwing localStorage getter was installed. The form still unlocked the guide and created a correct row. |
| m. Visible button double-click | One row, Signups = 1. An initial automation click missed the button while scrolling; that attempt is not counted as the result. The visible-button double-click was then performed and checked. |
| n. Simultaneous tabs | Two live browser forms submitted the same new email concurrently. One row, Signups = 2. Two distinct submissions should count twice; no duplicate row appeared. |
| o. Slow/unreachable backend | A never-resolving fetch and a rejected fetch were simulated in that browser only. The valid form unlocked inline; one measured unlock took about 1.7ms, before any backend response. No user-facing error appeared. No row was expected during the simulated outage. Missing recovery is R3. |

The tests do not prove exactly-once delivery for every possible network failure. In particular, there is currently no request-id/idempotency contract for retrying an uncertain write; that is part of the R3 proposal.

## 5. Validation, spam and attribution

### Validation

- Missing name, missing email, obviously invalid email and a whitespace-only name did not unlock or create a row. Native browser validation supplies ordinary required/email messages; the whitespace-name check supplies a custom full-name message.
- A filled honeypot returned synthetic success but created/updated nothing. Its wrapper has `hidden`, `inert` and `aria-hidden=true`; its input has `tabindex=-1`. It was absent from the accessible form controls.
- `E2E TEST أحمد & Zoë 🚀`, an Arabic role, ampersands and emoji survived the real Notion round trip.
- Name, role and company values at the exact 200-character limits were saved. Oversized fields and an oversized body were rejected by Apps Script. A test-tool fill can bypass the browser's typing-length limit; this is not treated as normal visitor typing behavior.
- `example.com` and `https://example.com/team` both saved in Company as text.
- Eighteen direct POST cases covered empty/malformed JSON, arrays/null, unsupported/missing types, unexpected fields, wrong value types, missing name, invalid email, oversized values/body, unsafe source slugs, control characters, an incomplete return and the honeypot. Invalid requests produced clear JSON errors. The honeypot's fake success wrote nothing. GET returned the expected “Use POST” error. No junk row appeared.
- The form/backend email mismatch is R1. The API's rejection is safe; the form's silent unlock/remembering for that input is the problem.

### Channel readbacks

| Input at signup | Observed Notion Channel |
|---|---|
| Actual `utm_source=linkedin` on a resource landing | LinkedIn |
| Simulated `https://www.google.com/` referrer | Google |
| Simulated ChatGPT, Perplexity, Gemini, Claude and Copilot referrers, tested separately | AI search for each |
| Actual direct navigation, no referrer | Direct |
| Simulated unrelated external referrer | Other |
| Actual homepage `utm_source=linkedin` → Resources nav → signup | **Other — S1** |

For referrer cases, the browser's document referrer was replaced in a temporary test fixture, the untouched production gate code was initialized against that fixture, and the actual form submitted through the real endpoint into Notion. These prove classification plus live delivery; they do not prove which referrer each provider will send under every browser/privacy policy. No messages were sent to AI providers to manufacture referral traffic.

## 6. Pages, devices, links and search checks

The 15 main pages are homepage, library, nine resource landing pages, the two `/guides/` pages, methodology and about. Their metadata/canonicals were checked from live responses. Their structured data was checked in **Schema.org's validator: zero errors and zero warnings on all 15**. JSON parsing also passed. The assessment has CreativeWork/SoftwareApplication and FAQ markup; guides have CreativeWork and FAQ markup; the library has CollectionPage/ItemList.

`sitemap.xml` includes all 15 main pages and `robots.txt` allows crawling. JavaScript was disabled in the browser: all 15 main pages retained their real H1 and explanatory content, including the public assessment questions and all nine library entries. Interactive signup/access still requires JavaScript; no JavaScript-disabled signup claim is made.

The custom missing URL returned HTTP 404, displayed the branded recovery page and its back-to-home link worked. A noindex on a 404 is correct. `/newsletter/` has a deliberate noindex and is outside this migration step. The old `/score-your-gtm/` implementation URL is indexable without a canonical/sitemap entry; see R4 rather than treating the main assessment landing page as missing.

Across the live pages, **73 unique linked destinations/assets** were checked. There were no broken internal targets/anchors or missing page images. The apparent external exceptions were a LinkedIn HTTP 999 automation block and the bare Google Fonts preconnect origins returning 404 when fetched as pages. The latter are connection hints, not broken font-file links. LinkedIn is left unverified, not labelled a confirmed broken link.

Desktop (1440), tablet (768) and phone (390) widths were exercised on the 15 main pages plus the 404. All 57 expandable summary controls in that sweep opened with the keyboard, including the homepage deliverables/FAQs. Mobile menus opened and closed on every swept page. The homepage motion control switched off/on, the booking CTA reached the calendar, and a calendar month/date UI was observed. No booking was submitted. The only measured horizontal overflow in this sweep was the public library at tablet width (S3).

Chrome keyboard navigation went from Full name → Email → Role → Company website → submit; the honeypot was skipped. Enter submitted, unlocked, and produced a correct Notion row. Associated labels and required semantics were inspected. Actual screen-reader speech/error announcements remain unverified. An automated accessibility score is not a substitute for that check.

The normal successful signup requests used POST, `text/plain;charset=utf-8`, CORS mode and omitted credentials. Captured requests had only the expected data keys, with no Authorization header or Notion secret. No CORS failure or OPTIONS preflight appeared in the captured successful-request sample. Deliberate offline/backend-validation errors are identified separately. The clean public-page console sweep had no first-party errors; the two unassigned rapid-navigation errors and Cal warning are recorded in S5/Nice to have.

## 7. Lighthouse scores

Official PageSpeed Insights reports, Lighthouse **13.5.0**, captured 19 October 2026 around 09:16 Cairo time. Mobile is an emulated Moto G Power with slow-4G throttling. These are lab tests of the **public first-load pages**, not an unlocked Google Drive viewer or a completed assessment. PageSpeed reported no real-user field dataset for these pages.

| Page | Mobile performance | Desktop performance | Accessibility (both) | Best practices (both) | SEO (both) |
|---|---:|---:|---:|---:|---:|
| `/resources/` | **98** | **100** | **100** | **100** | **100** |
| `/resources/score-your-gtm/` | **100** | **100** | **100** | **100** | **100** |
| `/resources/10-ai-workflows/` | **100** | **100** | **100** | **100** | **100** |

- [Library report](https://pagespeed.web.dev/analysis/https-theaibusiness-net-resources/yf13w8y3s3?form_factor=mobile)
- [Assessment landing report](https://pagespeed.web.dev/analysis/https-theaibusiness-net-resources-score-your-gtm/rd635ndwm2?form_factor=mobile)
- [Guide landing report](https://pagespeed.web.dev/analysis/https-theaibusiness-net-resources-10-ai-workflows/0fz5z7lzr6?form_factor=mobile)

The direct PageSpeed API initially returned a quota error; the public PageSpeed website then completed these audits successfully. No scores have been invented or substituted from local pages.

## 8. Cleanup and evidence

- Baseline active Resource Signups rows: **0**. Before cleanup: **23**, all matched to this run's creation/readback ledger, all clearly marked. After cleanup: **0**, verified again after the option cleanup. There were no real rows in either snapshot. No Content Assets record or CRM record was changed.
- Only the 23 known created page IDs were trashed. They remain recoverable in Notion Trash; Trash was not emptied.
- Restored First source to its three pre-test options (`library`, `score-your-gtm`, `why-you-lose-deals`), removing six options automatically created solely by these tests. Real resource slugs will still be created automatically when needed.
- Removed the explicitly requested leftover `signup-test-resource` multi-select option. All nine genuine resource options remain.
- A fetched schema comparison matched the entire pre-test schema exactly, apart from that requested old test-option removal. Existing field names, types, descriptions, option IDs and colors were preserved.
- Restored the two resource visitor/return storage keys to their original values in Chrome and in the in-app browser and checked equality. No unrelated browser data was cleared. Test-only fetch/referrer/storage overrides disappeared on reload; temporary viewport overrides were reset.
- No source fix, backend deployment, website commit or push was performed. This Markdown report is the only new tracked-path deliverable; scratch scripts, downloaded files, screenshots and detailed synthetic-row snapshots are under ignored `test-artifacts/`.

Detailed local evidence: `test-artifacts/e2e-notion-evidence.json`, `e2e-health.json`, `e2e-api.json`, `e2e-responsive.json`, `e2e-no-javascript.json`, `e2e-schema.json`, `e2e-filters.json`, `e2e-lighthouse*.json`, `e2e-network-summary.json`, `e2e-secrets.json` and the `e2e-*.png` screenshots. These scratch files are not committed or published.

Before a clean sign-off: approve and fix R1–R4, resolve S1–S3, trace S5, finish S4's browser/screen-reader coverage, then repeat the affected live journeys and cleanup. The Beehiiv Newsletter nav/footer destinations remain known and out of scope for step 8.
