# Resource Signups setup, deployment, and tests

The bridge is deployed and its six live tests passed on 18 October 2026. These instructions remain available for setup or redeployment. Notion is the only signup store; no Google Sheet is used.

For the pending request-ID reliability update, follow [RELIABILITY-UPDATE.md](RELIABILITY-UPDATE.md) first. The source now requires one additional Notion property: **Request IDs — Text**. Deploy that backend before publishing the retrying website.

- `resource-signups.gs`: paste into Apps Script's `Code.gs`.
- `resource-signups-tests.gs`: paste into a second Apps Script file called `Tests.gs`.
- `resource-signups.local.test.cjs`: offline tests; run `node apps-script/resource-signups.local.test.cjs` locally. Do not paste this file into Apps Script.

## 1. Create the project and add the code

1. Open <https://script.google.com/> using the Google account that will own the bridge.
2. Click **New project**. Rename **Untitled project** to **Resource Signups**.
3. In **Editor**, open **Code.gs**, replace its starter code with all of `resource-signups.gs`, and save.
4. Next to **Files**, click **+ → Script**, name it **Tests**, paste all of `resource-signups-tests.gs`, and save.

## 2. Add the two private settings

Open the **gear icon → Project Settings → Script properties → Add script property**. Add these exact property names:

| Property | Value |
| --- | --- |
| `NOTION_TOKEN` | Paste your Notion internal connection's API token yourself. |
| `NOTION_DATA_SOURCE_ID` | `8e4c0e6f-d7c6-40ff-9989-3359cc546daf` |

Click **Save script properties**. The token stays here, never in Code.gs, Tests.gs, this repo, a website config, or a chat message. Use Script Properties, not User Properties. Do not share screenshots showing the token.

The database ID is `31720da1-b01a-4e1b-b239-b5a922f2e6d8`; it is not the value of `NOTION_DATA_SOURCE_ID`.

## 3. Authorize and check configuration

1. Return to **Editor**.
2. In the function dropdown at the top, select **checkConfiguration** and click **Run**.
3. Click **Review permissions**, choose the project owner's Google account, and allow the permissions needed to contact Notion.
4. If Google displays an unverified-app screen for this project you just created, select **Advanced → Go to Resource Signups** to continue to its permission screen.
5. The execution log should say **Configuration and all 13 property types verified. No records were written.**

If Notion returns 401, check the token. For 403/404, check the data source ID and that the **Resource Signups** Notion connection has Read, Update, and Insert content enabled and is connected to the database.

## 4. Deploy and copy the URL

1. Click **Deploy → New deployment**.
2. Click the gear beside **Select type** and choose **Web app**.
3. Description: **Resource signup bridge v1**.
4. **Execute as:** **Me** (your Google account).
5. **Who has access:** **Anyone**. This must permit anonymous visitors, not just anyone with a Google account.
6. Click **Deploy**; complete any further authorization prompt using the same account.
7. Under **Web app**, click **Copy** beside the URL ending in **/exec**. Save that URL for step 3 and share it in this chat; it is public, not the Notion secret.

If your Google Workspace policy does not offer **Anyone**, anonymous website submissions cannot work with that deployment. Report that restriction before wiring up the website.

To deploy future code edits: **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. This updates the same `/exec` URL. Saving code alone does not update a versioned deployment. Use `/exec`, not the editor-only `/dev` URL.

## 5. Run the six live tests

These tests write temporary rows to Notion through the deployed public endpoint, then query Notion to verify the saved records. They do not expose the token. They do not prove browser CORS; do the separate browser check below too.

1. In **Tests.gs**, replace `PASTE_YOUR_EXEC_URL_HERE` with your `/exec` URL, keeping the surrounding quotes. This URL is not a secret.
2. Save. Select **runResourceSignupTests** in the function dropdown and click **Run**. This editor-only test-file change does not require redeployment.
3. Expect these six PASS messages and **All 6 live tests passed against the deployed /exec endpoint and Notion.**

| Test | Saved result |
| --- | --- |
| 1. First signup | `test+1@theaibusiness.net`, one row, Signups = 1. |
| 2. Second resource | Same row, both resource tags, Signups = 2; original name and first touch preserved. |
| 3. Mixed-case email | Same row, normalized email, Signups = 3. |
| 4. Minimal return | Only type, email, resource sent; same row, Signups = 4. |
| 5. Missing signup name | `ok: false`, clear error; no row for `test+2@theaibusiness.net`. |
| 6. Honeypot | Synthetic success; no row for `test+3@theaibusiness.net`, no changes to test+1. |

4. Copy the PASS/FAIL output back into this chat without the token. Live success remains **unverified** until you run the tests and share the result.
5. Afterwards, **delete the test rows in Notion** (move them to Trash). Search for test+1, test+2, and test+3 if a test failed. Remove the temporary **signup-test-resource** option from Resources taken if desired. Delete old test rows before rerunning: the runner deliberately refuses to reuse them.

## Frontend contract for step 3

Send **POST** to the `/exec` URL with **Content-Type: text/plain;charset=utf-8**, a **JSON.stringify(...)** body, **credentials: omit**, **redirect: follow**, and no custom or Authorization headers. This is a CORS simple request, so it avoids an OPTIONS preflight. The server returns JSON through ContentService's redirect. Never send the Notion token from the browser.

