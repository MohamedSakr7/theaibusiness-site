# Resource catalogue, library and pages

`catalogue.json` is the single source of truth for the library entries and resource pages. Each page keeps its public introduction, contents, audience, outcomes, FAQ and related links readable, then opens its PDF or assessment on the same page after signup. The library has a public signup view and an unlocked view with direct destinations.

## Add a resource

Follow [SOP.md](SOP.md) for the complete source review, approval, publication and live-testing workflow. Root [AGENTS.md](../AGENTS.md) makes this the default for future Codex sessions. This README describes the implementation.

1. Add a complete entry following the existing examples, including the public copy, metadata, cover, delivery, related links and manual order. Every published guide/tool should have its own `/resources/<slug>/` page.
2. Run `node scripts/build-resources.cjs`. This generates the library cards, filters, CollectionPage/ItemList metadata and enabled resource pages. It retains the library sitemap entry.
3. Run `node --test tests/resource-*.test.cjs`, preview and publish the source and generated output after approval.

Cards use **manual order**, lowest number first; current entries use explicit order values. The order is assessment → ten-workflow overview → complete GTM plan → AI visibility → homepage → sales calls → CRM template → lost deals → channels → tool stack. This moves from diagnosis and planning through attracting/converting buyers, reviewing results and choosing supporting tools. No hand-coded card, per-resource JavaScript, filter option or manual library metadata edit is needed.

`accessUrl` is the direct resource destination used inside the unlocked library (a PDF viewer/download or the tool itself). Never set it to another signup page. `accessLabel` is the button text and `format` is the display label. `pageUrl` is reserved for public detail pages and metadata. For a dedicated page, supply the full content fields shown in `score-your-gtm`, then change `pageUrl` to `/resources/<slug>/`. The generator requires the full copy before creating a detail page; card-only entries do not create placeholder pages.

For a minimal card, reuse an existing thumbnail or an HTTPS image. Use a real PDF cover for guides and set `coverStyle` to `publication` for the booklet presentation. All eight guide covers are small WebP renders of their original first pages. `libraryThumbnail` and `libraryThumbnailAlt` optionally override the image in the library without changing a public detail-page image. Images are not regenerated or replaced by the catalogue builder.

For a complete page, copy a full catalogue entry. Include `longDescription` paragraphs, `whatsInside` title/description pairs, `whoItsFor`, `outcomes`, three to five `faq` entries and two or three other slugs in `related`. Set `pageUrl` to `/resources/<slug>/`. Keep existing slugs stable. The generator creates the complete page; no separate manual page is needed.

For Google Drive PDFs, `resourceUrl` and `accessUrl` use `https://drive.google.com/file/d/FILE_ID/view`; `viewerUrl` uses the same path ending `/preview`; `gatedUrl` uses `https://drive.google.com/uc?export=download&id=FILE_ID`. Check anonymous sharing. Set `delivery` to `pdf`, `buttonLabel` to `Download PDF`, and accurate image dimensions/alt text. Optional `attachments` contain `label` and `url`, such as the homepage guide's skill ZIP.

The assessment uses `/score-your-gtm/?embedded=1` for the inline viewer and library destination. Its old contact form and FormSubmit code have been removed entirely. Company website is optional context only. Without `embedded=1`, a browser redirect sends visitors to the public landing page, retaining other query parameters and the hash. The implementation URL is noindex with the public landing page as canonical. Scoring definitions remain intact. The builder extracts its twelve questions for public HTML without copying answer options or result definitions. The library image is a screenshot of the real tool; all eight PDFs use their actual first-page covers.

## Notion templates

Use `type: template`, `delivery: template` and `format: Notion template`. Set `resourceUrl`, `accessUrl`, `gatedUrl` and `viewerUrl` to the verified public Notion template URL. Use an actual screenshot for the cover. Template pages unlock a direct Open Notion template button and copying instructions, rather than a PDF viewer or embedded tool. Reading is anonymous; duplicating requires a Notion account. Verify the public child guide pages, databases and Duplicate entry point. The shared signup and once-only return system is unchanged.

## Shared pieces

- `resources/library.json`: public title, description and FAQ answers. The resource count comes directly from the catalogue; never type it into the template.
- `templates/resource-library.html`: two-state landing/library layout and SEO shell.
- `templates/resource-page.html`: public detail-page layout and metadata.
- `templates/resource-form.html`: the one form partial used by both pages, with the same fields, honeypot and newsletter consent.
- `templates/site-header.html` and `site-footer.html`: shared chrome for generated pages; existing footer and newsletter destinations are preserved.
- `scripts/update-navigation.cjs`: idempotent conversion of old dropdowns to Resources links; leaves other content unchanged.
- `resource-gate.js`: shared validation, immediate access, attribution and remembering.
- `resource-viewer.js`: loads the resource iframe on unlock, scrolls to it (respecting reduced motion), and unloads it when access is reset. It duplicates no signup or backend logic.
- `resource-library.js`: the type filter. Resource descriptions remain visible for search engines; JavaScript is required to unlock the access buttons.
- `resource-config.js`: the single public Apps Script endpoint setting. The Notion token stays in Apps Script Properties.

