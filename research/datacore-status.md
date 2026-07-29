# Datacore — is Dataview's successor a real option for ShadowVault?

Reference notes on **Datacore** (`blacksmithgu/datacore`), blacksmithgu's own declared successor to
Dataview, written to close the hole in `research/bases-vs-dataview.md`: that file weighed Bases
against Dataview and never checked whether Dataview has a live successor that isn't Bases. Every
status and capability claim below is cited to a primary source — the GitHub REST API against the
datacore and obsidian-dataview repos, Obsidian's own plugin registry, Datacore's published docs, its
`ROADMAP.md`/`CHANGELOG.md`/`manifest.json`, its **source code**, or the files in this vault.

- Datacore repo: <https://github.com/blacksmithgu/datacore> · docs: <https://blacksmithgu.github.io/datacore/>
- Dataview repo: <https://github.com/blacksmithgu/obsidian-dataview> · docs: <https://blacksmithgu.github.io/obsidian-dataview/>
- Obsidian plugin registry: <https://github.com/obsidianmd/obsidian-releases> (`community-plugins.json`)
- Companion file: `research/bases-vs-dataview.md`
- Audited: **2026-07-23**.

> **Version pinning.** Findings are pinned to Datacore **0.1.29** (published 2026-03-23, the latest
> release and the version in `manifest.json` on `master`), source tree at `master` as of
> **2026-06-21**. Dataview facts are pinned to **0.5.70** (2025-04-07). Obsidian facts carry over
> from `bases-vs-dataview.md` (public **1.12.7**, Catalyst **1.13.3**). This vault does **not** have
> Datacore installed — `.obsidian/community-plugins.json` lists 17 plugins and Datacore is not among
> them, and `.obsidian/plugins/datacore/` does not exist.
>
> **This picture moves — but slower than the Bases one.** Datacore has shipped **one** release in
> the last six months and its original author has not committed to it in **ten**. Anything below
> marked "not documented" or "not shipped" is worth re-checking in a quarter, but the cadence
> suggests a quarter is unlikely to change much.

---

## 0. Verdict

**No. Datacore does not change the Bases recommendation. The prior verdict stands — convert
`04 - MOCS/Entities.md` to Bases, leave everything else on Dataview — and Datacore's existence
strengthens rather than weakens it.**

Datacore is not the cheap escape hatch the framing hoped for. It is the **most expensive** of the
three options for this vault, and it does not buy out of the dependency risk that motivated the
question in the first place.

The four facts that decide it:

1. **Datacore is alive, but its author is not on it.** Last release **0.1.29 on 2026-03-23** (four
   months ago); last commit on `master` **2026-06-21**; **7 commits in the trailing six months, 29
   in the trailing twelve**. But **blacksmithgu's own last commit is 2025-09-15** and his last
   comment anywhere in the repo is **2025-09-22** — ten months of silence. 0.1.29 was cut by
   **@GamerGirlandCo**, not blacksmithgu, and its release notes are six community PRs; the release
   commit is a one-line `manifest.json` version bump by a first-time contributor, and
   **`CHANGELOG.md`'s newest entry is still 0.1.28**. Source: GitHub API on `blacksmithgu/datacore`,
   retrieved 2026-07-23. **The successor is in the same custody state as the thing it succeeds.**
   Migrating from Dataview to Datacore does not diversify away from blacksmithgu — it doubles down
   on him.
2. **There is no DQL, no conversion tool, and no declarative query block at all.** `src/main.ts`
   registers exactly four codeblock processors — `datacorejs`, `datacorejsx`, `datacorets`,
   `datacoretsx`. There is no `datacore` block. `ROADMAP.md`: "Views in Datacore are editable and no
   longer use the Dataview Query Language." The docs homepage: "non-javscript views similar to
   DataviewQL will be coming in the future!" The quickstart is blunter: "the non-Javascript
   functionality is not available yet, so if you don't know Javascript, the plugin may not be ready
   for you!" **All 46 of this vault's ` ```dataview ` blocks would become hand-written React
   components.** Bases turns those same 46 into YAML. Datacore is not competing with Bases on equal
   footing — it is losing to it on the cheap half of the vault by a wide margin.
3. **What Datacore genuinely wins is exactly what Bases cannot do, and this vault barely uses it
   today.** `dc.require()` is a true `dv.view()` analogue — better, in fact (§5) — so **ADR 0004's
   architecture survives a Datacore migration and does not survive a Bases one**. And Datacore
   indexes at sub-file granularity (`@section`, `@block`, `@list-item`, `@task`, `@codeblock`,
   `@datablock`), which is the thing `bases-vs-dataview.md` correctly identified as architecturally
   impossible in Bases. Those are real differentiators. They are also worth **zero** to a vault with
   **0 `TASK` queries and 0 `CALENDAR` queries** today.
4. **It is still 0.1.x after three years and seven months, and its README overstates what ships.**
   Twenty-nine non-prerelease releases, every one `0.1.x`; no `1.0`, no stable line. The README
   claims "**Live Editing**: Values inside of table views can now be edited" — `ROADMAP.md` has
   **Inline Editing unchecked**, `TableViewProps` in the docs exposes no editing property, and the
   strings `editable`/`Editable` appear **zero times across all 81 `.ts`/`.tsx` files in `src/`**.
   Live editing, the headline reason to prefer Datacore over Dataview, **is not shipped**. When a
   project's README and its source disagree, that is a maturity signal, not a footnote.

