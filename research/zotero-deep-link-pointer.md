# Research: a deep-link source pointer for non-AV media (issue #46)

**Branch:** `research/ticket-46-zotero-deep-link`
**Goal:** Establish, from primary sources, whether a book or paper can carry a *clickable* pointer
into the source — the way `[mm:ss](url#t=SECONDS)` does for time-based media — and whether that
generalises the `> [!quote] From the Source` anchor shipped in #44 **without a schema change**.

**Verification status:** Every mechanical claim below is read out of **shipped source code**, at a
named commit, and most are corroborated by a second independent codebase. **Nothing here was
clicked.** Per this repo's standing convention (the one that caught two false "confirmed" claims
during map #26), `zotero://` behaviour and Obsidian's handling of it are proven only **inside
Obsidian**. §5 lists exactly what a human must click, in order.

- Zotero client: <https://github.com/zotero/zotero> — read at `ae98136` (2026-07-29), `version` = `10.0.SOURCE`
- Zotero global schema: <https://github.com/zotero/zotero-schema> — `70c3aa9` (2026-07-16), schema **v44**
- Zotero translators: <https://github.com/zotero/translators> — `424cfbe` (2026-07-23)
- Zotero PDF reader: <https://github.com/zotero/reader> — `457b1d0` (2026-07-27)
- Better BibTeX: <https://github.com/retorquere/zotero-better-bibtex> — `e05a47d` (2026-07-26), **v9.0.50**
- Obsidian help (source of `help.obsidian.md`): <https://github.com/obsidianmd/obsidian-help> — `29e8902` (2026-07-27)
- **Audited: 2026-07-29.**

> **Provenance caveat — read this before trusting a citation below.**
>
> **The documentation websites were unreachable from this environment.** `www.zotero.org`,
> `forums.zotero.org`, `retorque.re` and `help.obsidian.md` all fail at the network policy
> (`403` to `CONNECT`); only GitHub is routable. So this audit is deliberately **source-first**,
> which is also what issue #46's own sourcing rule asks for when docs and code disagree. Where a
> doc is cited it is the doc's **versioned source in git** (Obsidian's help repo, BBT's `site/`
> directory, which is what generates `retorque.re`) — not a rendered page I read, and not a search
> snippet. Two claims below rest on a Zotero **forum** answer I could only see through a search
> summary; both are labelled and both are independently confirmed in source, so nothing load-bearing
> depends on them.
>
> **Zotero publishes no reference page for the `zotero://` scheme.** There is no
> `zotero.org/support/...` document for it. The authoritative definition is the doc-comment and
> router in `ZoteroProtocolHandler.mjs`. That file is therefore treated as the specification here.
>
> **`main` vs. a shipped release.** The Zotero clone is `main` (`10.0.SOURCE`, unreleased). To keep
> that from contaminating the findings, the whole protocol handler was diffed against the latest
> **shipped tag, 9.0.6**: `git diff 9.0.6 HEAD -- chrome/content/zotero/ZoteroProtocolHandler.mjs`
> is **empty**. Every §1 claim therefore holds on released Zotero, not just on trunk.

---

## 0. Versions (for re-verification)

| Thing | Version | Where checked |
| --- | --- | --- |
| Zotero client (trunk) | `10.0.SOURCE` | `zotero/zotero:version` @ `ae98136` |
| Zotero client (latest release tag) | **9.0.6** | `git tag` on `zotero/zotero` |
| Zotero global schema | **v44** (2026-07-16) | `zotero/zotero-schema:schema.json` |
| Better BibTeX | **9.0.50** | `zotero-better-bibtex/package.json:4` |
| Zotero Integration (Obsidian) | **3.2.1**, `minAppVersion 1.1.1`, desktop-only | `obsidian-zotero-integration/manifest.json` |
| Citations (Obsidian) | **0.4.5**, last commit **2022-09-24** | `obsidian-citation-plugin/manifest.json` |
| Zotero/Citations plugin in **this vault** | **none installed** | `.obsidian/community-plugins.json`, `.obsidian/plugins/` |

**OBSERVED** — no Zotero-related plugin is installed here. `.obsidian/community-plugins.json` lists
17 plugins; none is a Zotero or citation plugin, and `ls .obsidian/plugins` agrees. The only
`zotero` string anywhere in `.obsidian/` is `"zoteroCompatibility": false` in Excalidraw's
`data.json`, which is unrelated.