```js
async function sendResourceSignup(webAppUrl, payload) {
  const response = await fetch(webAppUrl, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('The signup service could not be reached.');
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'Signup failed.');
  return result;
}

// Resource-page signup:
await sendResourceSignup(WEB_APP_URL, {
  type: 'signup',
  email: 'person@example.com',
  name: 'Full Name',
  role: 'Founder',
  company: 'Example Company',
  source: 'score-your-gtm',
  resource: 'score-your-gtm',
  channel: 'LinkedIn',
  website: ''
});

// Library signup: source is library; resource is empty.
await sendResourceSignup(WEB_APP_URL, {
  type: 'signup', email: 'person@example.com', name: 'Full Name',
  source: 'library', resource: '', channel: 'Direct', website: ''
});

// Remembered visitor: name is ignored, source defaults to the resource slug.
await sendResourceSignup(WEB_APP_URL, {
  type: 'return', email: 'person@example.com', resource: 'another-resource'
});
```

Responses: `{ "ok": true, "status": "created" }`, `{ "ok": true, "status": "updated" }`, or `{ "ok": false, "error": "..." }`. ContentService application errors still use HTTP 200: always inspect `ok`. The honeypot intentionally returns synthetic `created` success without writing anything.

### Browser check before integrating forms

After deployment, open <https://theaibusiness.net>, open the browser developer console, paste the `sendResourceSignup` function above, then run this with your real URL:

```js
await sendResourceSignup('PASTE_YOUR_EXEC_URL_HERE', {
  type: 'signup', email: 'test+2@theaibusiness.net', source: 'library'
});
```

Expect the readable error **Name is required for signup requests.** No row is written. In Network, expect a POST and its redirect, with **no OPTIONS request**. This proves the browser can receive the JSON too, not only send the POST. Run it after the six tests so it does not confuse their cleanup.

If the browser reports CORS or returns HTML, inspect the deployment's anonymous access and `/exec` URL first. The script cannot set arbitrary CORS headers. Do not switch to `mode: 'no-cors'`: it gives an opaque response and cannot confirm a saved signup. The shared website gate queues failed requests and retries on the next page load with the SAME `requestId`. Deploy the updated backend first: it ignores IDs already saved in the row's `Request IDs` property, even if the earlier write committed but its reply was lost. A new intentional signup uses a new ID. Legacy callers may omit the ID during rollout; they must not retry uncertain writes automatically.

## Rules and limits

- Email is trimmed and lowercased, but plus-addresses are preserved. Required fields are checked before acquiring the script lock. All reads and writes for each signup share that lock, released even on failure. Use one Apps Script project for every form; other projects and manual Notion edits do not share its lock. Two submissions may increment Signups twice, but must use the same row.
- Existing data: union resource tags, increment Signups, refresh Last seen, fill only empty Name/Role/Company. A return never supplies a Name. First source, First seen, Channel, Promote to CRM, Notes, and Email are never patched.
- New return for an unknown email: create a row with an empty Name, First source derived from resource if source is absent, Channel = Other if absent, and count 1. A later signup fills the Name. A library signup has no resource tag; it does not enumerate all resources.
- Limits (raw string characters, before trimming): body 8192; type 6; email 200 (local part 64); name/role/company 200 each; source/resource 100 each; channel 50; website 200 for a normal request; requestId 160. Request IDs use lowercase letters, numbers and hyphens. Source/resource must be lowercase letter/number slugs with hyphens. Optional values may be absent, empty, or null. Names support Unicode; email validation accepts conventional ASCII addresses, not every quoted/internationalized mailbox syntax. Controls, unknown keys, non-string field values, and invalid email syntax are rejected. Any nonempty honeypot value, including whitespace, short-circuits to success within the body limit.
- Unknown/missing channel becomes Other. Signups start at 1. Missing old counts are treated as 0; invalid negative/fractional counts are rejected. Existing duplicate email matches stop the operation for manual review. More than 100 resource tags fails without dropping existing tags.
- New select/multi-select option names are sent by name; Notion creates them automatically when the connection has write access to the parent data source. Existing options are retained by ID. No destructive schema updates are used.
- Notion 429 responses respect Retry-After within a bounded wait; safe lookup 5xx responses are retried. Uncertain writes are not automatically replayed. The script lock prevents concurrent writes from this project, but is not a database-wide uniqueness constraint or a transaction with Notion. No submission-id protocol is added, so uncertain network outcomes still require checking the row.
- This is a public signup endpoint as requested. Email is a matching key, not proof of ownership. A honeypot is a basic bot filter; origin/CORS is not authentication. The endpoint does not return saved profile data, and the code logs no real signup bodies or credentials.

## Verified API references (18 October 2026)

- [Notion versioning](https://developers.notion.com/reference/versioning): `Notion-Version: 2026-03-11`.
- [Query a data source](https://developers.notion.com/reference/query-a-data-source): POST `/v1/data_sources/{id}/query`.
- [Data source parent](https://developers.notion.com/reference/parent-object#data-source-parent): POST `/v1/pages` with `{ type: 'data_source_id', data_source_id: ... }`; PATCH `/v1/pages/{id}` for updates.
- [Page property values](https://developers.notion.com/reference/page-property-values): automatic select/multi-select option creation with parent write access; arrays replace rather than append.
- [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [Script Properties](https://developers.google.com/apps-script/guides/properties), [script locks](https://developers.google.com/apps-script/reference/lock/lock-service).
- [ContentService redirects](https://developers.google.com/apps-script/guides/content#redirects) and [CORS simple requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#simple_requests): follow redirects and use a plain-text request without custom headers. Live browser response readability must still be tested after deployment.