**One genuine correction to the prior file's mental model, though.** `bases-vs-dataview.md` treats
Dataview's freeze as an argument for *starting* a migration. That is right, but Datacore changes
*where* the contingency should point. If Dataview ever actually breaks, the dashboards — the 5
DataviewJS blocks behind ADR 0004 — have a **better** landing spot in Datacore than in Bases,
because `dc.require()` preserves the single-definition property that Bases can only approximate with
a shared `.base` file. So the honest position is: **Bases for the simple queries, Datacore as the
designated contingency for the badge surface, Dataview until something forces the issue.** That is
three query languages in theory and one in practice, which is the correct amount today.

**Revisit Datacore when either** (a) blacksmithgu resumes committing, or (b) a `1.0` or a
non-JavaScript view type ships. Neither has a date. Until then it is a bookmark, not a plan.

---

## 1. Three-way comparison

Axes chosen for what actually constrains this vault. Bases and Dataview columns carry over from
`research/bases-vs-dataview.md`; Datacore claims are sourced in §2–§6 below.

| | **Bases** (core, 1.12.7) | **Dataview** (0.5.68 installed / 0.5.70 latest) | **Datacore** (0.1.29) |
|---|---|---|---|
| Maintenance / dependency risk | First-party, actively shipping. Young: launched Aug 2025 | **Frozen.** No release since 2025-04-07, no `master` commit since 2025-04-08, 660 open issues, not archived, no deprecation notice | **Alive but author-dormant.** 1 release in 6 months; **blacksmithgu's last commit 2025-09-15**; 0.1.29 cut by a contributor; 58 open issues / 12 open PRs |
| Stable release | n/a — ships with Obsidian | 0.5.70, stable line for 5 years | **None.** 29 non-prerelease releases, all `0.1.x`, over 3y7m |
| Distribution channel | Core plugin, no install | Community registry | **Community registry** — listed since **2025-09-09**. BRAT is the *beta* channel only, not the only channel |
| Install base | n/a | **4,610,646** downloads | **301,626** downloads (~6.5% of Dataview) |
| Reads frontmatter | Yes | Yes | Yes — first-class |
| Reads inline `key:: value` | **Not documented anywhere** | Yes, three syntaxes | **Yes** — `[key:: value]`; `indexInlineFields: true` in shipped defaults, though the docs steer you to properties |
| Sub-file / task granularity | **None — a row is a file** | Files, tasks, list items | **Yes, deepest of the three** — `@page @section @block @block-list @codeblock @datablock @list-item @task @file`, plus `parentof()`/`childof()`/`subtree()`/`supertree()` and canvas nodes |
| Shared-code seam (ADR 0004) | **None.** `registerBasesView` is views-only; no user-function API | **Yes** — `dv.view()` | **Yes — `dc.require()`**, and stronger: loads `.js/.ts/.jsx/.tsx` from the vault *or* a codeblock addressed by `dc.headerLink()`, caches by path, detects cycles |
| Query language | YAML `.base` (declarative) | DQL (declarative) + DataviewJS | **JS/JSX only.** Query *strings* are a set algebra (`@page and #game and rating >= 9`); the *view* is a React component |
| Declarative, no-JS blocks | Yes | Yes | **No — explicitly "coming in the future"** |
| Expression language | Bases functions (no `length()`, no `FLATTEN`) | Dataview expressions | **Dataview's expression language, near-verbatim** — `length()`, `default()`, `choice()`, `contains()`, `sum`, `reduce`, `filter`, `map`, `date`, `dur`, `regexmatch`, … |
| Current-file context | `this` (embedding file) | `this.file`, `FROM [[]]` | `dc.useCurrentFile()` / `dc.useCurrentPath()`; `linkedto()`/`linkedfrom()`/`connected()` |
| View types shipped | table, cards, list, map (map needs the Maps plugin) | table, list, task, calendar | Components: `Table`, `List`, `Cards`/`Card`, `Callout`, `Markdown`, `Embed`, plus form primitives (`Button`, `Checkbox`, `Slider`, `Switch`, `Textbox`, `VanillaSelect`) — but you assemble them yourself in JSX |
| Inline editing of values | **Yes** — table view, with undo/redo | **No** — "displaying, not editing" | **No.** README claims it; `ROADMAP.md` unchecked; **zero `editable` occurrences in `src/`** |
| JS enabled by default | n/a | `enableDataviewJs: false` stock (this vault ships `true`) | **`enableJs: false` in shipped defaults — and JS is the only interface.** Out of the box Datacore renders nothing |
| Mobile | Yes | Yes (`isDesktopOnly: false`) | `isDesktopOnly: false` in `manifest.json`; `minAppVersion: 1.4.11`. Issue #172 "Does it support mobile?" is **open and unanswered** since 2026-05-10 |
| Renders on GitHub | No | No, but DQL text is visible in the fence | No, but JSX text is visible in the fence |
| **Migration cost from this vault's current state** | **Low for 27 blocks, blocked for ~4, hard for 5** (badge surface) | **Zero** | **Highest of the three.** 46 DQL blocks → 46 React components; 5 DataviewJS blocks → JSX port; `badge-table/view.js` needs restructuring (§5); no conversion tool exists |

