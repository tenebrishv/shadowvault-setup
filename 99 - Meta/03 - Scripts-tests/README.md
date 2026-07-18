# Scripts tests

Unit tests for `99 - Meta/02 - Scripts/*.js` — the Source Capture modules and
`periodicNoteHelpers.js` — using Node's built-in test runner (`node:test` —
ships with Node, no install needed).

## Running

Run these **scoped to this folder**, not from the vault root — the vault has
thousands of files (attachments, plugin bundles, `.obsidian` caches), and
`node --test` with no path recursively globs the current directory for test
files, which is slow on a tree this size.

`cd` into this folder and run with no path argument (passing this folder's
path as an argument instead makes Node try to `require()` it as a single
module, which fails):

```sh
cd "99 - Meta/03 - Scripts-tests"
node --test
```

## What's covered vs. not

These test the pure logic in each `sourceCapture<Type>.js` module — prompt
sequencing, auto-fetch success/fallback branches, and the generated
`yamlFields`/`body`/`noteTitle` strings — using mocked `tp`, `app`, `fetch`,
and `Notice` (see `_testUtils.js`).

`periodicNoteHelpers.js` (shared by the Daily/Weekly/Monthly/Yearly templates)
is tested the same way, with one difference: `installMockMoment()` mocks the
global `moment` as a call-recording spy, not a real calendar — it verifies
*what* the helper asks moment to do (which `startOf`/`add`/`subtract` unit
and amount), not that the resulting dates are calendrically correct. Trust
moment.js for that.

`frontmatterSchema.test.js` is different in kind: rather than testing one
module, it checks every frontmatter **producer** in the vault — all 21
templates (read from `00 - Templates/` on disk), the `buildBaseYaml` helper,
all 9 capture modules, and `METADATA.md`'s own field tables — against the
single fixture in `_frontmatterSchema.js`. Read the header comment in that
fixture before editing it: the `required` lists are deliberately
hand-transcribed rather than computed, and contracts are keyed on template
filename rather than on the `type` field. Both look like oversights and are
not; see `docs/adr/0003`.

If you add a template, add a fixture entry — an unclassified template fails
the suite by design.

They do **not** test the real Obsidian/Templater integration: actual modal
rendering, the real file rename (`app.fileManager.renameFile` /
`tp.file.rename`), real network calls, Templater's own date formatting, or
real ISO-week/month/year boundary arithmetic. Verify those by running
`(TEMPLATE) Source Capture` or the periodic note templates for real in
Obsidian after any change here.

## Why a separate folder from `02 - Scripts/`

Templater's User Scripts Folder is configured to `99 - Meta/02 - Scripts`.
Test files live in this sibling folder (`03 - Scripts-tests`, not a subfolder
of `02 - Scripts`) so Templater never loads them as `tp.user.*` functions.
Both folders are kept outside `00 - Templates/` entirely, since Templater's
"Insert Template" picker lists everything under `templates_folder` — `.js`
files nested inside it would show up as if they were templates.