## Access and remembering

Valid submission unlocks immediately, before storage/network work. Errors are console-only. The library sends `type: signup`, `source: library`, `resource: ""`; detail pages send their slug for source and resource. Both use JSON sent as `text/plain;charset=utf-8`, with no custom headers or browser credentials. No email is sent by the gate.

Name and normalized email use the existing `aib.resource-visitor.v1` browser storage key. The library hides its landing/form view and shows the unlocked resource catalogue. Revisiting the library does not send a silent return. A remembered detail-page visit skips the form and sends one return per email/resource/browser. Successful returns use individual `aib.resource-returns.v2.<encoded-email>.<slug>` keys. Old unscoped v1 markers are ignored because they cannot identify the person. Storage failures fall back to the form; network failures never remove access. **Use different details** clears the identity and opens the form again without erasing other people's history.

Remembering is limited to this website/browser, not an account login. Library buttons open the original guides on Google Drive or the assessment directly; no Beehiiv gate is involved. Direct library clicks send one silent return per resource/browser, using the same marker as detail-page visits. This is a client-side access gate, not private-file hosting.

The shared gate/config scripts load on every site page. Channel is captured on the first page of the tab's visit: utm_source first, then external referrer, otherwise Direct. `aib.resource-channel.v1` in sessionStorage preserves it through internal navigation; our own hostname never replaces a saved source. Unknown values become Other. ChatGPT, Perplexity, Gemini, Claude and Copilot map to AI search. A fresh tab/session starts a new attribution visit; blocking sessionStorage prevents retention across pages.

Email validation uses the same rules as Apps Script, including the 200-character maximum. Invalid addresses show an error, never unlock and are not remembered.

Requests carry a `requestId`. Pending payloads use separate `aib.resource-pending.v1.<encoded-email>.<requestId>` localStorage keys and retry once on each later page load. Signups flush before returns to preserve first-touch details. Only an `{ok:true}` response clears a pending request and marks a return done. Return IDs use the browser ID in `aib.resource-browser.v1` plus the slug, scoped to the email's row. The backend saves request IDs with the count in Notion's `Request IDs` text property and ignores repeats, including when the original reply was lost. See [the coordinated deployment steps](../apps-script/RELIABILITY-UPDATE.md): deploy the backend before publishing this frontend. If browser storage is blocked/full, immediate access and an in-memory send still work, but persistence across page loads is unavailable.

## Verification

The request-ID field retains only the latest **20 IDs per person**, and is hidden from **All signups** and **To review**. Duplicate protection applies to that recent window; replaying an ID after 20 newer accepted requests can count again. Do not describe this as unlimited historical deduplication.

Run `node scripts/preview.cjs 4186 --mock-signups`, then open `http://127.0.0.1:4186/resources/`. This explicit local preview mode substitutes a localhost signup endpoint and runs the actual Apps Script code against an in-memory Notion simulator, so reviewing forms does not write to Notion. `/__preview-signups` shows request IDs, channel, source, resource and simulated counts without displaying names or emails. Synthetic identities exist only in the process's memory until it stops. The production config file is unchanged. Without this flag, the preview uses the real signup service.

Check all cards and filters, library signup (First source = library, initially no resource tag), remembered assessment access and its return, remembered library confirmation, every page's Resources link, and desktop/mobile layout. Inspect console/network for CORS errors and preflight requests. Delete temporary Notion rows and clear only the resource-gate test browser keys afterwards.

The automated tests cover shared form reuse, immediate access during backend failure, storage fallback, future-card generation, all nine pages' metadata and links, the twelve public questions, preserved assessment scoring, viewer loading/reset, reduced motion, footer/newsletter links and nav-only changes elsewhere.

Signup labels use asterisks for name/email only. The optional Company website input accepts a domain or full URL, up to the existing 200-character backend limit. Its request key remains `company`, and Apps Script stores it as text in Notion's existing `Company` property. It is separate from the hidden `website` honeypot. Existing non-empty company values are preserved by the existing upsert rules. This applies to the shared library/detail form and the standalone assessment's company input.

Public copy is static HTML. Unique titles/descriptions, canonical URLs, Open Graph/Twitter tags, CreativeWork (plus SoftwareApplication for the assessment), FAQPage, breadcrumbs, related links and sitemap entries come from the catalogue. The library has CollectionPage and ItemList metadata. These help search systems understand the pages; they do not guarantee rankings or AI citations.

After publication approval, run live signup/Notion, return, file access, console/CORS and responsive checks. Remove disposable test rows and test browser keys. Only after successful publication update the four requested Content Assets fields: Website status, Website URL, Gate URL and Gate status.
