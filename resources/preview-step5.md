# Step 5 preview — review snapshot

This is the review snapshot prepared before publication approval. All nine resource pages and the updated library were built and tested locally at this stage. The subsequent approved wording/form changes and live verification are recorded separately.

Open the [local library](http://127.0.0.1:4186/resources/). Preview forms simulate successful signups locally; they do not write to Notion or send email.

## All nine pages

The linked names below are the public H1 headings. Search titles and descriptions are exactly as configured.

| Page and local link | Search title | Meta description |
|---|---|---|
| [Score your go-to-market](http://127.0.0.1:4186/resources/score-your-gtm/) | Free B2B Go-to-Market Assessment \| The AI Business | Score your B2B go-to-market in about three minutes. Read the 12 questions, then unlock your score, growth bottleneck and practical next steps. |
| [Build your whole go-to-market in one AI workflow](http://127.0.0.1:4186/resources/build-your-gtm-in-one-ai-workflow/) | Build Your B2B GTM Plan with AI \| The AI Business | Use one Claude project to review your B2B go-to-market and build a 90-day plan. Free guide with 10 stages, prompts and a worked example. |
| [Prepare your sales calls using AI](http://127.0.0.1:4186/resources/prepare-sales-calls-using-ai/) | Prepare B2B Sales Calls with AI \| The AI Business | Prepare B2B sales calls with ChatGPT or Claude. Free guide with 12 prompts, a call brief, recap and proposal drafts, scripts and a 14-day plan. |
| [Does ChatGPT recommend your company?](http://127.0.0.1:4186/resources/does-chatgpt-recommend-you/) | Does ChatGPT Recommend Your Company? \| The AI Business | Check whether ChatGPT and Gemini recommend your B2B company. Free guide with 12 buyer questions, repeat-run scoring, a tracker and a fix plan. |
| [The future-proof B2B GTM stack](http://127.0.0.1:4186/resources/the-ultimate-future-proof-gtm-tool-stack/) | B2B GTM Tool Stack Guide \| The AI Business | Review your B2B GTM tool stack with a free guide to 30 tools, nine layers, setup order and three example budgets. Pricing dated September 2026. |
| [Find out why you lose B2B deals](http://127.0.0.1:4186/resources/why-you-lose-deals/) | Why Do You Lose B2B Deals? Free AI Guide \| The AI Business | Find patterns in lost B2B deals with ChatGPT or Claude. Free guide with four prompts, eight reasons to check, a scorecard and a worked example. |
| [Rewrite your homepage in your clients' words](http://127.0.0.1:4186/resources/rewrite-your-homepage-with-ai/) | Rewrite Your B2B Homepage with AI \| The AI Business | Rewrite your B2B homepage using real client language. Free PDF, Claude skill and ChatGPT prompt with a worked example and a homepage checklist. |
| [Which channels actually bring you clients?](http://127.0.0.1:4186/resources/which-channels-bring-clients/) | Which B2B Channels Bring Clients? \| The AI Business | Find which B2B channels bring signed clients. Free guide with three AI prompts, a full-cost scorecard, worked example and monthly review routine. |
| [The 10 AI workflows every B2B company needs](http://127.0.0.1:4186/resources/10-ai-workflows/) | 10 AI Workflows for B2B Go-to-Market \| The AI Business | Use ten practical AI workflows across your B2B go-to-market. Free guide with eleven prompts, real-input checklists, worked examples and a 30-day plan. |

## What changed

- Completed all nine catalogue entries, retaining the original five slugs. New slugs: why-you-lose-deals, rewrite-your-homepage-with-ai, which-channels-bring-clients and 10-ai-workflows.
- Each page contains a public introduction, specific contents, audience, outcomes, three to five FAQs, three related resource links and a library link.
- Signup opens the resource immediately on the same page. PDFs have an embedded viewer and Download PDF button; the assessment runs in an iframe without asking for name/email again. Public content remains visible.
- Reused the shared form, storage and background logging. Added a small viewer adapter; the backend and production endpoint are unchanged.
- All twelve original scored assessment questions are public, without answer options, scoring logic or result definitions in the landing-page HTML.
- All eight PDF thumbnails use their actual covers. The library has nine entries, generated counts/filters, public links to the new pages, and direct destinations after unlock.
- Honeypots are native-hidden, inert, aria-hidden and excluded from keyboard focus. Library stat reads “100% free · no card needed”.
- Updated resources/README.md with catalogue fields, delivery URLs, adding resources and safe preview instructions.

## Search and AI-search work

All explanatory copy is present in static HTML before JavaScript runs. Each page has a unique search title and description, canonical URL, Open Graph/Twitter metadata, CreativeWork metadata (also SoftwareApplication for the assessment), matching FAQPage answers and breadcrumbs. Related links and library links connect the collection; all nine pages are in the sitemap. The library's CollectionPage and ItemList now include all nine own-site pages.

The content answers the real problem, who the resource fits, what it contains and how to use it. These choices follow [Google's guidance for AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): useful, accessible content and normal search foundations remain relevant. There is no claim of guaranteed rankings, rich results or AI citations.

The existing live assessment landing page was read directly: its source contains Organization, CreativeWork, FAQPage and BreadcrumbList JSON-LD. The new version remains local until approval.

## Source checks

Reviewed all nine Notion resource records, their page bodies and all fifteen linked promoting-post records. Read all eight actual PDFs, and inspected the assessment source and behavior. Public copy describes the current files rather than older promotional versions.

All eight PDFs downloaded without authentication and opened in embedded Google Drive viewers. No inaccessible PDF was found. The tool-stack guide's vendor prices are explicitly dated 22 September 2026; they are not presented as current quotes. Fictional worked examples are described as examples, not customer results.

The homepage guide also links a Claude skill ZIP. Its anonymous download and ZIP contents were verified, but installation and operation inside Claude were not tested. No supplied skill instructions were executed.

## Local test results

- **25 automated checks passed**, covering signup/return behavior, unlock despite backend failure, storage failure, shared forms, nine pages' metadata/links, the public questions, preserved assessment scoring, viewer gating/reset, reduced motion, navigation and future catalogue generation.
- Form submission opened a PDF inline; the local request audit recorded the correct resource slug as source and resource.
- Remembered visits opened resources without the form. Repeated opens did not send additional returns for the same resource.
- All eight Google Drive viewer frames loaded. All nine pages fit a 390px mobile viewport before/after unlock and a 1440px desktop viewport after unlock, without horizontal overflow.
- Completed the embedded assessment through its twelve scored questions to an inline result. Embedded mode disables its legacy submission email; no test email was sent.
- Library filters: nine All, seven Guides, one Tools and one Assessments. Direct PDF destinations and the assessment URL are generated correctly.
- No site-script or CORS errors were observed in the local checks. On resuming the browser, one transient exception came from the Electron/browser host's anonymous bundled script; it did not reproduce on reload and was not a site-file stack.
- Test browser identity/return keys were cleared at handoff. Local simulated audit entries disappear when the preview server stops. No real Notion test rows were created.

## After approval

Commit and push, verify the live pages, run real signup/Notion and once-only return tests, recheck every live resource and desktop/mobile/console/CORS behavior, remove real test rows and test browser data, then update only Website status, Website URL, Gate URL and Gate status for the nine Content Assets records.

The live Notion saving and production CORS checks have **not** been rerun for Step 5 yet; preview simulation is not presented as proof of them.