---

## 2. Is it alive? The numbers

All from the GitHub REST API on `blacksmithgu/datacore`, retrieved **2026-07-23**.

**Repo state**

| | |
|---|---|
| Created | 2022-12-26 (3 years, 7 months) |
| Default branch | `master` |
| Archived / disabled / fork | **false / false / false** |
| License | MIT |
| Description (first-party) | *"Work-in-progress successor to Dataview with a focus on UX and speed."* |
| Stars / watchers | 2,211 / 93 |
| Open issues | **58** |
| Closed issues | 45 |
| Open PRs | **12** |
| Merged PRs | 45 |
| `pushed_at` | 2026-06-22 |

**Releases**

| | |
|---|---|
| Latest release | **0.1.29, published 2026-03-23** (4 months ago) |
| Total releases | **31** — 29 non-prerelease, 2 prerelease (`0.1.20-rc1`, `0.1.20-rc5`) |
| Any non-prerelease? | **Yes** — 29 of them. But every one is `0.1.x`; there has never been a `0.2` or `1.0` |
| Releases in trailing 6 months | **1** (0.1.29) |
| Releases in trailing 12 months | **5** — 0.1.25/26/27/28 all on 2025-09-15, then 0.1.29 |

**Commits on `master`**

| | |
|---|---|
| Last commit | **2026-06-21** — @aaandreeew, "Match block IDs according to Obsidian spec" |
| Commits in trailing 6 months (since 2026-01-23) | **7** — @aaandreeew ×1, @btfash-believer-1976 ×1, @beto-group ×5. **Zero by blacksmithgu.** |
| Commits in trailing 12 months (since 2025-07-23) | **29** — 14 by blacksmithgu (all on or before 2025-09-15), 15 by others |
| **blacksmithgu's last commit** | **2025-09-15** ("Auto-release 0.1.28") |
| **blacksmithgu's last comment in the repo** | **2025-09-22** (issue #137, "Thank you!") |

**Who is actually maintaining it.** The 0.1.29 release was published by **@GamerGirlandCo**. Its body
is six community PRs from @LtHommel, @Gudine, @cnamqui, @beto-group and @btfash-believer-1976 — five
of them first-time contributors. The release-tagging commit is a **one-line `manifest.json` version
bump** (`"version": "0.1.28"` → `"0.1.29"`) authored by @btfash-believer-1976 with the message
"prepare for release". **`CHANGELOG.md`'s newest entry is `# 0.1.28`** — 0.1.29 has no changelog
entry at all.

**Read that honestly.** It is not abandonment: the repo has a real contributor bench that keeps
landing bugfixes and cut a release without the author. But it is not a project with an owner
steering it either. The unanswered issues are the tell — #168, *"Q: Is it ready to replace
Dataview?"* (2026-04-28), drew six community replies and **no maintainer response**; #172, *"Does it
support mobile?"* (2026-05-10), has **zero comments**; #5, *"Migration from Dataview to Datacore"*,
has been **open since 2023-02-09**.

**For contrast, Dataview** (same API, same date): latest release **0.5.70 (2025-04-07)**, last
`master` commit **2025-04-08** (@holroy, "Updated beta-release script with pre-release tags"), **660
open issues**, not archived, 9,213 stars. *(Note for the prior file: Dataview's repo-level
`pushed_at` is **2025-11-17**, which looks like activity but is a push to a non-default branch —
`master` really is untouched since 2025-04-08. The prior file's claim is correct; the nuance is
worth recording so a future reader doesn't think it's stale.)*

---

## 3. Is it a real successor? What is actually stated, and by whom

**From Datacore — yes, three times, first-party, and all three hedge:**

- Repo description: *"**Work-in-progress** successor to Dataview with a focus on UX and speed."*
- `README.md`: *"Datacore is a **work-in-progress** re-imagining of [Dataview] with a focus on 2-10x
  better query and rendering performance, as well as fully interactable views."*
- `docs/docs/dataview/index.md`: *"Datacore is a **direct successor** to the dataview plugin, which
  serves the same core function… Datacore comes with a few important changes over it's
  predecessor."* It then claims "up to 100 times faster than dataview" — **no benchmark, dataset, or
  methodology is published anywhere in the repo or docs. Treat the number as a claim, not a
  measurement.**

**From Dataview — nothing. Verified independently and the answer is stronger than "no notice":**

I downloaded `blacksmithgu/obsidian-dataview@master` in full and grepped every `.md`, `.json`,
`.yml`, and `.ts` file for the string `datacore`, case-insensitively. **Zero files match.** The
README, the docs homepage, the changelog, the manifest — none of them mention Datacore, and none
carry a maintenance, deprecation, or hand-off notice of any kind.

