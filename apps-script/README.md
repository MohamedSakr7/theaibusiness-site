# Resource Signups

Google Apps Script bridge: static website → web app → Notion. No Google Sheet.
The bridge is deployed. All six live tests passed on 18 October 2026, confirmed by the execution log shared in this chat.
The resource-page frontend uses the public endpoint in `../resource-config.js`.

| File | Purpose |
| --- | --- |
| [resource-signups.gs](resource-signups.gs) | Paste into Apps Script's Code.gs. |
| [resource-signups-tests.gs](resource-signups-tests.gs) | Paste into Tests.gs; runs the six requested checks against your deployed endpoint and Notion. |
| [SETUP.md](SETUP.md) | Click-by-click setup, private settings, deployment, frontend fetch examples, browser check, cleanup, and API sources. |
| [resource-signups.local.test.cjs](resource-signups.local.test.cjs) | Offline contract tests; no account or credentials needed. |

Set `NOTION_TOKEN` and `NOTION_DATA_SOURCE_ID` only in **Project Settings → Script properties**.
Use data source ID `8e4c0e6f-d7c6-40ff-9989-3359cc546daf`, not the database ID.
Never put the token in source, test files, website config, or Git.

POST JSON as `text/plain;charset=utf-8` with no custom headers, `credentials: 'omit'`,
and redirects followed. Check the JSON `ok` field even on HTTP 200. Full examples
are in [SETUP.md](SETUP.md#frontend-contract-for-step-3).

Notion API version: `2026-03-11`. Uses data-source query and page creation with
`data_source_id` parent. Select options are automatically added by name with parent
write permission. ScriptLock serializes email lookups and writes; existing profile,
first-touch, and manual review data are preserved as specified.

Run locally:

```sh
node apps-script/resource-signups.local.test.cjs
```

Verified locally: 12 offline test groups, including the six required scenarios.
Live result: **all six tests passed**. The portable test-file copy keeps a URL placeholder;
use the endpoint from `../resource-config.js` when running it in a new Apps Script project.
Delete temporary Notion test rows after each test run.