---

## 1. Q1 — Does Zotero expose a stable deep link into a PDF at a page?

### 1.1 Yes. The full URI surface, as the router actually defines it

**OBSERVED** — `zotero/zotero:chrome/content/zotero/ZoteroProtocolHandler.mjs`. The handler
registers eight extensions (lines 887–894):

```
zotero://attachment   zotero://data      zotero://report   zotero://select
zotero://debug        zotero://pdf.js    zotero://open     zotero://open-pdf
```

**`zotero://open` and `zotero://open-pdf` are the same object.** Lines 893–894 assign the identical
`OpenExtension` to both. `zotero://open/...` is an undocumented working alias — it appears in no
doc-comment. Prefer `open-pdf`: it is the form every other tool emits, so it is the form most likely
to keep working.

**Routes accepted by `open-pdf`** (lines 771–814):

| Form | Note |
| --- | --- |
| `zotero://open-pdf/library/items/<KEY>?page=N` | personal library |
| `zotero://open-pdf/groups/<groupID>/items/<KEY>?page=N` | group library |
| `zotero://open-pdf/<libraryID>_<KEY>/<page>` | legacy **ZotFile** form; routed via the *deprecated* `parseLibraryKeyHash` (`dataObjects.js:300–301` logs a deprecation warning). Do not adopt. |

The `library` / `groups/<id>` prefix is not hand-written — it comes from
`Zotero.API.getLibraryPrefix()` (`xpcom/api.js:160–176`), which returns `'library'` for a user
library, `'groups/<groupID>'` for a group, and `'publications'` for My Publications.

**Query parameters actually consumed** (line 818, destructured as `{ annotation, page, cfi, sel }`):

| Param | Effect | Line |
| --- | --- | --- |
| `page=N` | `location.pageIndex = parseInt(page) - 1` | 840–842 |
| `annotation=<annotationKey>` | `location.annotationID = annotation` | 843–845 |
| `cfi=<EPUB CFI>` | EPUB `FragmentSelector` position | 847–853 |
| `sel=<CSS selector>` | snapshot/HTML `CssSelector` position | 854–859 |

So **yes, there is an annotation-level anchor**: `?annotation=<KEY>`, and it is strictly better than
`?page=`. **OBSERVED** in `zotero/reader:src/pdf/pdf-view.js:1906–1908` — `navigate()` tests
`location.annotationID` **first**, before `dest`, `position`, `pageIndex` or `pageLabel`. An
annotation anchor scrolls to the exact highlight; a page anchor only scrolls to a page.

### 1.2 The target must be the **attachment** item, not the parent

**OBSERVED** — `ZoteroProtocolHandler.mjs:827–830`:

```js
if (!item.isFileAttachment()) {
    Zotero.warn(`Item for ${uriPath} is not a file attachment`);
    return;
}
```

A key for the *bibliographic* item (the paper, the book) is silently rejected. This is the single
most common way to get a dead `zotero://` link, and the failure is quiet — `Zotero.warn` goes to the
debug log, not to the user. Corroborated independently in two other codebases:

- **BBT** builds the link from `att.key`, walking `item.getAttachments()` first —
  `zotero-better-bibtex/content/json-rpc.ts:266`.
- **Zotero's own Note Markdown translator** derives the key from `annotation.attachmentURI` —
  `translators/Note Markdown.js:1509, 1517`.