This is not an oversight nobody raised. Dataview issue **#1825** — *"Mention that DataCore is in
development on both the GitHub readme and the documentation homepage, even if there isn't an ETA
yet"* (opened 2023-03-03) — asked for exactly this, proposing the wording. It was **closed as
"completed" on 2024-03-20 with no comments, and the notice does not exist in the repo today.**

**So the successor relationship is one-directional and asymmetric:** Datacore claims Dataview's
inheritance; Dataview has never acknowledged it. A user arriving at Dataview today gets no signal
that a successor exists. That materially weakens the "Dataview has a designated successor, so relax"
reading — the designation exists only on the side that benefits from it, and the person who would
have to make it official has not touched either repo in ten months.

---

## 4. Is there a migration path from Dataview?

**This is the crux, and the answer is: no automated path exists, and the manual path is the most
expensive of the three options.**

**Does Datacore read DQL? No.** `src/main.ts` registers exactly four markdown codeblock processors:

```ts
this.registerMarkdownCodeBlockProcessor("datacorejs",  …);
this.registerMarkdownCodeBlockProcessor("datacorejsx", …);
this.registerMarkdownCodeBlockProcessor("datacorets",  …);
this.registerMarkdownCodeBlockProcessor("datacoretsx", …);
```

There is no `datacore` block, no DQL parser, and no compatibility shim. `ROADMAP.md` states the
design intent plainly: *"Views in Datacore are editable and **no longer use the Dataview Query
Language**. You can still write complex-looking statements / columns using the Dataview **Expression**
Language (a subset of the query language which supports math, string operations, list operations,
and so on)."* The expressions survive; the query language does not.

**Does Datacore read `key:: value` inline fields? Yes.** `docs/docs/data/fields.md`: *"You can add
'inline' metadata anywhere in the page via the `[key:: value]` syntax."* `src/settings.ts` ships
`indexInlineFields: true` in `DEFAULT_SETTINGS`, so it is **on by default**, contrary to
`ROADMAP.md`'s "Inline fields will be opt-in instead of on by default" (marked `[X]` — another
roadmap/source disagreement). The docs do editorialize: *"Properties are officially supported by
Obsidian but inline fields are not; when possible, consider using properties and tags over inline
fields."* And `ROADMAP.md` records that *"Obsidian has… recommended that Datacore move away from
inline fields (since they are much more bespoke)."*

**Is there any documented conversion? No — and the intent to build one is thirteen releases old and
unfulfilled.** Datacore issue **#5, "Migration from Dataview to Datacore"**, is **still open** since
2023-02-09. blacksmithgu's reply the next day is the only first-party statement on the subject:

> "All metadata formats are still supported. Dataview blocks can be translated to datacore editable
> blocks automatically. I haven't decided on DataviewJS yet, since the changes there are more
> substantial. The easiest route may just be to provide a legacy API layer so existing scripts
> continue to run, since an automatic rewrite tool is unlikely to be feasible."
> — @blacksmithgu, 2023-02-10

Neither the automatic translation nor the legacy API layer exists in 0.1.29. There is no converter
script in `scripts/`, no `dataview` compatibility module in `src/`, and no mention of conversion in
the docs. **Every query is a hand rewrite — and unlike Bases, the rewrite target is a React
component, not a filter expression.**

**The one thing that ports cheaply** is the *expression* half. `docs/docs/expressions/functions.md`
documents essentially Dataview's function library intact: `length()`, `default()`, `choice()`,
`contains()`/`icontains()`/`econtains()`, `containsword()`, `sum`, `product`, `reduce`, `average`,
`minby`/`maxby`, `filter`, `map`, `flat`, `slice`, `sort`, `reverse`, `join`, `nonnull`, `all`/`any`/
`none`, `regextest`/`regexmatch`/`regexreplace`, `replace`, `lower`/`upper`, `split`, `startswith`/
`endswith`, `substring`, `truncate`, `padleft`/`padright`, `date`, `dur`, `striptime`,
`dateformat`, `durationformat`, `localtime`, `link`, `elink`, `embed`, `meta`, `typeof`, `hash`,
`object`, `list`, `number`, `string`. **`length()` and `default()` both exist — the two functions
`bases-vs-dataview.md` §3 flags as missing from Bases.** So the WHERE-clause logic of this vault's
queries transfers nearly verbatim; it is the SELECT-and-render half that has to be rebuilt.

---

## 5. What is the query model, and does ADR 0004 survive?

**Two layers, both first-party documented.**

**Layer 1 — the query string** (`docs/docs/data/query.md`). A set algebra over indexed objects,
passed as a string to `dc.query()` / `dc.useQuery()`:

- **Type queries:** `@file`, `@page`, `@section`, `@block`, `@block-list`, `@codeblock`,
  `@datablock`, `@list-item`, `@task`
- **Tags:** `#tag`, including hierarchical (`#philosophy/natural`)
- **Links:** `linkedto([[X]])`, `linkedfrom([[X]])`, `connected([[X]])`
- **Paths:** `path("path/to/folder")`
- **Presence:** `exists(rating)`
- **Tree traversal:** `parentof(q)`, `childof(q)`, and their inclusive forms `supertree(q)`,
  `subtree(q)`
