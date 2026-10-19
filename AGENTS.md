# Project instructions

## Resource library work

When the user asks to **add a new resource**, or update, replace, retire or audit an existing guide/tool, read [resources/SOP.md](resources/SOP.md) before editing. It is the required workflow for the Notion source review, catalogue, landing pages, library, approval, live checks and cleanup. Use [resources/README.md](resources/README.md) for implementation details.

- Notion Content Assets and the actual file/tool supply the content. `resources/catalogue.json` supplies the website; generated HTML is rebuilt with `scripts/build-resources.cjs`.
- Build and test locally, show the concrete preview and wait for publication approval. Honor approval already given for that preview; do not repeatedly ask for routine steps covered by it.
- Keep public copy specific: guide, assessment, toolkit or tool. Resources is the collection/navigation name.
- Reuse the existing form, remembering and Apps Script bridge. Company website is the `company` request field and Notion `Company` text property; `website` is the hidden honeypot. Keep secrets in Apps Script Properties.
- Do not mark work complete until the applicable SOP checklist passes. Clearly distinguish a local preview, a published change and a verified live result.

These instructions do not authorize unrelated website edits, messages, Notion changes or deletion of existing signup history.