A Zotero forum thread says the same ("it will work on the attachment item key, not the parent item
key") — but that is a **search-summary-only, secondary** sighting, and it is redundant: three
primary codebases already agree.

### 1.3 `page=N` is a **physical page index**, not the printed page number

This is the finding most likely to bite this vault, because the anchor's whole non-AV use case is
"a page for a book".

**OBSERVED** — the handler does `location.pageIndex = parseInt(page) - 1` (line 841) and *never*
sets `location.pageLabel`. The reader then takes the `pageIndex` branch and scrolls to
`pageIndex + 1` (`reader:src/pdf/pdf-view.js:1917–1921`). The reader **does** have a separate
`location.pageLabel` branch that looks the value up in the PDF's real page labels
(`pdf-view.js:1922–1928`) — but the `zotero://` handler has no way to reach it.

Consequences, both **INFERRED** from those two code paths read together:

- For a PDF with front matter, `?page=42` lands on the **42nd sheet**, not printed page 42. A
  scanned book with 8 pages of front matter is off by 8.
- A non-numeric printed label (`xii`, `S3`, `A-7`) gives `parseInt(...) → NaN`, so
  `Number.isInteger(NaN)` is false, every later branch is unset, and **navigation silently does
  nothing** — the PDF opens at its last-read position with no error.

Zotero's own emitter agrees with the index reading: the Note Markdown translator writes
`?page=' + (position.pageIndex + 1)` — **OBSERVED**, `translators/Note Markdown.js:1536`.

> **Documentation-vs-source disagreement, and the source wins.**
> The **Zotero Integration** Obsidian plugin puts a *page label* into `?page=`. Its shipped default
> annotation template is
> `[Page {{annotation.page}}]({{...desktopURI...}}?page={{annotation.pageLabel}}&annotation={{annotation.id}})`
> — **OBSERVED**, `obsidian-zotero-integration/src/bbt/basicTemplates/applyBasicTemplates.ts:62`,
> and the same substitution is made in code at `src/bbt/export.ts:106–113` and `132–137`
> (`page: annotation.pageLabel` / `annotation.annotationPageLabel`).
> Zotero's handler will `parseInt` that label and treat it as a physical index. Where the two
> disagree, **the Zotero handler is what actually runs**, so the ZI-generated `?page=` value is
> unreliable for any PDF whose labels are not 1:1 with its sheets. The `&annotation=` half of the
> same link is unaffected, and takes priority anyway (§1.1) — which is why the annotation anchor is
> the one to standardise on.

### 1.4 Is the item key stable? **Across sync yes; across a library move no.**

**Key format — OBSERVED.** `Zotero.Utilities.generateObjectKey()` is
`randomString(8, allowedKeyChars)` (`zotero/utilities:utilities.js:1734–1736`); Zotero's own test
support pins the charset as `/^[23456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{8}$/`
(`zotero/zotero:test/content/support.js:6`) — 8 chars, no `0`, `1`, `O` or `U`.

**Immutable once saved — OBSERVED.** `dataObject.js:219` throws `"Key cannot be changed"`, and
`:222` throws `"Cannot set key if id is already set"`. Nothing in the client renames a key in place.

**Stable across sync — INFERRED (well-supported).** The key *is* the sync identity: it is the path
segment of the Web API (`library/items/<key>`), and BBT's own release note for the native citation
key says the upside of moving to Zotero's field is that *"keys will sync"*
(`zotero-better-bibtex/site/content/_index.md:25`). I could not read Zotero's sync documentation
(site unreachable), so this is labelled INFERRED rather than DOCUMENTED — but no code path was found
that mints a new key for an existing synced object.

**NOT stable across a library move — OBSERVED, and this is the sharp edge.**
`Zotero.Item.prototype.clone()` is documented in its own header as *"Returns an unsaved copy of the
item **without itemID and key**"* (`item.js:5303–5313`). `moveToLibrary()` is implemented as
`this.clone(libraryID)` + `save()` (`item.js:5420–5425`), and attachments go through
`Zotero.Attachments.moveAttachmentToLibrary()`, which is likewise `attachment.clone(libraryID)` +
`save()` (`attachments.js:3008–3023`). A new key is minted on save. **Dragging a paper from My
Library into a group library breaks every `zotero://open-pdf` link that pointed at its PDF**, and
breaks them silently (§1.2).

**Merging duplicates is a partial break — OBSERVED.** In `mergeItems.mjs:242–268`, an attachment
with no counterpart on the master is *moved* (`parentItemID` reassigned, key preserved, link
survives); an attachment that *matches* one on the master is trashed and the master records a
`dc:replaces` relation. **The `open-pdf` handler does not follow `dc:replaces`** — `open-pdf` and
`select` both resolve through `Zotero.API.getResultsFromParams()`, which adds a bare
`s.addCondition('key', 'is', params.objectKey)` (`xpcom/api.js:111–113`) and has no redirect step,
even though `integration.js:2856` and `editorInstance.js:1428` do consult that predicate elsewhere.
So a link to the merged-away copy dies.

### 1.5 `zotero://select` — the same key, a different destination

**OBSERVED** — `ZoteroProtocolHandler.mjs:555–614`. `select` accepts more routes than `open-pdf`:
`library/items/:key`, `groups/:groupID/items/:key`, collection- and search-scoped variants
(`library/:scopeObject/:scopeObjectKey/items/:objectKey`), plus `library/collections/:key` and
`library/searches/:key`. The old `zotero://select/items/<id>` form is marked *Deprecated* in the
doc-comment (lines 550–553), and `zotero://select/[type]/1234` is annotated *"not consistent across
synced machines"*. `select` reveals the item in the Zotero pane; it does **not** open the PDF, and
unlike `open-pdf` it accepts a parent-item key (there is no `isFileAttachment` guard).

---

## 2. Q2 — What binds a vault Source note to a Zotero item?

### 2.1 The vault's `citekey` field is **dead — it is emitted, always empty**

This is the load-bearing repo finding, and it is not a code-reading inference: **the shipped module
was executed.**

**OBSERVED.** `99 - Meta/02 - Scripts/sourceCapturePaper.js:53` emits
`yamlFields += yamlField("citekey", data.citekey)`. But `data` comes from `fetchWithFallback`, and
**neither** branch ever sets a `citekey` property — not the CrossRef branch
(`sourceCapturePaper.js:16–24`, which returns `doi/title/authors/publish_date/publisher/keywords/abstract`)
nor the manual branch (`:36–43`). `yamlField` renders `key + ":\n"` for a falsy value
(`sourceCaptureHelpers.js:138–141`).

Running the real module through the repo's own mocks (`_testUtils.js`), down **both** branches, with
every prompt answered:

```
=== BRANCH A: CrossRef auto-fetch succeeded ===     === BRANCH B: manual fallback, all prompts answered ===
authors: "Ashish Vaswani"                           authors: "A. Uthor"
doi: "10.48550/arXiv.1706.03762"                    doi: "10.1000/xyz"
citekey:                                            citekey:
url:                                                url:
publish_date: "2017"                                publish_date: "2019"
keywords: "Machine Learning"                        keywords: "kw1, kw2"
general_subject:                                    general_subject:
```

`citekey` is **always** the empty key `citekey:`. So are **`url`** and **`general_subject`** — the
same bug, three fields. There is no code path in this vault that puts a value in any of them.

**Why the test suite is green anyway — OBSERVED.** `_frontmatterSchema.js:264` requires
`["authors", "doi", "citekey", "url", "publish_date", "keywords", "general_subject"]` for Paper, and
the fixture's own header states that **rule 1 checks field *presence*, not value**
(`_frontmatterSchema.js:13–19`). `citekey:` satisfies presence. The conformance harness cannot see
this class of defect by construction.

Scope check, **OBSERVED**: `citekey` occurs in exactly four places in the whole vault —
`_frontmatterSchema.js:92` (vocabulary), `:264` (Paper contract), `sourceCapturePaper.js:53`, and
`METADATA.md:188` (Paper's documented field block). It is **Paper-only**. A **Book** carries
`authors/url/publish_date/publisher/isbn/general_subject/specific_subject` and **no citekey at all**
(`METADATA.md`, Book block) — so the "page number for a book" case, which is the anchor's headline
non-AV example, has *no* Zotero binding field even in principle today.

### 2.2 Are "citekey" and "Better BibTeX key" the same thing? **Now, essentially yes.**

**DOCUMENTED** (BBT's own docs, read from their versioned source, which is what generates
`retorque.re/zotero-better-bibtex`) — `zotero-better-bibtex/site/content/_index.md:14–25`, verbatim:

> **With the advent of Zotero 8, items have a Zotero-native citation key field. This has replaced the
> BBT citation key field.**
> […] * Zotero will have moved all pinned keys out of the `extra` field into the native field
> * The concept of pinning keys is gone; keys are *always* pinned now. […]
> * Integrations that read the BBT database directly will have to read the Zotero database instead.
>
> Upside to all of this is that keys will sync.

**OBSERVED, confirming it in code:** BBT v9's KeyManager reads and writes Zotero's native field
directly — `item.setField('citationKey', proposed)` (`content/key-manager.ts:470`),
`item.getField('citationKey')` (`:216, :231, :298, :415`), plus a one-time migration out of BBT's own
`better-bibtex.sqlite` `citationkey` table into the native field
(`content/key-manager/migrate.ts:72, 92–101, 181–187`).

**OBSERVED, confirming the field is real and library-wide:** Zotero global schema **v44** defines
`citationKey` as a first-class item field on **37 of 40 item types** — all except `annotation`,
`attachment` and `note` — with the en-US label `"Citation Key"`. Walking the schema repo's history
dates the change precisely:

| Schema | Date | Item types carrying `citationKey` |
| --- | --- | --- |
| v1 | 2019-04-19 | 0 |
| v14 | 2021-11-17 | 1 (`preprint`) |
| v22 | 2023-03-23 | 3 (`dataset`, `preprint`, `standard`) |
| **v33** | **2025-12-19** | **37 — library-wide** |
| v44 | 2026-07-16 | 37 |

Zotero 9.0.0 additionally added a **Citation Key** item-tree column and a search condition
(`itemTreeColumns.jsx:337–341`, `xpcom/data/search.js:338` — absent at tag 8.0.5, present at 9.0.0).

**So:** ShadowVault's `citekey` and "a Better BibTeX key" now name the same underlying value —
Zotero's native `citationKey` item field, which BBT populates and which syncs. That is a *better*
answer than it would have been a year ago. It does not, however, rescue the deep link:

### 2.3 A citekey **cannot** form a deep link on its own

**OBSERVED — three independent confirmations:**

1. **BBT registers no `zotero://` handler.** Grepping BBT v9.0.50's entire `content/` for
   `ZoteroProtocolHandler`, `_extensions`, `newChannel` or `doAction` returns **nothing**; the only
   `zotero://` string in the whole plugin is the URL it *builds* in `json-rpc.ts:266`. BBT extends no
   URI route.
2. **Zotero's router has no citekey route.** `select` and `open-pdf` route on `:objectKey` /
   `:groupID` only (§1.1, §1.5). The nearest thing is the deprecated `items/:id`, which runs
   `parseLibraryKeyHash` — `libraryKey.split('_')`, returning `false` when there is no `_`
   (`dataObjects.js:300–310`). `@smith2020` yields no `_`, so it falls through to `params.objectID`
   and is searched as an **itemID**, matching nothing.
3. **`citationKey` is not a field on attachments anyway** (schema v44, §2.2) — and `open-pdf`
   demands an attachment key (§1.2). The granularity is wrong by one level even in principle.

The **Citations** Obsidian plugin still emits `zotero://select/items/@${this.id}`
(`obsidian-citation-plugin/src/types.ts:199`, and its test fixtures at
`src/__tests__/types.spec.ts:33–91`). Read against (1) and (2), **that URI form has no handler on
current Zotero and should be assumed dead.** The plugin's last commit is 2022-09-24.

**The only citekey→link bridge that exists is a runtime lookup, not a URI.** BBT's JSON-RPC method
`item.attachments(citekey)` resolves the key through `KeyManager`, walks `item.getAttachments()`, and
returns a ready-made `open:` URL per attachment (`content/json-rpc.ts:253–267`). **DOCUMENTED** at
`site/content/exporting/json-rpc.md:6` — the endpoint is
`http://localhost:23119/better-bibtex/json-rpc`. That is a live HTTP call to a running Zotero, not
something a Markdown file can contain.

---

## 3. Q3 — Installed-plugin path, or raw URI? And what would a plugin cost?

### 3.1 There is no installed-plugin path. The mechanism is a raw `zotero://` URI.

**OBSERVED** (§0): no Zotero or Citations plugin is installed. The pointer would be a plain
Markdown link whose target happens to use a non-`http` scheme.

**DOCUMENTED — Obsidian supports exactly that shape.** Obsidian's own help repo documents a
custom-scheme URI as a valid external-link target, with `obsidian://` as the worked example
(`obsidian-help/en/Editing and formatting/Basic formatting syntax.md:160–186`):

> ## External links
> If you want to link to an external URL, you can create an inline link by surrounding the link text
> in brackets (`[ ]`), and then the URL in parentheses (`( )`).
> […] You can also create external links to files in other vaults, by linking to an Obsidian URI.
> ```md
> [Note](obsidian://open?vault=MainVault&file=Note.md)
> ```

The same page gives the two escaping rules that a `zotero://` pointer must obey: spaces become
`%20`, or the whole URL is wrapped in angle brackets `<...>` (lines 176–186). Obsidian's URI page
adds the general warning that *"an improperly encoded 'reserved' character may break the
interpretation of the URI"* (`en/Extending Obsidian/Obsidian URI.md:31–33`) — which matters here,
because `?cfi=` and `?sel=` values are percent-encoded blobs (§1.1).

**NEEDS-OBSIDIAN — and this is the gap the docs cannot close.** Everything above establishes that
Obsidian renders a custom-scheme Markdown link and documents its *own* scheme. **None of it says
what Obsidian does when the scheme belongs to a third-party desktop app**: whether the click reaches
the OS handler, whether it is silently dropped, whether it differs between Reading view and Live
Preview, or whether a confirmation prompt appears. Obsidian's public API surface for protocols is
one-directional — `registerObsidianProtocolHandler()` (`obsidian-api/obsidian.d.ts:5028`) registers
handlers *for* `obsidian://`, and there is no documented API describing outbound handling of foreign
schemes. **Do not upgrade this to DOCUMENTED without a click.**

### 3.2 What a plugin would cost, in this vault's terms

`99 - Meta/01 - Documentation/PLUGINS.md` currently lists **two required** community plugins —
**Templater** and **Dataview** (`PLUGINS.md:9–13`) — and everything else as *recommended*. That
two-item required list is the budget any proposal spends against.

| Candidate | Cost | Verdict |
| --- | --- | --- |
| **none (raw URI)** | zero plugins, zero required-list change | **The mechanism already works or does not, independent of Obsidian.** The URI is inert text to Obsidian; the handler is the OS + Zotero. |
| **Zotero Integration** (`obsidian-zotero-desktop-connector` 3.2.1) | Its README states, first line: *"Requires the Better BibTeX for Zotero plugin."* So it is **+1 Obsidian plugin, +1 Zotero plugin, + Zotero itself**. `isDesktopOnly: true`. Its shipped page-anchor template is also the one that mis-feeds `pageLabel` into `?page=` (§1.3). | Buys bulk annotation *import*, not link *clickability*. Doesn't help the anchor. |
| **Citations** (`obsidian-citation-plugin` 0.4.5) | Unmaintained since 2022-09-24; emits a `zotero://select/items/@citekey` URI with no handler on current Zotero (§2.3). | Reject. |

**INFERRED:** none of these changes whether a `zotero://` link is clickable in Obsidian. That is a
property of Obsidian + the OS protocol registration, not of any plugin. Adding a plugin to get a
clickable page pointer would be spending the required-plugin budget on the wrong problem.

The vault's docs already anticipate Zotero and should be reconciled either way: `WORKFLOWS.md:92–94`
and `EXTERNAL-INTEGRATIONS.md:72, 112` describe a *"Zotero + Better BibTeX + Zotero Integration
plugin"* workflow as if adopted, and `ROADMAP.md:18` still has it as an unchecked box. Nothing of the
sort is installed.

---

## 4. Q4 — THE DECISIVE ONE: fill-in, or new frontmatter field?

### **#44's bet holds. Confirmed. No schema change is required.**

**The reasoning, and it is structural rather than incidental.**

**OBSERVED** — the `> [!quote] From the Source` anchor lives entirely in the **note body**
(`(TEMPLATE) Literature Note.md:29–32`). The Literature Note's frontmatter contract is
`id, type, growth, status, source, section, created, modified, review, tags, aliases, cssclasses`
(`_frontmatterSchema.js:122–129`) and contains **no pointer field of any kind** — not for the AV case
either.

That is the whole argument. The AV pointer that already works,
`[01:35](https://www.youtube.com/watch?v=…#t=95)`, is **body prose**: a Markdown link a human pastes
into the callout. A Zotero page pointer,
`[p. 231](zotero://open-pdf/library/items/ABCD1234?annotation=XYZ12345)`, is **the same
construct** — a Markdown link with a different scheme in the target. Interchanging them changes not
one byte of frontmatter, of the anchor's contract, or of `METADATA.md`. The anchor's prompt text
already says *"a page for a book, a section for a paper"*; a clickable page link is that same
sentence with a hyperlink around it.

Checked against the two rules that actually govern this repo's schema (`_frontmatterSchema.js:12–24`):
**rule 1** (presence is descriptive — the `required` lists record what each producer emits) is
untouched, because no producer emits anything new; **rule 2** (vocabulary is prescriptive and closed)
is untouched, because no new field name enters `VOCABULARY`. A body-level link is invisible to both.

### The bet holds — but it was bought at a price #44 did not price in

Confirming the bet is not the same as saying the feature is ready. Three findings above are load-
bearing for whoever builds this, and all three sit **outside** the schema question:

1. **`citekey` is a dead field (§2.1).** It is emitted empty on every paper ever captured, and it is
   Paper-only, so books — the anchor's headline non-AV case — have no Zotero binding field at all.
   Any future "derive the pointer from the Source note" design starts from nothing. *(`url` and
   `general_subject` are broken the same way; that is a bug worth its own ticket regardless of #46.)*
2. **A citekey could never have carried the pointer anyway (§2.3).** `open-pdf` needs an *attachment*
   key; a citation key names the *parent* item, and Zotero's router has no citekey route. So the
   instinct "we already have `citekey`, we're covered" is wrong twice over — the field is empty
   *and* the wrong granularity. Fixing `citekey` would not produce a working link.
3. **`?page=` does not mean what a human means by "page" (§1.3).** A reader typing `p. 231` off a
   printed page and pasting `?page=231` will land on the wrong sheet whenever the PDF has front
   matter. **The pointer that is actually reliable is `?annotation=<KEY>`**, which is exact, takes
   priority in the reader, and — critically — cannot be hand-composed. It must be *copied out of
   Zotero*, exactly as the anchor already instructs for the seek-link: *"paste it, don't compose
   it."* That instruction generalises perfectly; the pointer value does not.

**Net:** the anchor's contract generalises as #44 bet. What does **not** generalise for free is the
*provenance* of the pointer — the AV path has Media Extended writing the seek-link into the note,
whereas the Zotero path has no in-Obsidian writer, so the link has to come across on the clipboard
from Zotero (§5). **If** a later ticket wants that automated, the field it would need lives on the
**Source** note, not the Literature note, and would be a new *attachment-key* field — not `citekey`.
That is a separate decision and explicitly out of scope here.

---

## 5. What a human must click, in order

Everything in §1–§2 is read from source; **§3.1's central question is untested and cannot be tested
outside Obsidian.** Run these in order and stop at the first failure — each step is a precondition
for the next.

1. **Does the OS know the scheme at all?** With Zotero running, paste a known-good
   `zotero://select/library/items/<KEY>` into the OS run box / browser address bar. If Zotero does
   not come forward, the protocol is not registered and nothing else in this file can work.
   *Tests §1.5.*
2. **Get a real link the correct way — do not hand-type one.** In Zotero: open the PDF, highlight a
   passage, then drag that annotation (or the note containing it) into a plain-text field. This
   routes through the **Note Markdown** translator, which writes
   `zotero://open-pdf/library/items/<attachmentKey>?page=<pageIndex+1>&annotation=<annotationKey>`
   — **OBSERVED**, `translators/Note Markdown.js:1499–1545`. Confirm the copied text matches that
   shape. If nothing appears, check **Settings → Export → Note Quick Copy → "Include Zotero Links"**
   (`zotero.properties:798`, `exportOptions.includeAppLinks = Include %S Links`); the translator
   emits the link only when that option is on (`Note Markdown.js:1511`), though it defaults to
   `true` in the translator header (`:12–14`).
   *Note the "Copy Link" item in the PDF reader's right-click menu is **not** this — it copies an
   external link embedded inside the PDF (`reader/src/common/context-menu.js:145–150`).*
3. **The actual open question — click it inside Obsidian.** Paste that link into a Literature Note's
   `> [!quote] From the Source` callout as `[p. 231](zotero://open-pdf/...)` and click it in
   **Reading view**. Does Zotero come forward at the right page/highlight? Any confirmation prompt?
   *This is the NEEDS-OBSIDIAN claim in §3.1. It decides the ticket.*
4. **Repeat in Live Preview**, and with the cursor inside the link. Obsidian's two edit surfaces
   handle links differently and the help docs do not cover foreign schemes in either.
5. **Confirm the `?page=` trap is real (§1.3).** Use a PDF with roman-numeral front matter. Compare
   `?page=<printed number>` against `?annotation=<key>`. Expect the page form to be off by the
   front-matter count, and expect `?page=xii` to do nothing at all. If confirmed, the anchor's
   guidance must say *annotation anchor*, never *type the page number in*.
6. **Confirm the library-move break (§1.4).** Note an attachment key, drag its parent item from My
   Library to a group library, then click the old link. Expect silent failure. This is the durability
   ceiling on the whole idea and should be written down wherever the feature is documented.

---

## 6. Claim ledger

| # | Claim | Strength |
| --- | --- | --- |
| 1 | `zotero://open-pdf/library/items/<KEY>?page=N` and the `groups/<id>` variant exist and are routed | **OBSERVED** — `ZoteroProtocolHandler.mjs:771–814`; identical at shipped tag 9.0.6 |
| 2 | `zotero://open` is an undocumented alias of `open-pdf` | **OBSERVED** — `:893–894` |
| 3 | `?annotation=`, `?cfi=`, `?sel=` are also supported; annotation takes priority | **OBSERVED** — `:818, 843–859`; `reader/src/pdf/pdf-view.js:1906` |
| 4 | The key must be the **attachment's**, not the parent's; failure is silent | **OBSERVED** — `:827–830`, + BBT `json-rpc.ts:266`, + `Note Markdown.js:1509` |
| 5 | `?page=N` is a 1-based **physical** index, not a printed label; non-numeric labels no-op | **OBSERVED/INFERRED** — `:840–842` + `pdf-view.js:1917–1928`; emitter agrees at `Note Markdown.js:1536` |
| 6 | Zotero Integration's default template feeds a *page label* into `?page=` — a real mismatch | **OBSERVED** — `applyBasicTemplates.ts:62`, `export.ts:106–137` |
| 7 | Item keys are 8 chars, immutable once saved | **OBSERVED** — `utilities.js:1734`, `support.js:6`, `dataObject.js:219` |
| 8 | Keys survive sync | **INFERRED** — BBT `_index.md:25`; Zotero sync docs unreachable |
| 9 | Keys do **not** survive a library move; links break silently | **OBSERVED** — `item.js:5303–5313, 5420–5425`; `attachments.js:3008–3023` |
| 10 | `open-pdf`/`select` do not follow `dc:replaces`, so merged-away copies die | **OBSERVED** — `api.js:111–113`; cf. `mergeItems.mjs:242–268` |
| 11 | This vault's `citekey` is emitted **always empty**, on every branch (as are `url`, `general_subject`) | **OBSERVED** — shipped module executed; `sourceCapturePaper.js:53`, `sourceCaptureHelpers.js:138–141` |
| 12 | The schema test cannot catch this — rule 1 checks presence, not value | **OBSERVED** — `_frontmatterSchema.js:13–19, 264` |
| 13 | `citekey` is Paper-only; Book has no such field | **OBSERVED** — `METADATA.md` Book/Paper blocks; 4 vault-wide occurrences |
| 14 | BBT keys and Zotero's native `citationKey` are now the same value; keys sync | **DOCUMENTED** (BBT `site/content/_index.md:14–25`) + **OBSERVED** (`key-manager.ts:470`; schema v44) |
| 15 | `citationKey` went library-wide in schema **v33**, 2025-12-19 (37/40 item types) | **OBSERVED** — `zotero-schema` history walk |
| 16 | A citekey cannot form a `zotero://` deep link; BBT registers no protocol route | **OBSERVED** — BBT grep; `dataObjects.js:300–310` |
| 17 | The Citations plugin's `zotero://select/items/@citekey` has no handler on current Zotero | **OBSERVED/INFERRED** — `types.ts:199` vs. #16 |
| 18 | Obsidian documents custom-scheme URIs as valid external-link targets | **DOCUMENTED** — `obsidian-help/…/Basic formatting syntax.md:160–186` |
| 19 | Whether Obsidian hands a **foreign** scheme to the OS on click | **NEEDS-OBSIDIAN** — undocumented in help + API |
| 20 | No Zotero/Citations plugin is installed in this vault | **OBSERVED** — `.obsidian/community-plugins.json`, `.obsidian/plugins/` |
| 21 | **#44's fill-in bet holds: no frontmatter change required** | **OBSERVED/INFERRED** — anchor is body-level (`Literature Note.md:29–32`); contract at `_frontmatterSchema.js:122–129`; rules at `:12–24` |