- **Arbitrary expressions:** `rating >= 9`, `$name.contains("Daily")`, `$row["last reviewed"] >= date(now) - dur(7d)`
- **Combinators:** `and`, `or`, `!`

**Sub-file granularity is real and is the deepest of the three tools.** `@task and $completed = false
and childof(@section and $name = "Daily")` is a documented example. Canvas files are indexed
(`ROADMAP.md`, `[X] Canvas Files`). Images, videos and PDFs are **not** — those roadmap boxes are
unchecked, and `manifest.json` makes no claim.

**Layer 2 — the view** is a preact/React component in a `datacorejsx` block. There is no declarative
alternative. The `dc` API surface, enumerated from `src/api/local-api.tsx`:

- **Query hooks:** `useQuery`, `useFullQuery`, `useFile`, `useCurrentFile`, `useCurrentPath`,
  `useIndexUpdates`, `useArray`, `useInterning`
- **Direct queries:** `query`, `tryQuery`, `fullquery`, `tryFullQuery`, `parseQuery`, `tryParseQuery`
- **Expressions:** `evaluate`, `tryEvaluate` (with variable bindings and a source path)
- **Links:** `fileLink`, `headerLink`, `blockLink`, `parseLink`, `tryParseLink`, `resolvePath`
- **Coercion:** `coerce.{string,boolean,number,date,duration,link,array}`
- **React hooks forwarded:** `useState`, `useReducer`, `useMemo`, `useCallback`, `useEffect`,
  `useRef`, `createContext`, `useContext`
- **Components:** `Table`, `VanillaTable`, `List`, `Card`, `Callout`, `Markdown`, `Link`,
  `LinkEmbed`, `SpanEmbed`, `Group`, `Stack`, `Icon`, `Literal`, and form primitives `Button`,
  `Checkbox`, `Slider`, `Switch`, `Textbox`, `VanillaSelect`
- **Code sharing:** `require`

### Does `dc.require()` preserve ADR 0004? Yes — and it is a better seam than `dv.view()`

This is the single most important finding for this vault, and it is the one place Datacore clearly
beats both alternatives.

`docs/docs/code-views/index.md`, "Sharing Code": *"You can split code up into common snippets that
can then be imported by other scripts using `dc.require`. Common snippets can either be placed
directly into `js/ts` files in your vault, OR they can be placed into codeblocks and imported by the
name of the section the codeblock is in."*

```jsx
const { ListItem } = await dc.require(dc.headerLink("scripts/lists.md", "ListItem"));
```

`src/api/script-cache.ts` confirms the implementation: `FILE_EXTENSIONS` accepts `tsx`, `jsx`, `js`,
`ts`; `SCRIPT_LANGUAGES` additionally accepts codeblocks tagged `js`/`javascript`/`ts`/`typescript`/
`jsx`/`tsx`/`datacore*`. Scripts are resolved through the **Datastore** (vault-relative), cached by
fully-qualified path, and loaded recursively with an explicit circular-dependency error.

**Check this against ADR 0004's rejected alternatives, one by one:**

| ADR 0004 rejected | Why | Does `dc.require()` have the same problem? |
|---|---|---|
| `require()` of a plain module | "Resolves against the plugin directory on desktop Electron and not at all on mobile" | **No.** Resolves against the *vault* via the Datastore; `isDesktopOnly: false` |
| `dv.io.load()` + `new Function(src)` | "Hand-rolls a module loader inside a note and recompiles the file on every render" | **No.** The loader is first-party and `ScriptCache` caches by path |
| The CustomJS plugin | "A whole new required plugin to avoid a settings toggle" | **Partly.** Datacore *is* a new required plugin — but it would be replacing Dataview, not adding to it |

So the answer ADR 0004 wanted and could not have in 2026 exists in Datacore. **Bases has no analogue
at all** (`bases-vs-dataview.md` §6 — `registerBasesView` is views-only, no user-function API).

**But the migration is not free, and the trap is specific.** `dc.require` evaluates scripts via
`asyncEvalInContext` → `new Function(...keys, script)(...values)` (`src/utils/javascript.ts`). **The
module's value is whatever the script `return`s.** The docs are explicit: *"The return is important
here — `dc.require` literally calls this code as a function and yields whatever this codeblock
returns. If you are used to `import`-style includes in modern ECMAScript, this may look a bit
weird."*

`99 - Meta/05 - Views/badge-table/view.js` does **not** return anything. It is a `dv.view()` script
with a dual-mode guard keyed on `typeof dv` — the export branch assigns to `module.exports` so that
`dashboardEnums.test.js` can `require()` it under Node. Under `dc.require`:

- `module.exports = …` inside a `new Function` body would resolve `module` against the **Electron
  global on desktop** and fail on mobile — **the exact failure mode the file's own header comment
  documents** ("Guarding on it took the export branch in BOTH environments — the view assigned its
  maps to a stray global and rendered nothing at all, with no error, because nothing threw").
- The file would need a third branch or a restructure: export the maps by `return`ing them, and keep
  a Node-compatible path so `dashboardEnums.test.js` still machine-checks `METADATA.md`'s
  single-source-of-truth claim.

That is a contained, well-understood edit to **one** file — cheap next to rewriting 46 queries, and
cheap next to the Bases path, which has no seam at all. **If the badge dashboards ever have to leave
Dataview, Datacore is where they should go.** That is a genuine change to the contingency plan, and
it is the one thing this research alters.

### ADR 0005 under Datacore

**Fully compatible, and Datacore's own docs endorse the ADR.** ADR 0005 established that "inline
fields declare data frontmatter doesn't have; they never restate it" and that anything worth querying
is promoted to frontmatter. Datacore indexes frontmatter first-class (`docs/docs/data/fields.md`,
`page.value("rating")`, `page.field("rating")`) and independently recommends the same discipline:
*"Properties are officially supported by Obsidian but inline fields are not; when possible, consider
using properties and tags over inline fields."*

The vault's seven deliberately-empty prose placeholders (`citation::`, `hypothesis::`,
`methodology::`, `results::`, `summary::`, `context::`, `significance::`, from
`sourceCaptureBook.js` and `sourceCapturePaper.js`) would be indexed as empty fields under Datacore's
default `indexInlineFields: true` — harmless, exactly as they are under Dataview today, and
suppressible by turning that setting off. **ADR 0005 costs nothing and buys nothing under Datacore**;
unlike the Bases case, where it turned out to be the decisive enabler.

---

## 6. What breaks? The 51 blocks under Datacore

Inventory re-verified today against the working tree (excluding `.claude/worktrees/`): **46
` ```dataview ` + 5 ` ```dataviewjs ` = 51**, plus 2 DQL blocks generated at capture time by
`99 - Meta/02 - Scripts/sourceCaptureLecture.js`. Five `dv.view("99 - Meta/05 - Views/badge-table", …)`
call sites — 1 in `08 - Nexus/00 - Inbox Dashboard.md`, 4 in `08 - Nexus/09 - Main Dashboard.md`.

| Surface | Blocks | Under **Bases** | Under **Datacore** |
|---|---|---|---|
| `04 - MOCS/Entities.md` | 10 `LIST FROM #tag AND "folder"` | **One `.base`, ten list views.** Cheapest possible migration | `dc.useQuery('@page and #agent/person and path("09 - Entities/Agents")')` + `<dc.List>` — trivial *logic*, but ten JSX components where Bases needs ten YAML stanzas |
| 13 entity/MOC templates (14 blocks) | `FROM [[]]` link context | `file.hasLink(this.file)` in a ` ```base ` fence | `dc.useCurrentFile()` + `linkedto()` — expressible, but each template now carries a React component; `templater-lint` and the template fixtures move with it either way |
| 3 Main Dashboard link-count blocks | `length(file.outlinks) < 2`, sort by `length(file.inlinks)` | **Blocked** — no documented Bases `length()` | **Works.** `length()` is in Datacore's function reference. Datacore's only clean win over Bases on the DQL side |
| Sources Dashboard "By Source Type" | `FLATTEN file.tags … GROUP BY Tag` | **Blocked** — no `FLATTEN`, `groupBy`-on-list undocumented | **Works.** `dc.useArray(pages, a => a.groupBy(…))` and `dc.Table`'s `groupings` prop are both documented |
| Sources Dashboard `default(default(…))` | Creator/Published coalesce | Nested `if()` — verbose but expressible | **Works verbatim** — `default()` exists |
| Periodic templates (7 blocks) | Baked date literals | Templater `<% %>` interpolates inside a ` ```base ` fence | Same — interpolates inside a ` ```datacorejsx ` fence too |
| **5 badge DataviewJS blocks** (ADR 0004) | 4 in Main, 1 in Inbox | **Hardest surface.** Either an `if()` cascade (the drift ADR 0004 killed) or one shared `.base` + `dashboardEnums.test.js` rewritten to parse YAML | **Easiest surface of the three.** `dc.require("99 - Meta/05 - Views/badge-table/view.js")`, port the render to `<dc.Table>`, restructure the file's export guard (§5). ADR 0004's decision record survives intact |
| 2 generated blocks in `sourceCaptureLecture.js` | `FROM [[]] AND !#source`, `WHERE contains(course, [[…]])` | Emits ` ```base ` YAML; fixture-checked output changes | Emits a JSX component into every lecture note — **the worst outcome of the three**, since capture-generated notes would each carry a React block |
| `REVIEW-SYSTEM.md` DQL example | Documentation, not live | Leave or document both | Same |

**The shape of it.** Bases is cheap for the ~27 simple blocks and blocked or awkward for the ~9 hard
ones. Datacore is *capable* on all 51 — every documented Bases gap (`length`, `FLATTEN`, `default`,
user functions, task granularity) is closed — but it charges a React component per block, including
for the ten one-line `LIST FROM` fences where Bases charges four lines of YAML. **Capability is not
the binding constraint on this vault; migration cost and legibility are**, and on both of those
Datacore loses to Bases for the easy half and wins only on the badge surface.

Two costs the table understates:

