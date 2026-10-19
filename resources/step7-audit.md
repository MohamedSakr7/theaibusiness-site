# Step 7 — library audit and operating procedure

Checked on 19 October 2026. **Pre-publication audit snapshot, approved for publication.** The findings below describe the original live site and the reviewed corrections included in this release. Deployment and live verification follow publication.

## Part A: live audit

| Check | Result |
|---|---|
| Notion → catalogue → live library | Nine records with Record type = Resource and Resource status = Live; nine unique catalogue entries; nine public links and nine unlocked cards. No missing, duplicate or extra item. |
| Titles and descriptions | Public titles and short descriptions match the catalogue and the previously verified materials. Notion records reconcile by their actual file/tool URLs, allowing the approved reader-facing titles. |
| Type labels and filters | One mismatch: the stack is labelled PDF guide but classified as tool list. Live filters correctly reflect that old data (seven Guides, one Tools entry and one Assessment). Local correction classifies all eight PDFs as Guides. |
| Covers and style | Eight actual PDF covers load and use contain-fit without cutting off their content. Shared card layout, typography and button treatment are consistent. Replaced the assessment's illustrative SVG with a screenshot captured from the real tool in the local preview. |
| Order | Assessment already first; the remaining order did not clearly follow the reader's task. Prepared the logical sequence below locally. |
| Public access | All nine public listing links lead to their own landing pages. |
| Remembered access | All nine cards expose the correct direct PDF/tool destinations. Checked the remembered library with a temporary browser fixture and preclaimed return markers; the network audit recorded zero signup-service calls. The original visitor state was restored. |
| Landing-page navigation | Every page has a library link and three related-page links; related targets are live. |
| Links, images and files | All 61 unique linked URLs/assets checked across the live library and landing pages returned HTTP 200. No broken internal anchors. All eight anonymous downloads returned valid PDFs. |
| Sitemap | Library plus all nine landing pages present. |
| Desktop/mobile | Live public and remembered library layouts fit their screens. Corrected preview checked at desktop width 1440px and mobile width 390px; no horizontal overflow. All nine preview images loaded. |

No backend, integration settings or Notion records were changed during this audit. Live signup/Notion upsert behavior was verified in Step 5; it is not claimed as a newly run Step 7 signup test. No real signup rows were created for Step 7.

## Approved corrections

1. Classify the stack as a guide, so filters become **All (9), Assessments (1), Guides (8)**.
2. Use a genuine screenshot for the assessment card. Keep the eight actual PDF covers and shared card design.
3. Use manual order 10–90 in this sequence:

| Position | Guide/tool | Reason |
|---|---|---|
| 1 | Score your go-to-market | Diagnose the problem first. |
| 2 | The 10 AI workflows every B2B company needs | Choose the workflow that fits that problem. |
| 3 | Build your whole go-to-market in one AI workflow | Build the broader plan. |
| 4 | Does ChatGPT recommend your company? | Check how buyers find you. |
| 5 | Rewrite your homepage in your clients' words | Improve the page buyers arrive on. |
| 6 | Prepare your sales calls using AI | Turn interest into better sales conversations. |
| 7 | Find out why you lose B2B deals | Learn from deals that did not close. |
| 8 | Which channels actually bring you clients? | Review which activity produced clients. |
| 9 | The future-proof B2B GTM stack | Choose the tools supporting that work. |

The catalogue generates the listing order, card count, filters and CollectionPage/ItemList order. Existing slugs and delivery URLs are preserved. The stack landing page now correctly identifies its format as a guide in the preview.

**Local checks:** 28 automated checks passed; 71 linked URLs/assets checked successfully; no broken anchors or missing sitemap entries. Public links remain individual landing pages; remembered buttons remain direct destinations. Test assertions now use the catalogue's size rather than requiring exactly nine entries, and a regression check protects guide/assessment classification.

Preview: http://127.0.0.1:4186/resources/ — forms simulate signups locally and do not write to Notion. The unlocked card view was captured in the desktop/mobile screenshots under `test-artifacts/`. Original test browser storage was restored. The preview server remains running for review.

## Part B: SOP

[SOP.md](SOP.md) covers preparation, the exact request message, source review, catalogue/page generation, search metadata, previews and publication approval, live tests, cleanup, Notion readiness updates, replacements and retirement. [Root AGENTS.md](../AGENTS.md) directs future Codex sessions to follow it. The README links to it as the complete workflow.

The user's required preparation is one ready, correctly classified Notion entry and a public file/tool URL. A cover and linked posts are optional. The copy-paste request is:

```text
Add a new resource: <exact Name from Notion Content Assets>.
```

Publish these approved corrections and documentation together, verify the live order/filter/image changes and links, and report the release. No Notion website/gate URLs need changing because this audit preserves them.
