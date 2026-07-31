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

`sourceCaptureOrchestrator.test.js` covers the capture flow end to end: the
type picker, registry dispatch, note assembly, and the rename. It drives the
orchestrator through its real interface — script the type pick on the mocked
`tp`, hand it a stub capturer via `tp.user`, assert the assembled note and
the rename that came out — with no assertions on internal call structure.
It also holds the registry-completeness checks (eleven rows, each carrying its
documented filename prefix, each naming a module that loads). This logic used
to live inside `(TEMPLATE) Source Capture.md`, where none of it was reachable
from here; keeping the template a one-line adapter is what preserves that.

`moveSourceNote.test.js` covers the filing command — the counterpart to
capture, which moves a note out of `00 - Inbox` into its type folder. It drives
`resolveType` directly as a table over all eleven types and every shape
frontmatter `tags` can take, then drives the module itself through mocked
`app`/`Notice` to assert the rename that came out, or that none did (Thought's
exemption, an unrecognised note, a note already filed, a name collision at the
destination). The type→folder mapping it asserts is the `folder` column of the
orchestrator's registry, not a restatement of it.

`sourceCaptureHelpers.test.js` covers the shared helpers, including
`sanitizeTitle` (a table test over the characters the old per-module regex
variants disagreed on) and `fetchWithFallback` (success, failure, skip,
fill-gaps, and cancellation paths).

`periodicNoteHelpers.js` (shared by the Daily/Weekly/Monthly/Yearly templates)
is tested the same way, with one difference: `installMockMoment()` mocks the
global `moment` as a call-recording spy, not a real calendar — it verifies
*what* the helper asks moment to do (which `startOf`/`add`/`subtract` unit
and amount), not that the resulting dates are calendrically correct. Trust
moment.js for that.

`frontmatterSchema.test.js` is different in kind: rather than testing one
module, it checks every frontmatter **producer** in the vault — all 25
templates (read from `00 - Templates/` on disk), the `buildBaseYaml` helper,
all 11 capture modules, and `METADATA.md`'s own field tables — against the
single fixture in `_frontmatterSchema.js`. Read the header comment in that
fixture before editing it: the `required` lists are deliberately
hand-transcribed rather than computed, and contracts are keyed on template
filename rather than on the `type` field. Both look like oversights and are
not; see `docs/adr/0003`.

If you add a template, add a fixture entry — an unclassified template fails
the suite by design.

They do **not** test the real Obsidian/Templater integration: actual modal
rendering, the real file rename (the orchestrator tests assert *that*
`app.fileManager.renameFile` was called with the right path, against a mock —
whether Obsidian then performs it is untested), Templater actually loading
the user scripts, real network calls, Templater's own date formatting, or
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