1. **`enableJs: false` is the shipped default** (`src/settings.ts`) and JS is Datacore's **only**
   interface. ADR 0004 already carries the consequence "`enableDataviewJs` is off in stock Dataview…
   existing vaults with their own settings do not [get ours]" and mitigates it with a visible callout
   per converted section. Under Datacore that caveat applies to **every query in the vault**, not
   four blocks.
2. **GitHub legibility gets worse, not better.** `CLAUDE.md` records that documentation links were
   deliberately converted to relative Markdown paths for GitHub compatibility. A ` ```dataview `
   fence shows a readable four-line query; a ` ```datacorejsx ` fence shows twenty lines of JSX.
   *(Inference from the file format — **not verified** against a primary source.)*

---

## 7. What should change in `research/bases-vs-dataview.md`

**The verdict stands. Do not change it.** Four smaller amendments would make that file more accurate
— recorded here, **not applied** (per instruction, that file is untouched):

1. **§0 fact 1** — after "Dataview is functionally frozen, but not broken," add that a first-party
   successor exists (`blacksmithgu/datacore`, in the Obsidian registry since 2025-09-09) but is
   itself author-dormant since 2025-09-15, so it is **not** a rescue and does not reduce the freeze
   risk. Without this, the file reads as though Bases is the only alternative, which is not true.
2. **§0 fact 3, §6, and Bucket C** — the claim "`dv.view()` has no Bases analogue" is correct, but
   the implicit "and no analogue anywhere" is not. **`dc.require()` is a strictly better analogue**,
   and it is the reason the badge dashboards' contingency should point at Datacore rather than at a
   shared `.base` file. This is the one substantive change this research produces.
3. **§1 feature table** — either extend to three columns or add a Datacore row under Maintenance.
   Two axes flip in Datacore's favour and should be recorded: **`length()` and `default()` both
   exist** (§3 flags both as Bases gaps), and **sub-file/task granularity ships** (§2 flags it as
   architecturally impossible in Bases).
4. **§9 dependency risk (Dataview)** — add the nuance that the repo's `pushed_at` is **2025-11-17**
   (a non-default-branch push) while `master` really is untouched since **2025-04-08**, so a future
   reader checking the repo page doesn't conclude the file is stale. Also worth recording: **zero
   files anywhere in the Dataview repo contain the string "datacore"** — the "no maintenance notice"
   claim is stronger than stated.
5. **§12 next steps** — add a watch item alongside the existing two triggers: *revisit Datacore if
   blacksmithgu resumes commits or a `1.0`/non-JS view type ships.* Neither has a date.

**And one thing that does not change:** step 2, "Convert `04 - MOCS/Entities.md` only." Datacore
would make that file *more* expensive, not less. The Bases plan is still the right first move.

---

## Sources consulted

All retrieved **2026-07-23**.

**Datacore first-party (GitHub API on `blacksmithgu/datacore`)**
- `GET /repos/blacksmithgu/datacore` — archived/disabled/fork flags, description, stars, watchers, `open_issues_count` 70, `pushed_at`, default branch, license
- `GET /repos/blacksmithgu/datacore/releases` (paginated) — 31 releases, 29 non-prerelease, latest 0.1.29 (2026-03-23), all `0.1.x`
- `GET /repos/blacksmithgu/datacore/releases/tags/0.1.29` — published by @GamerGirlandCo; body = six community PRs; assets `main.js`/`manifest.json`/`styles.css`
- `GET /repos/blacksmithgu/datacore/commits?sha=master` (+ `since=`, `author=`) — 7 commits in 6 months, 29 in 12; last commit 2026-06-21; blacksmithgu's last commit 2025-09-15
- `GET /repos/blacksmithgu/datacore/commits/6a1aa73` — the 0.1.29 release commit: a one-line `manifest.json` version bump
- `GET /search/issues` — 58 open issues, 45 closed, 12 open PRs, 45 merged
- `GET /repos/blacksmithgu/datacore/issues/comments` — blacksmithgu's last comment 2025-09-22
- Issues **#1** ("The Plan"), **#5** ("Migration from Dataview to Datacore", open since 2023-02-09, blacksmithgu's 2023-02-10 reply on automatic translation / legacy API layer), **#168** ("Q: Is it ready to replace Dataview?", no maintainer reply), **#172** ("Does it support mobile?", zero comments)

**Datacore first-party (repo contents at `master`)**
- `README.md` — "work-in-progress re-imagining of Dataview"; the "Differences from Dataview" list, including the unshipped Live Editing claim
- `ROADMAP.md` — "no longer use the Dataview Query Language"; checked/unchecked feature state; inline-field and Obsidian-recommendation notes
- `CHANGELOG.md` — newest entry `# 0.1.28`
- `manifest.json` / `manifest-beta.json` — `id: datacore`, `version: 0.1.29`, `minAppVersion: 1.4.11`, `isDesktopOnly: false`, author "Michael Brenan"
- `src/main.ts` — the four registered codeblock processors; `window.datacore`; reindex command
- `src/settings.ts` — `DEFAULT_SETTINGS`: `enableJs: false`, `indexInlineFields: true`, `indexListItems: true`, `defaultPagingEnabled: true`
- `src/api/local-api.tsx` — the full `dc` surface; `require()` doc comment ("similar to vanilla js `require()`, not `import`")
- `src/api/script-cache.ts` — `FILE_EXTENSIONS`, `SCRIPT_LANGUAGES`, path-keyed cache, circular-dependency error
- `src/utils/javascript.ts` — `evalInContext` / `asyncEvalInContext` via `new Function`; sucrase transpilation
- `src/api/ui/views/table.tsx` and all 81 `src/**/*.ts{,x}` — **zero occurrences of `editable`/`Editable`**

