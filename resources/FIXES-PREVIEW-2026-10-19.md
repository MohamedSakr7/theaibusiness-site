# Resource-system fixes: local review

**Status: implemented and tested locally; awaiting publication approval.** No commit, push, live Notion schema change or Apps Script deployment has been made for these fixes. The earlier live E2E report remains a historical snapshot.

Preview: <http://127.0.0.1:4186/resources/>. The running preview uses a localhost backend simulator; submitting it does not write to live Notion. The same Apps Script source is executed against simulated Notion responses.

## What changed

| Requested fix | Local result |
| --- | --- |
| R4: old assessment | Browser redirect to `/resources/score-your-gtm/`, retaining other query parameters/hash and capturing attribution before redirect. Embedded mode still works; implementation URL is noindex/canonicalized. Old name/email fields and FormSubmit removed entirely. |
| S1: attribution | Shared code captures the first page's UTM/external source in sessionStorage, then retains it through internal navigation in that tab. Own-domain navigation cannot replace a known source. |
| R1: email validation | Form uses the backend's syntax and length rules. Invalid addresses show a clear error without unlocking, remembering or sending. |
| R3: lost requests | Separate durable browser queue entries, stable request IDs, retry on later page load, and acknowledgement only after backend success. Backend stores IDs and counts in the same Notion page write under the existing lock. Replayed IDs do not increment again. Access stays immediate. |
| R2: shared browser | Return markers and queued requests belong to the normalized email; a second person's visits log independently. |
| S2: assessment advice | 100/100 gets next-level advice; an 89/100 result with weak Getting found names that area. Scoring definitions/calculation unchanged. |
| S3: tablet overflow | Decorative background no longer extends horizontally beyond the hero. Both views fit at tablet widths without masking content. |

## Verification

- **37 website checks passed**, including actual assessment rendering, exact scoring preservation, frontend/backend email parity, first-page attribution, failed request persistence, lost replies after successful writes, per-person markers and simultaneous-tab return deduplication.
- **12 backend test groups passed**, including all six original signup scenarios, validation, locking, preserved fields, limits and uncertain-write handling.
- Browser: LinkedIn homepage → library signup saved LinkedIn in the local simulated row.
- Browser: invalid single-label email stayed locked with the error “Please enter a valid email address, such as name@example.com.”
- Browser: simulated reply loss after signup committed; reload retried the same ID. One row, Signups stayed **1**.
- Browser: a failed resource visit retried on the next page load; acknowledgement was recorded after success. A second email on the same browser received its own visit. Reopening did not add another request/count.
- Browser: embedded assessment completed at **100** and **89**; the appropriate advice/summary appeared. Old nonembedded URL redirected to the public landing page.
- Browser: locked and unlocked library at viewport widths **760, 768, 820, 1024** had matching document/client widths: no horizontal overflow.
- Build regenerated all nine pages. `git diff --check` passed. Local test identity/markers/pending payloads were cleared; viewport overrides reset. Simulated rows disappear when the preview process stops. No live test rows were created during this phase.

## Publication dependency and remaining work

After approval, follow [../apps-script/RELIABILITY-UPDATE.md](../apps-script/RELIABILITY-UPDATE.md): add **Request IDs — Text** to Resource Signups, update the existing Apps Script deployment, verify replay protection, then commit/push the website. The `/exec` URL and private Script Properties stay the same.

Only then re-run the affected live tests requested by the user, clear synthetic pending requests before deleting their corresponding test rows, and confirm cleanup without touching real signups. Local tests do not establish live CORS/backend success.

Browser storage that is blocked or full cannot persist failed requests across page loads; immediate access and an in-memory send still work. Attribution retention is per tab/session, not an account-level lifetime attribution system.
