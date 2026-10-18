# Resource catalogue, library and pages

`catalogue.json` is the single source of truth for all five library cards. Only `score-your-gtm` has its own resource page so far. The other four retain their existing Beehiiv destinations until step 5.

## Add a resource

1. Add an entry with `slug`, `title`, `shortDescription`, `type`, `thumbnail`, `pageUrl`, and optionally `cardButtonLabel` and `order`.
2. Run `node scripts/build-resources.cjs`. This generates the library cards, filters, CollectionPage/ItemList metadata and enabled resource pages. It retains the library sitemap entry.
3. Run `node --test tests/resource-gate.test.cjs tests/resource-library.test.cjs`, preview and publish the source and generated output.

Cards use **manual order**, lowest number first; current entries are numbered 10–50. No hand-coded card, per-resource JavaScript, filter option or manual library metadata edit is needed.

`pageUrl` is the one-line destination switch. Keep the current external link until the dedicated page is ready. For a dedicated page, supply the full content fields shown in `score-your-gtm`, then change `pageUrl` to `/resources/<slug>/`. The generator requires the full copy before creating a detail page; card-only entries do not create placeholder pages.

For a minimal card, reuse an existing thumbnail or an HTTPS image. To generate a branded cover from the entry's title/type, set `thumbnail` to `/assets/resource-covers/<slug>.svg`.

## Shared pieces

- `templates/resource-library.html`: library layout, optional access panel and SEO shell.
- `templates/resource-page.html`: public detail-page layout and metadata.
- `templates/resource-form.html`: the one form partial used by both pages, with the same fields, honeypot and newsletter consent.
- `templates/site-header.html` and `site-footer.html`: shared chrome for generated pages; existing footer and newsletter destinations are preserved.
- `scripts/update-navigation.cjs`: idempotent conversion of old dropdowns to Resources links; leaves other content unchanged.
- `resource-gate.js`: shared validation, immediate access, attribution and remembering.
- `resource-library.js`: the type filter. All cards and links work without JavaScript.
- `resource-config.js`: the single public Apps Script endpoint setting. The Notion token stays in Apps Script Properties.

## Access and remembering

Valid submission unlocks immediately, before storage/network work. Errors are console-only. The library sends `type: signup`, `source: library`, `resource: ""`; detail pages send their slug for source and resource. Both use JSON sent as `text/plain;charset=utf-8`, with no custom headers or browser credentials. No email is sent by the gate.

Name and normalized email use the existing `aib.resource-visitor.v1` browser storage key. The library hides its form and shows **You have access to everything.** Revisiting the library does not send a silent return. A remembered detail-page visit skips the form and sends one minimal return per resource/browser, marked in `aib.resource-returns.v1`. Storage failures fall back to the form; network failures never remove access. **Use different details** clears the identity and opens the form again.

Remembering is limited to this website/browser. The four legacy Beehiiv pages may still ask for signup until they migrate in step 5; the library explains that transition. This is a client-side access gate, not private-file hosting.

Channel is captured on landing: utm_source first, then referrer, otherwise Direct. Unknown values become Other. ChatGPT, Perplexity, Gemini, Claude and Copilot map to AI search.

## Verification

Run `node scripts/preview.cjs 4186`, then open `http://127.0.0.1:4186/resources/`.

Check all cards and filters, library signup (First source = library, initially no resource tag), remembered assessment access and its return, remembered library confirmation, every page's Resources link, and desktop/mobile layout. Inspect console/network for CORS errors and preflight requests. Delete temporary Notion rows and clear only the resource-gate test browser keys afterwards.

The automated tests cover shared form reuse, immediate access during backend failure, storage fallback, future-card generation from a minimal entry, unchanged detail-page content, preserved footer/newsletter links, and nav-only changes elsewhere.