**Datacore docs (<https://blacksmithgu.github.io/datacore/>, and `docs/docs/` in the repo)**
- `index.md` — "currently in a power-user stage focused on javascript/typescript savvy users… non-javscript views similar to DataviewQL will be coming in the future"; npm package `@blacksmithgu/datacore`
- `quickstart.md` — "the non-Javascript functionality is not available yet"; BRAT documented as the **beta** channel only
- `dataview/index.md` — "direct successor to the dataview plugin"; the "100 times faster" claim
- `data/query.md` — `@type` list, `#tag`, `connected()`/`linkedto()`/`linkedfrom()`, `path()`, `exists()`, `parentof()`/`childof()`/`supertree()`/`subtree()`, combinators
- `data/fields.md` — `[key:: value]` inline syntax, `field()`/`value()`/`fields()`, the "prefer properties" recommendation
- `code-views/index.md` — JSX views, `dc.useQuery`, "Sharing Code" via `dc.require` + `dc.headerLink`
- `code-views/local-api.md` — full `dc` reference
- `code-views/table.md` — `TableViewProps` / `TableColumn` full reference (**no editing property**)
- `expressions/functions.md` — the full function library, incl. `length()`, `default()`, `choice()`

**Obsidian registry first-party**
- `obsidianmd/obsidian-releases` → `community-plugins.json` — 5,987 entries; contains `{"id":"datacore","name":"Datacore","author":"blacksmithgu","description":"An even faster reactive query engine for the data obsessed.","repo":"blacksmithgu/datacore"}`
- `GET /search/commits?q=repo:obsidianmd/obsidian-releases+datacore` — added by "Add Plugin: blacksmithgu/datacore (#6527)", **2025-09-09**
- `obsidianmd/obsidian-releases` → `community-plugin-stats.json` — datacore **301,626** downloads, dataview **4,610,646**

**Dataview first-party**
- `GET /repos/blacksmithgu/obsidian-dataview` — 660 open issues, not archived, 9,213 stars, `pushed_at` 2025-11-17
- `GET /repos/blacksmithgu/obsidian-dataview/commits?sha=master` — last `master` commit **2025-04-08** (@holroy)
- `GET /repos/blacksmithgu/obsidian-dataview/releases/latest` — 0.5.70, 2025-04-07, not a prerelease
- Full-tree content grep of `master` for "datacore" — **zero matching files**
- Issue **#1825** — request to add a Datacore notice to the README and docs homepage; closed "completed" 2024-03-20, no comments, **notice absent**

**This vault**
- `.obsidian/community-plugins.json`, `.obsidian/plugins/` — 17 plugins, **Datacore not installed**
- `docs/adr/0004-badge-rendering-dataviewjs.md` — the `dv.view()` interface, the rejected-alternatives table, the `enableDataviewJs` consequence
- `docs/adr/0005-inline-field-contract.md` — the frontmatter-only contract
- `99 - Meta/05 - Views/badge-table/view.js` — the `typeof dv` guard, the `module.exports` branch, the header comment on why guarding on `module` fails
- `08 - Nexus/*.md`, `04 - MOCS/*.md`, `99 - Meta/00 - Templates/*.md` — inventory re-verified: 46 ` ```dataview ` + 5 ` ```dataviewjs `, 5 `dv.view()` call sites
- `research/bases-vs-dataview.md` — the inventory, buckets, and verdict this file feeds into

**Secondary sources.** One block of community commentary is quoted in §2 and is **labelled
secondary**: the replies on Datacore issue #168 from @roman-balzer ("It's ready, i'm using it for
most stuff… it's not that well documented and… more developer focused") and @FrBosquet ("I don't see
it as a direct replacement… you need to be somehow familiar with Preact and JS"). They stand in for
*nothing* — no capability claim rests on them. They are cited only as evidence that **the maintainer
did not answer the question**, which is a fact about the repo, not about the plugin. No Reddit,
forum, YouTube, or blog source was consulted for any claim.

**Explicitly "not documented"** (do not assume either way): whether Datacore works on Obsidian
mobile in practice (`isDesktopOnly: false` is declared, issue #172 asking is unanswered); any
benchmark, dataset, or methodology behind the "2-10x" and "100 times faster" performance claims;
whether the shipped `dc.Table` will gain inline editing and on what timeline; whether a
non-JavaScript / DQL-like view type is still planned or has been quietly dropped; whether
`dc.require`-loaded `.js` files in `99 - Meta/05 - Views/` would interact badly with Templater's
User Scripts loader (untested — the folder is deliberately outside `02 - Scripts/`); whether Datacore
and Dataview can be installed simultaneously without index or performance conflict; and any statement
from blacksmithgu after **2025-09-22** about the future of either project.
