# Contributing to ShadowVault

ShadowVault is an Obsidian vault that behaves like an application: the templates
and the Templater user scripts under `99 - Meta/` are the source, and the folder
structure is the schema. Most changes are small; the ones that break things are
usually changes to capture or frontmatter, so those carry the most process.

## Licence and contributor terms — read before opening a PR

ShadowVault is **open source** under [GNU AGPL-3.0](LICENSE) (AGPL-3.0-only):
free to use, modify and redistribute, with source-availability obligations on
redistribution. See [README § Licence](README.md#licence). The bundled Obsidian
plugins under `.obsidian/plugins/` are third-party code and are not covered —
see [NOTICE](NOTICE).

**By submitting a contribution, you agree that:**

1. **Ownership and right to submit.** You are the sole author of the
   contribution, or you otherwise have the right to submit it under these terms.
   If your employer has rights to intellectual property you create, you have
   either received permission to submit the contribution on your employer's
   behalf, or your employer has waived those rights for it.
2. **Copyright licence.** You grant tenebrishv, and tenebrishv's successors and
   assigns, a perpetual, worldwide, non-exclusive, transferable, irrevocable,
   royalty-free copyright licence to reproduce, prepare derivative works of,
   publicly display, publicly perform, sublicense and distribute your
   contribution and such derivative works, **including under commercial licence
   terms**, and to relicense the project as a whole in future.
3. **Patent licence.** You grant tenebrishv, and tenebrishv's successors and
   assigns, a perpetual, worldwide, non-exclusive, transferable, irrevocable,
   royalty-free patent licence to make, have made, use, offer to sell, sell,
   import and otherwise transfer your contribution, limited to those patent
   claims licensable by you that are necessarily infringed by your contribution
   alone or by its combination with the project.
4. **Moral rights.** To the fullest extent permitted by applicable law, you
   waive and agree not to assert any moral rights in your contribution against
   tenebrishv or downstream recipients.
5. **Third-party material.** Your contribution contains no third-party material
   — book text, article bodies, subtitle lines, or code you did not write —
   unless you have clearly identified it and the terms under which it may be
   used. Frontmatter and structural examples are enough.
6. **Retained ownership.** You retain copyright in your contribution. This
   grants a licence; it does not transfer ownership.

Clause 2 exists because commercial licences are granted separately. Without it,
every past contributor would hold a permanent veto over that — including people
who have long since disappeared. Clauses 3 and 4 are the standard companions to
it, modelled on the Apache ICLA and the Harmony agreements: a copyright licence
alone leaves a contributor free to assert a patent over the same code, or to
assert moral rights in jurisdictions where those survive a licence grant. If you
are not comfortable with these terms, open an issue describing the change instead
of a PR. A well-described bug is genuinely useful and carries no licensing
entanglement.

Clause 5 also applies to issues, tests and fixtures, not just to code.

## Setup

Obsidian, with **Templater** and **Dataview** enabled. Templater's template
folder must be `99 - Meta/00 - Templates/` and its User Scripts folder must be
`99 - Meta/02 - Scripts/`; both are already set in the committed plugin config.

There is no build step and no package manager. The test suite uses Node's
built-in runner, so Node is the only other requirement.

**No third-party npm packages.** This is a hard constraint. The vault ships as a
distributable framework with no install step, and a dependency tree would break
that — as well as dragging AGPL obligations in from whatever those packages'
own terms are.

## Running the tests

Scoped to the folder, never from the vault root — `node --test` with no path
globs the whole tree, and this one has thousands of attachments and plugin
bundles in it:

```sh
cd "99 - Meta/03 - Scripts-tests"
node --test
```

If you changed a template file rather than a script, also run the
`templater-lint` skill, which catches Templater anti-patterns statically. If you
changed anything in `99 - Meta/04 - Tooling/`, run the `updater-test` skill
before committing.

## What the tests cannot tell you

The suite runs against mocked `tp`, `app`, `fetch` and `Notice`. It does not
cover Obsidian actually loading the scripts, real modal rendering, the real file
rename, or real network calls. After changing capture or a periodic-note
template, **run it for real in Obsidian once** and say so in the PR. A green
suite on a capture change is necessary, not sufficient.

## Things that will look correct and be wrong

- **Adding a template without a fixture entry.** `frontmatterSchema.test.js`
  checks every frontmatter producer in the vault against `_frontmatterSchema.js`.
  An unclassified template fails the suite by design — add the fixture.
- **Putting logic back in `(TEMPLATE) Source Capture.md`.** The template body is
  a one-line adapter so that dispatch, assembly and rename stay covered by tests.
  Logic that moves into the template becomes unreachable from the suite.
- **Nesting scripts or tests under `00 - Templates/`.** Templater's "Insert
  Template" picker lists everything under the templates folder, so `.js` files
  there appear as selectable templates.
- **Committing an API key.** Auto-fetch sources rank on a credential ladder, and
  keyless is the default. A key may be adopter-supplied and optional; this
  public repo ships none, ever.
- **Editing `.obsidian/` by hand.** Treat it as generated config, except when
  the change to plugin behaviour is the point of the PR.

Scripts are cached by Templater — after editing one, run **Reload templates** or
restart Obsidian, or you will test the old version.

## Adding a source type

Add `99 - Meta/02 - Scripts/sourceCapture<Type>.js` following the existing
module shape, then add one row to `TYPE_REGISTRY` in
`sourceCaptureOrchestrator.js`. Auto-fetching types build on
`helpers.fetchWithFallback`; filename cleaning goes through
`helpers.sanitizeTitle`. Update `METADATA.md` and the schema fixture.

## Pull requests

Say what you changed, what you ran, and whether you exercised it in Obsidian.
Bug reports are most useful with the note's frontmatter and the exact template
or command you ran.

## Scope

ShadowVault captures sources and grows notes. Things that belong elsewhere:
syncing, publishing, theming beyond the shipped snippets, and anything that
writes to the vault without a human initiating it.
