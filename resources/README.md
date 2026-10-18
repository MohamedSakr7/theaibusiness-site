# Resource catalogue and pages

`catalogue.json` is the single source of truth. Only `score-your-gtm` is included in this migration so far.

To add a resource:

1. Copy the existing entry in `catalogue.json` and replace its slug, copy, type, button label, tool/download URL, thumbnail, date, SEO fields, inside/audience lists, and FAQ. Use a unique lowercase slug, for example `prepare-sales-calls`. Thumbnails can reuse an existing asset or use an HTTPS image URL.
2. Run `node scripts/build-resources.cjs` from the repository folder. It creates `/resources/<slug>/index.html` from `templates/resource-page.html` and adds the sitemap entry automatically. Do not edit the generated HTML by hand.
3. Run `node --test tests/resource-gate.test.cjs`, preview, then commit and publish the catalogue and generated output. The current scope test deliberately expects one resource; expand that assertion when adding the next resource.

No per-resource JavaScript, manually copied gate, navigation edit, or hand-written sitemap entry is needed. The library and homepage navigation are unchanged in this step; a later library migration can read this catalogue.

## Shared pieces

- `templates/resource-page.html`: public page layout, form, metadata, and site chrome. The build copies existing header/footer markup from the current library without modifying it.
- `resource-page.css`: styles for detail pages only; uses the site's existing fonts, colors, header, and footer.
- `resource-gate.js`: signup, immediate access, attribution, and browser remembering. It does not fetch page copy or metadata at runtime.
- `resource-config.js`: the one public `/exec` endpoint setting. No Notion credentials belong here.

## Gate behavior

Name and email are required. Role and company are optional. A visually hidden `website` honeypot is sent empty for humans. The submit button includes a clear newsletter subscription line.

Valid submission immediately reveals the tool/download button, before storage or network work. The browser then sends plain-text JSON to Apps Script in the background (`type: signup`, `source` and `resource` equal to the catalogue slug). Errors are console-only and do not remove access. No email is sent by this gate. It is a client-side access gate, not private-file hosting; the underlying static resource URL remains accessible directly.

Name and normalized email are saved under localStorage key `aib.resource-visitor.v1`. Remembered visitors skip the form. The first automatic visit to each resource sends only `type: return`, `email`, and `resource`; the resource slug is marked in `aib.resource-returns.v1` before sending, so later reloads do not send it again. The signup itself does not consume that one return. Failed automatic return requests are not retried. If storage cannot be read or the return marker cannot be written, the form remains available. A submitted form still unlocks the current page if storage fails.

The **Use different details** button removes the remembered name/email and shows the form again. It does not erase the browser's resource-return markers. Remembering applies on the same browser and origin; localhost and the live site have separate storage.

Channel is captured at the resource-page landing: `utm_source` first, then referrer, then Direct. Unknown sources become Other. ChatGPT, Perplexity, Gemini, Claude, and Copilot are AI search; LinkedIn and Google have their own channels.

## Verification

Local checks: `node --test tests/resource-gate.test.cjs`.

Preview: `node scripts/preview.cjs 4186`, then open `http://127.0.0.1:4186/resources/score-your-gtm/`.

Test the real form locally and live, checking Notion after each action:

1. New test email: one row with Signups = 1.
2. Use different details and resubmit the same email: same row, Signups = 2.
3. Reload as the remembered visitor: no form, same row with Signups = 3.
4. Reload again: no extra return; count stays at 3.
5. Inspect browser console/network: no CORS errors, no OPTIONS preflight, readable JSON from the Apps Script redirect.
6. Delete only the temporary test rows in Notion and remove the test browser's remembered details afterwards.

The automated suite also covers a backend that never responds, backend errors, blocked storage, invalid fields, channel detection, public metadata/FAQ, and preservation of the original homepage, library, and assessment.
