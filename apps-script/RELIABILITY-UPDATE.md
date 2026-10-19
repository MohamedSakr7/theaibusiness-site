# Publish the signup reliability fixes

Release procedure for the approved reliability fixes. See the report in `resources/` for the actual publication and live-test results.

## After approval: backend first, website second

1. In **Resource Signups** in Notion, add **Request IDs**, type **Text**. Keep all existing properties and rows. This field lets retries be recognized; it is saved in the same write as the signup count. Codex can add it after publication approval.
2. Open the existing **Resource Signups** project at <https://script.google.com/>. In **Editor → Code.gs**, replace the code with [resource-signups.gs](resource-signups.gs) and save. Leave the two private Script Properties untouched.
3. Select **checkConfiguration → Run**. It must confirm **all 13 property types verified**. It writes no rows.
4. Click **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. Keep **Execute as: Me**, **Who has access: Anyone**, and the same `/exec` URL. There is no new connection or secret to create.
5. Codex verifies replaying a synthetic request ID counts once, then commits and pushes the approved website changes. Old website clients without an ID still work during the backend-first transition.

The script keeps only the **20 most recent request IDs per person** in Notion, not a Google Sheet or a cache. Hide this text property from both **All signups** and **To review** while preserving their existing columns, order, filter and sorts. IDs are scoped to the email's row, so different people on one browser count separately. A separate, deliberate signup gets a new ID and increments normally; a retry reuses its original ID. Duplicate protection covers those 20 IDs: a very old request replayed after it falls outside that window can count again.

The email maximum is 200 characters in both form and backend. The bounded history is split into text pieces of at most 2,000 characters, within [Notion's documented limits](https://developers.notion.com/reference/request-limits). Storage-blocked browsers can still unlock and send, but cannot retain failed payloads across reloads.

## Affected live tests only

Use names starting **E2E TEST** and emails such as `e2e-test+fixes-<date>@example.com`. Record every created row ID; never edit or delete real signups.

- Old `/score-your-gtm/` redirects to its shared-gate page. `?embedded=1` still runs the assessment, with no contact form, no FormSubmit and noindex/canonical tags.
- Fresh visit: `/?utm_source=linkedin` → Resources → signup. Notion Channel must be LinkedIn.
- Invalid email: clear error; no unlock, remembered identity or Notion write.
- Failed signup/return: access is immediate, payload stays pending, next page retries, return is marked done only after success. Also simulate a reply lost after a real save: retry must not increase Signups again.
- **Use different details**: a second email on the same browser gets its own resource visit. Reopening for that email does not log again.
- Assessment: all strongest answers produce 100 with next-level advice; strong overall/mixed answers acknowledge the weak area. Scoring is unchanged.
- Resources at tablet widths: no horizontal scroll in either locked or unlocked view.
- Clear only synthetic browser queues/identity/markers, delete only rows created in this test, and confirm cleanup. Report local and live results separately.
