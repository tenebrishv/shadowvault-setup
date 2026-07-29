# Obsidian Bases vs. Dataview — should ShadowVault migrate?

Reference notes comparing the **Bases** core plugin against the **Dataview** community plugin, for
the decision of whether and where to move this vault's 51 query blocks. Every capability claim is
cited to a primary source: Obsidian's own help docs (`obsidian.md/help/bases`), the Obsidian
changelog, the official roadmap, the Obsidian developer docs, Dataview's own docs and its GitHub
repo, or the files installed in this vault.

- Bases docs: <https://obsidian.md/help/bases> (the `help.obsidian.md/bases` URLs now 301 to `obsidian.md/help/bases`)
- Obsidian roadmap (first-party, ship dates): <https://obsidian.md/roadmap/>
- Dataview docs: <https://blacksmithgu.github.io/obsidian-dataview/> · repo: <https://github.com/blacksmithgu/obsidian-dataview>
- Audited: **2026-07-23**.

> **Version pinning.** Findings are pinned to Obsidian **1.12.7** (public, 2026-03-23) with Catalyst
> early-access at **1.13.3** (2026-07-21). Source: <https://obsidian.md/changelog/>. This vault's
> `.obsidian/` stores **no Obsidian version marker** — the only floor available is the installed
> Media Extended `minAppVersion: 1.12.0` (`.obsidian/plugins/media-extended/manifest.json`), so the
> vault is running **≥ 1.12.0**. Confirm the actual build in Settings → About before acting.
>
> **This picture moves.** Bases shipped in August 2025 and gained List/Map/groupBy/summaries/API in
> November 2025 and search in February 2026; **Kanban view is "in progress"** and **Calendar view**
> and **Publish support** are "planned" *right now*. Source: <https://obsidian.md/roadmap/>. Anything
> below marked "not documented" is worth re-checking in a quarter.

---

## 0. Verdict

**Do not migrate the vault to Bases. Migrate exactly one file — `04 - MOCS/Entities.md` — and leave
everything else on Dataview.**

The four facts that decide it:

1. **Dataview is functionally frozen, but not broken.** Last release **0.5.70 on 2025-04-07**; last
   commit on the default branch **2025-04-08**; **660 open issues**; repo **not archived** and
   carrying **no maintenance or deprecation notice**. Source: GitHub API on
   `blacksmithgu/obsidian-dataview`, retrieved 2026-07-23. That is ~15 months of no releases — real
   dependency risk, but risk of *future* breakage, not present breakage. It argues for starting a
   migration, not for finishing one.
2. **The usual blocker does not apply to this vault.** Bases reads note frontmatter and file
   metadata only; nothing in its documentation supports Dataview's `key:: value` inline fields
   (<https://obsidian.md/help/bases/syntax>). **ADR 0005 already banned inline fields as data
   carriers** — a repo-wide grep finds **zero** queried `::` fields, only seven deliberately empty
   prose placeholders in the Book/Paper capture bodies. The vault pre-paid the single most expensive
   part of a Bases migration eighteen months early.
3. **Bases has no escape hatch that reaches this vault's hardest surface.** There is a plugin API for
   custom *views* (`registerBasesView`, <https://docs.obsidian.md/plugins/guides/bases-view>) but
   **no documented API for custom functions or formulas**, and no DataviewJS equivalent. The badge
   tables (ADR 0004) exist precisely because *DQL has no user-function seam*; **Bases has no
   user-function seam either.** Migrating them means either nested `if()` cascades (the exact drift
   failure ADR 0004 was written to kill) or shipping a second first-party plugin.
4. **This repo is read on GitHub, and `.base` content is not.** `CLAUDE.md` records that
   documentation links were deliberately converted to relative Markdown paths *for GitHub
   compatibility*. A `![[Entities.base#People]]` line renders on GitHub as an unresolved embed with
   the query text living in a separate YAML file; a ` ```dataview ` fence at least shows its own
   query inline. (Inference from the file format, **not verified against a primary source** — GitHub
   has no documented `.base` renderer.)

**Why `Entities.md` specifically:** it is ten near-identical `LIST FROM #tag AND "folder"` queries
with no formulas, no badges, no `this`-context, and no aggregation. It maps one-to-one onto
`file.hasTag(…) && file.inFolder(…)` with a list view
(<https://obsidian.md/help/bases/syntax>, <https://obsidian.md/help/bases/views/list>), it collapses
ten fences into one `.base` with ten views, and it is the cheapest possible full-fidelity test of
whether Bases is pleasant to live with. If it isn't, you have reverted one file.

**Revisit the wider migration when either** (a) Dataview actually breaks on an Obsidian release, or
(b) Bases ships a documented list-length/count function and Kanban/Calendar land. Until then the
vault is paying a *maintenance* risk on Dataview, and would be paying a *capability and legibility*
cost on Bases. The first is cheaper today.

---

## 1. Feature comparison

| | **Bases** (core, 1.12.7) | **Dataview** (0.5.68 installed / 0.5.70 latest) |
|---|---|---|
| Ships with Obsidian | Yes, core plugin — enabled here (`.obsidian/core-plugins.json: "bases": true`) | No, community plugin |
| Reads frontmatter | Yes — `note.price` or bare `price` ([syntax]) | Yes ([docs]) |
| Reads inline `key:: value` | **Not documented anywhere** ([syntax]) | Yes, three syntaxes ([annotation]) |
| Row granularity | **Files only** ("view, edit, sort, and filter **files** and their properties", [bases]) | Files, **plus tasks and list items as first-class objects** ([docs]) |
| File metadata | `file.name/path/ext/folder/size/mtime/ctime/tags/links/backlinks/embeds` ([syntax]) | `file.name/path/link/folder/ext/tags/etags/inlinks/outlinks/ctime/cday/mtime/mday/size/starred/lists/tasks` ([docs]) |
| Query format | YAML: `filters`, `formulas`, `properties`, `summaries`, `views[]` with `type/name/limit/filters/order/groupBy/summaries` ([syntax]) | DQL: `TABLE/LIST/TASK/CALENDAR` + `FROM/WHERE/SORT/GROUP BY/FLATTEN/LIMIT` ([docs]) |
| Task queries | **None** — no `TASK` equivalent | `TASK` ([docs]) |
| Calendar view | **Planned, not shipped** ([roadmap]) | `CALENDAR` ([docs]) |
| Kanban/board view | **In progress, not shipped** ([roadmap]) | No (DataviewJS only) |
| Views shipped today | table, cards, list, map *(map needs the separate Maps community plugin)* ([views], [map]) | table, list, task, calendar |
| Grouping | `groupBy` (shipped Nov 2025) ([syntax], [roadmap]) | `GROUP BY` |
| `FLATTEN` (expand a list into rows) | **Not documented** | Yes ([docs]) |
| Aggregation | `summaries`, per-view, with built-ins plus custom formulas over a `values` list ([syntax], [roadmap]) | `length(rows)`, `sum`, etc. inside `GROUP BY` |
| List length / count function | **Not documented** in the function reference ([functions]) — `reduce()` is the workaround | `length()` |
| Date math | `date + "1M"`, `now() - "2h"`, units y/M/d/w/h/m/s ([syntax]) | Luxon durations |
| Current-file context | **`this`** — in an embedded base, points to the **embedding** file ([syntax]) | `this.file`, `FROM [[]]` |
| Arbitrary JS | **No** | **Yes** — DataviewJS, plus `dv.view()` shared modules |
| Custom functions/formulas API | **Not documented** | n/a (DataviewJS is the seam) |
| Custom view API | **Yes** — `registerBasesView` / `BasesView` ([dev]) | No |
| Inline editing of values | **Yes** — table view supports editing with undo/redo (`Ctrl-Z`/`Ctrl-Shift-Z`) ([table], [1.10.0]) | **No** — "Dataview is about displaying, not editing" ([docs]) |
| Embed in a note | ` ```base ` code block, `![[File.base]]`, `![[File.base#View]]` ([create-base]) | ` ```dataview ` / ` ```dataviewjs ` fences, inline `=` / `$=` |
| Mobile | Yes (Bases fixes appear in mobile changelogs) ([1.11.0-mobile]) | Yes (`isDesktopOnly: false`) |
| Obsidian Publish | **Planned, not shipped** ([roadmap]) | No |
| Renders on GitHub | No (unverified inference) | No, but the query text is at least visible in the fence |
| Maintenance | First-party, actively shipping | **No release since 2025-04-07; no commit since 2025-04-08; 660 open issues** |

[bases]: https://obsidian.md/help/bases
[syntax]: https://obsidian.md/help/bases/syntax
[functions]: https://obsidian.md/help/bases/functions
[views]: https://obsidian.md/help/bases/views
[table]: https://obsidian.md/help/bases/views/table
[map]: https://obsidian.md/help/bases/views/map
[create-base]: https://obsidian.md/help/bases/create-base
[roadmap]: https://obsidian.md/roadmap/
[dev]: https://docs.obsidian.md/plugins/guides/bases-view
[docs]: https://blacksmithgu.github.io/obsidian-dataview/
[annotation]: https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/
[1.10.0]: https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/
[1.11.0-mobile]: https://obsidian.md/changelog/2025-12-10-mobile-v1.11.0/

---

## 2. Data model

- **Bases reads Markdown files and their properties, nothing else.** "All the data in Obsidian Bases
  is stored in your local Markdown files and their properties." Three property categories exist:
  **note properties** (frontmatter YAML, `note.price` or shorthand `price`), **file properties**
  (metadata available for all file types), and **formula properties** (`formula.formatted_price`).
  Sources: <https://obsidian.md/help/bases>, <https://obsidian.md/help/bases/syntax>.

- **File properties available:** `file.name`, `file.path`, `file.ext`, `file.folder`, `file.size`,
  `file.mtime`, `file.ctime`, `file.tags`, `file.links`, `file.backlinks`, `file.embeds`.
  Source: <https://obsidian.md/help/bases/syntax>. Note `file.backlinks` **is** available — the
  vault's `file.inlinks` queries have a target.

- **⚠️ Bases cannot read Dataview inline fields.** The Bases syntax reference documents frontmatter,
  file, and formula properties and **contains no mention of `key:: value` inline syntax** in any
  form. Source: <https://obsidian.md/help/bases/syntax>. Dataview, by contrast, documents three
  inline-field syntaxes (`Key:: Value`, `[rating:: 9]`, `(key:: value)`) and states that YAML
  frontmatter and inline fields can be mixed freely in one file and are queried identically.
  Source: <https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/>.

  **ShadowVault impact: essentially nil.** ADR 0005 (`docs/adr/0005-inline-field-contract.md`)
  established that "inline fields declare data frontmatter doesn't have; they never restate it" and
  that any value worth querying is **promoted to frontmatter**. A repo-wide grep for queried `::`
  fields returns **zero results**; the only `::` in the vault are seven intentionally-empty prose
  placeholders emitted by `99 - Meta/02 - Scripts/sourceCaptureBook.js` (`citation::`) and
  `sourceCapturePaper.js` (`hypothesis::`, `methodology::`, `results::`, `summary::`, `context::`,
  `significance::`). None of them is read by any query. **This is the decisive finding: the vault's
  data model is already Bases-compatible.**

- **A Bases row is a file.** The intro describes Bases as letting you "view, edit, sort, and filter
  **files** and their properties," and every view type is described as displaying files. Source:
  <https://obsidian.md/help/bases>, <https://obsidian.md/help/bases/views>. Dataview additionally
  indexes "tags and bullet points (including tasks)" as queryable objects, which is what makes
  `TASK` and `FLATTEN file.lists` possible. Source: <https://blacksmithgu.github.io/obsidian-dataview/>.
  The vault currently issues **zero `TASK` and zero `CALENDAR` queries** (grep: 84 `LIST`, 54
  `TABLE`, 0 `TASK`, 0 `CALENDAR`), so this gap costs nothing today — but the lecture template does
  write `- [ ]` checkboxes, so a future "open follow-ups" dashboard would be a Dataview-only feature.

---

## 3. Query language

**Bases `.base` YAML.** Top-level keys are `filters`, `formulas`, `properties`, `summaries`, and
`views`. Each view takes `type`, `name`, `limit`, `filters` (AND-concatenated with the global
filters), `order`, `groupBy` (property + direction), and `summaries`. Filters are recursive objects
built from `and` / `or` / `not`. Source: <https://obsidian.md/help/bases/syntax>.

Operators: arithmetic `+ - * / % ()`; comparison `== != > < >= <=`; boolean `! && ||`; date
arithmetic `date + "1M"`, `now() - "2h"` with units `y/M/d/w/h/m/s`.
Source: <https://obsidian.md/help/bases/syntax>.

**`this` is the current-file escape hatch.** "Use the `this` object to access file properties. What
`this` refers to, will depend on where the base is displayed… When the base is embedded in another
file, `this` points to properties of the *embedding* file (the note or Canvas that contains the
base)." Source: <https://obsidian.md/help/bases/syntax>. This is the direct analogue of DQL's
`this.file` and is what makes the vault's twelve `FROM [[]]` entity templates migratable at all.

**Function reference — full category list**, source <https://obsidian.md/help/bases/functions>:

| Category | Functions |
|---|---|
| Global | `escapeHTML`, `date`, `duration`, `file`, `html`, `if`, `image`, `icon`, `link`, `list`, `max`, `min`, `now`, `number`, `today`, `random` |
| Any | `isTruthy`, `isType`, `toString` |
| Date | `date`, `format`, `time`, `relative`, `isEmpty` |
| String | `contains`, `containsAll`, `containsAny`, `endsWith`, `isEmpty`, `lower`, `replace`, `repeat`, `reverse`, `slice`, `split`, `startsWith`, `title`, `trim` |
| Number | `abs`, `ceil`, `floor`, `isEmpty`, `round`, `toFixed` |
| List | `contains`, `containsAll`, `containsAny`, `filter`, `flat`, `isEmpty`, `join`, `map`, `reduce`, `reverse`, `slice`, `sort`, `unique` |
| Link | `asFile`, `linksTo` |
| File | `asLink`, `hasLink`, `hasProperty`, `hasTag`, `inFolder` |
| Object | `isEmpty`, `keys`, `values` |
| Regexp | `matches` |

**Documented gaps that bite this vault:**

- **No list length/count function.** The List category has `isEmpty()` but nothing returning a count.
  Source: <https://obsidian.md/help/bases/functions>. Three Main Dashboard queries and one MOC query
  use `length(file.outlinks)` / `length(file.inlinks)`. `reduce()` (added in 1.10.0,
  <https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/>) is the obvious workaround but is not
  documented for this purpose — treat as **unverified**.
- **No `FLATTEN`.** Nothing in the syntax or function reference expands a list property into one row
  per element. `groupBy` "specifies a property and sort direction… used to place the row into
  groups" — whether grouping by a *list* property (e.g. `file.tags`) yields one group per element or
  one group per whole list is **not documented**. Source: <https://obsidian.md/help/bases/syntax>.
- **No `default()` / coalesce.** Nested `if()` is the substitute. Workable, verbose.
- **No user-defined functions.** `summaries` accepts custom formulas over a `values` list, and
  `formulas` defines per-base calculated properties — but both are scoped to one `.base` file, and
  there is **no documented API for registering a function callable from formula expressions**.
  Sources: <https://obsidian.md/help/bases/syntax>, <https://docs.obsidian.md/plugins/guides/bases-view>.

**Dataview**, for contrast, offers `TABLE / LIST / TASK / CALENDAR` with `FROM / WHERE / SORT /
GROUP BY / FLATTEN / LIMIT`, plus inline queries and DataviewJS for "complex custom logic."
Source: <https://blacksmithgu.github.io/obsidian-dataview/>.

---

## 4. Views and rendering

Bases ships **four** view types, source <https://obsidian.md/help/bases/views>:

- **Table** — "Display files as rows in a table. Columns are populated from properties in your notes."
- **Cards** — "Display files as a grid of cards. Lets you create gallery-like views with images,"
  with cover images from a property (local attachment, external URL, or hex colour), Cover/Contain
  scaling, and configurable aspect ratio. Source: <https://obsidian.md/help/bases/views/cards>.
- **List** — "Display files as a list with bulleted or numbered markers," with marker type, property
  indentation, and separators. Source: <https://obsidian.md/help/bases/views/list>.
- **Map** — "Display files as pins on an interactive map. **Map requires installing the Maps
  plugin**… an official community plugin that you can download separately," needing Obsidian 1.10+.
  Source: <https://obsidian.md/help/bases/views/map>.

"Additional layouts can be added by Community plugins." Source: <https://obsidian.md/help/bases/views>.
**Kanban is "in progress" and Calendar is "planned"** — neither has shipped.
Source: <https://obsidian.md/roadmap/>.

**Rendering escape hatch:** Bases has `html()` ("custom HTML rendering", added 1.10.0), plus
`escapeHTML()`, `image()`, and `icon()`. Sources:
<https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/>, <https://obsidian.md/help/bases/functions>.
So a *formula* can emit markup — but the formula language itself is the limit. Dataview's
DataviewJS can render arbitrary DOM and, critically, **call shared code**: this vault's
`99 - Meta/05 - Views/badge-table/view.js` is invoked as `dv.view(…)` from four dashboard blocks
(ADR 0004). Bases has no `dv.view()` analogue.

---

## 5. Embedding

- **Base file embed:** "You can embed base files in any other file using the `![[File.base]]`
  syntax." A specific view: `![[File.base#View]]`.
  Source: <https://obsidian.md/help/bases/create-base>.
- **Inline code block:** "Bases can also [be] embedded directly into a note using a `base` code
  block and the bases syntax," e.g.

  ````markdown
  ```base
  filters:
    and:
      - file.hasTag("example")
  views:
    - type: table
      name: Table
  ```
  ````

  Source: <https://obsidian.md/help/bases/create-base>.
- **Embedded bases are interactive, not read-only.** Nothing in the docs marks embeds as read-only,
  and the table view supports editing with undo/redo generally.
  Sources: <https://obsidian.md/help/bases/create-base>, <https://obsidian.md/help/bases/views/table>.
  Whether *every* interaction (sort menus, summaries) is available inside an embed specifically is
  **not documented** — verify in-app before relying on it.
- Dataview's equivalent is the ` ```dataview ` / ` ```dataviewjs ` fence plus inline `=`/`$=`
  queries (`enableInlineDataview: true`, `enableInlineDataviewJs: false` in this vault's
  `.obsidian/plugins/dataview/data.json`).

**Practical difference for this vault:** the ` ```base ` form keeps the query in the note, which
preserves GitHub legibility roughly as well as DQL does; the `![[X.base]]` form moves it out, which
is what enables sharing one formula across many notes. You cannot have both.

---

## 6. Extensibility

- **There is a Bases plugin API — for views only.** `this.registerBasesView(ExampleViewType, { name,
  icon, factory: (controller, containerEl) => …, options: () => ([…]) })`, with a `BasesView`
  subclass exposing `type` and `onDataUpdated()` ("called whenever there is a configuration or data
  change") and optional `HoverParent`. Shipped as "Initial Bases API" in 1.10.0 (Nov 2025) and on
  the roadmap as "Bases API — Allow plugins to create new views types for bases."
  Sources: <https://docs.obsidian.md/plugins/guides/bases-view>,
  <https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/>, <https://obsidian.md/roadmap/>.
- **There is no documented API for custom Bases functions or formulas.** The guide covers views
  only. Source: <https://docs.obsidian.md/plugins/guides/bases-view>.
- **There is no Bases equivalent of DataviewJS.** Not documented anywhere in the Bases help.

**ShadowVault relevance:** the vault already ships a first-party plugin
(`shadowvault-property-icons`, in `.obsidian/community-plugins.json`), so `registerBasesView` is not
an outlandish option for a badge-rendering view. But note the asymmetry against ADR 0004's decision
matrix: DataviewJS's `dv.view()` cost *a settings toggle in a plugin already required*, whereas a
Bases badge view costs *maintaining a compiled TypeScript plugin against an API introduced eight
months ago*.

---

## 7. Writeability and interactivity

This is Bases' clearest genuine win, and it is verified.

- **Bases table view supports editing property values in place**, with "Undo changes to properties"
  and "Redo changes to properties" bound to `Ctrl-Z` / `Ctrl-Shift-Z`.
  Source: <https://obsidian.md/help/bases/views/table>. The 1.10.0 changelog independently confirms
  "Basic edit history (undo and redo) via `Cmd/Ctrl-Z` and `Cmd/Ctrl-Shift-Z`," plus full keyboard
  navigation, copy/paste, and improved "New item" file creation with property-value inference.
  Source: <https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/>. The base intro likewise says
  Bases lets you "view, **edit**, sort, and filter files and their properties."
  Source: <https://obsidian.md/help/bases>.
- **Dataview is strictly read-only.** "Dataview is about displaying, not editing" — it "calculates
  and displays data without modifying the original notes, except when checking tasks."
  Source: <https://blacksmithgu.github.io/obsidian-dataview/>.

**Where this would actually pay off here:** the Inbox and Sources dashboards. Today, processing an
inbox note means opening it to change `status`/`growth`; a Bases table would let that happen in the
dashboard. That is the one concrete workflow improvement a migration buys, and it is real. It is
also the surface most entangled with the badge renderer, which is the hardest thing to migrate — so
the payoff and the cost land on the same file.

---

## 8. Performance and scale

**No first-party benchmarks are published for either tool.** Neither the Bases help, the Obsidian
changelog, nor Dataview's docs state indexing throughput, vault-size limits, or query timing. Do not
infer any.

What *is* first-party and relevant:

- Bases 1.10.0: "View will periodically refresh the results of `file.backlinks` and other formulas
  that result in stale data." Source: <https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/>.
  So link-derived Bases columns are refreshed on a timer, not necessarily instantly — the same class
  of staleness Dataview manages with `refreshInterval` (set to `2500` ms in this vault's
  `.obsidian/plugins/dataview/data.json`).
- Bases 1.13.0 fixed "automatic column sizing for number properties" and errors on disable/re-enable;
  1.13.2 fixed the formula editor in pop-out windows. Sources:
  <https://obsidian.md/changelog/2026-05-28-desktop-v1.13.0/>,
  <https://obsidian.md/changelog/2026-07-14-desktop-v1.13.2/>. These are polish-grade fixes on a
  maturing feature, not architectural churn.
- Dataview received no fixes of any kind in the last 15 months. That is the performance-and-
  correctness risk that matters here: not that Dataview is slow, but that nobody is fixing it.

---

## 9. Ecosystem coupling

- **Mobile:** Bases is a core plugin and appears in mobile changelogs (1.11.0 Mobile: the Bases
  summary row is no longer hidden behind the navigation bar).
  Source: <https://obsidian.md/changelog/2025-12-10-mobile-v1.11.0/>. Dataview is
  `isDesktopOnly: false` (`.obsidian/plugins/dataview/manifest.json`). Parity.
- **Sync:** `.base` files are plain files in the vault; Sync is enabled here
  (`.obsidian/core-plugins.json: "sync": true`). No Bases-specific sync caveat is documented.
- **Obsidian Publish:** **"Bases support for Publish" is on the roadmap under *Planned* — it has not
  shipped.** Source: <https://obsidian.md/roadmap/>. Irrelevant to this vault today
  (`"publish": false` in `.obsidian/core-plugins.json`), but it forecloses Publish-based sharing of
  any dashboard that moves to Bases.
- **GitHub rendering:** `.base` files are YAML and GitHub has no renderer for them. A note whose
  dashboard is `![[X.base#View]]` shows, on GitHub, a broken-looking embed with the query in a
  different file. A ` ```base ` fence at least keeps the YAML visible inline, exactly like a
  ` ```dataview ` fence keeps its DQL visible. *(Inference from the file format — **not verified**
  against a primary source.)* This repo's docs are explicitly maintained for GitHub readability
  (`CLAUDE.md`; CHANGELOG `e085e7d`), so prefer the ` ```base ` fence over `![[X.base]]` wherever
  legibility matters more than reuse.
- **Dependency risk (Dataview):** community plugin, `minAppVersion: 0.13.11`, latest release
  **0.5.70 (2025-04-07)**, last default-branch commit **2025-04-08**, **660 open issues**, 25 open
  PRs, repo not archived, README carries **no** maintenance/deprecation/hand-off notice. Source:
  GitHub API on `blacksmithgu/obsidian-dataview`, 2026-07-23. **The vault ships 0.5.68 — two patch
  releases behind the final one.** Bumping to 0.5.70 is free and should happen regardless of this
  decision.
- **Dependency risk (Bases):** first-party and shipping, but *young*. Bases launched **August 2025**
  and gained its major structural features (List, Map, groupBy, summaries, plugin API) only in
  **November 2025**. Source: <https://obsidian.md/roadmap/>. Its 1.9.0 introduction warned: "This is
  an early beta. We expect many changes and improvements to Bases over the coming months, and a
  longer than usual early access phase." Source:
  <https://obsidian.md/changelog/2025-05-21-desktop-v1.9.0/>. That phase is over, but the syntax has
  had roughly one year of stability, versus Dataview's five.

---

## 10. Migration cost and mechanics

**There is no first-party or documented DQL → Bases conversion path.** Nothing in the Bases help,
the changelog, the roadmap, or the developer docs mentions Dataview import, migration, or
compatibility. Dataview is not mentioned on the Obsidian roadmap at all. Sources:
<https://obsidian.md/help/bases>, <https://obsidian.md/roadmap/>. **Every query is a hand rewrite.**

Mechanically, per query: translate `FROM "folder"` → `file.inFolder("folder")`, `FROM #tag` →
`file.hasTag("tag")`, `FROM [[]]` → `file.hasLink(this.file)`, `WHERE x = "y"` → `x == "y"`,
`SORT a DESC` → `order` + `sort`/`groupBy` direction, `LIMIT n` → `limit: n`, `GROUP BY p` →
`groupBy: {property: p}`, `length(rows)` → a `summaries` count.
Source for all target syntax: <https://obsidian.md/help/bases/syntax>.

Beyond the queries, the vault-specific costs are:

1. **`dashboardEnums.test.js` must be rewritten.** It currently `require()`s
   `99 - Meta/05 - Views/badge-table/view.js` and asserts its maps are total over
   `_frontmatterSchema.js`'s enums and identical to `METADATA.md`'s tables (ADR 0004). If badges
   become Bases formulas, the test must parse `.base` YAML instead. Cheaper than the current JS
   parse, but it is a rewrite of the mechanism that makes `METADATA.md`'s single-source-of-truth
   claim machine-checked.
2. **Thirteen entity/MOC templates change shape (14 blocks).** `(TEMPLATE) Artifact/Country/Event/
   Natural Entity/Organization/Place/Person/Synthetic Agent/System/Tool/MOC/Unit MOC` carry one
   `FROM [[]]`-style query each, and `(TEMPLATE) Course MOC` carries two. These need `this.file`
   rewrites *and* `templater-lint` / template test updates.
3. **`sourceCaptureLecture.js` emits two DQL blocks into every lecture note** (lines ~210 and ~218,
   including `FROM [[]] AND !#source` and `WHERE contains(course, [[…]])`). Changing them changes
   the module's `body` output, which is fixture-checked under ADR 0003/0005 — so the test suite moves
   with it.
4. **The vault would speak three query languages during any partial migration** (DQL, DataviewJS,
   Bases YAML). ADR 0004 already flags "the vault now speaks two query languages… This is the real,
   ongoing cost." A partial Bases migration makes that three. This is the strongest argument for
   migrating a *whole file* at a time and for keeping the migrated set small.
5. **Documentation debt:** `PLUGINS.md` line 13 lists Dataview as powering "review dashboards and MOC
   lists"; `REVIEW-SYSTEM.md` embeds a DQL example; `EXTERNAL-INTEGRATIONS.md` / `ROADMAP.md` have no
   Bases entry at all. All need updating for any adoption.

---

## 11. Three-bucket migration inventory (this vault)

Counted 2026-07-23 across the working tree, excluding `.claude/worktrees/`:
**46 ` ```dataview ` blocks + 5 ` ```dataviewjs ` blocks = 51 in Markdown**, plus **2 DQL blocks
generated at capture time** by `99 - Meta/02 - Scripts/sourceCaptureLecture.js`.

### Bucket A — Migratable today, no vault change (27 blocks)

| Surface | Blocks | Bases translation |
|---|---|---|
| `04 - MOCS/Entities.md` | **10** `LIST FROM #tag AND "folder"` | `file.hasTag("agent/person") && file.inFolder("09 - Entities/Agents")`, list view. **One `.base`, ten views. Best first candidate.** |
| `04 - MOCS/Home.md` | 1 | `status == "active" && (growth == "fern" \|\| growth == "incubator")`, `order`, `limit: 10` |
| `08 - Nexus/01 - Sources Dashboard.md` | 4 of 5 | Status filters trivial; the `default(default(…))` Creator/Published coalesce becomes a nested `if()` chain — verbose but expressible |
| `08 - Nexus/09 - Main Dashboard.md` | 3 of 7 DQL (Seedlings, Ferns, Recent Daily) | Frontmatter + `file.ctime` filters; drop-in |
| `08 - Nexus/00 - Inbox Dashboard.md` | 1 (Inbox Stats) | `summaries` count over `file.inFolder("00 - Inbox")` |
| `08 - Nexus/09 - Main Dashboard.md` | 1 (type counts) | `groupBy: type` + count summary — this is literally what `groupBy`+`summaries` were built for |
| Periodic templates (Daily/Weekly/Monthly/Yearly) | 7 | Templater `<% %>` still interpolates inside a ` ```base ` fence, so the baked date literals survive; or switch to `now() - "7d"` (self-updating, but changes fixed-window semantics to rolling) |

Two of these are strictly *better* in Bases: **Orphan Notes** (`file.backlinks.isEmpty() &&
file.links.isEmpty()` vs the current JS `.length === 0`) and **Due for Review** (`review <= now()`
vs the `dv.luxon.DateTime.now()` workaround that ADR-era code needed because `dv.date("today")`
silently returned null). Both currently live in DataviewJS *only* to reach the badge renderer.

### Bucket B — Migratable, but the vault has to change (22 blocks)

- **14 blocks across 13 link-context templates** (Artifact, Country, Event, Natural Entity,
  Organization, Place, Person, Synthetic Agent, System, Tool, MOC, Unit MOC — one block each — plus
  **Course MOC, which has two**) → `file.hasLink(this.file)` with a
  ` ```base ` fence. `this` in an embedded base points to the embedding file
  (<https://obsidian.md/help/bases/syntax>), so this works — but each is a template edit plus a
  `templater-lint` / test-fixture update. `WHERE contains(course, [[]])` → `course.contains(this.file.asLink())`
  is *plausible* from the documented `List.contains` and `File.asLink` but is **not documented as
  such** — verify in-app.
- **The 5 badge-table DataviewJS blocks** (4 in Main Dashboard, 1 in Inbox Dashboard). Migratable
  *only* by moving the growth/status/type maps into Bases **formulas**. The honest tradeoff:
  - Naïve migration writes a nested `if()` cascade per view — **this is precisely the eight-copy
    drift that ADR 0004 was written to eliminate**, and Bases has no user-function seam to prevent it.
  - The correct migration is **one shared `.base` file** defining the three badge formulas once, with
    five views, embedded as `![[badges.base#Inbox]]` etc. That genuinely preserves ADR 0004's
    single-definition property — arguably better than `dv.view()`, since it needs no JS toggle.
    Costs: `dashboardEnums.test.js` must parse YAML instead of JS, the dashboards lose inline query
    legibility on GitHub, and the per-section column ordering ADR 0004 fought for ("Review Date"
    before the badges) has to be re-established per view via `order`.
- **3 Main Dashboard DQL blocks that count links** — Incubators (`length(file.outlinks) < 2`),
  Evergreen (`length(file.inlinks)`), and MOCs (`length(file.inlinks)`). **`length()` over a list has
  no documented Bases equivalent** (§3). `file.links.isEmpty()` covers the zero case but not the
  `< 2` threshold or the sort-by-count. Blocked until `reduce()` is proven to work as a counter.
- **The 2 generated queries in `sourceCaptureLecture.js`** — would emit ` ```base ` fences; changes
  fixture-checked module output.

### Bucket C — Not migratable today

- **`08 - Nexus/01 - Sources Dashboard.md` "By Source Type"** — `FLATTEN file.tags AS Tag ... WHERE
  startswith(Tag, "#source/") GROUP BY Tag`. Bases documents no `FLATTEN`, and whether `groupBy` on a
  list property expands per element is **not documented**
  (<https://obsidian.md/help/bases/syntax>). Assume blocked until verified.
- **Any future `TASK` dashboard** over the lecture template's `- [ ]` follow-ups. Bases rows are
  files; there is no task-level granularity (<https://obsidian.md/help/bases>).
- **Any future `CALENDAR` view.** Planned, not shipped (<https://obsidian.md/roadmap/>).
- **Arbitrary shared rendering logic.** `dv.view()` has no Bases analogue; the only extension seam is
  `registerBasesView`, which means shipping and maintaining a plugin
  (<https://docs.obsidian.md/plugins/guides/bases-view>).

### Not in any bucket

- **`99 - Meta/01 - Documentation/REVIEW-SYSTEM.md`** — its DQL block is *documentation of a query to
  paste*, not a live query. Leave it, or document both forms.

**Reconciliation:** A 27 + B 22 + C 1 + not-bucketed 1 = **51 Markdown blocks**, plus the 2
`sourceCaptureLecture.js`-generated blocks counted inside bucket B's narrative. So **roughly half the
vault migrates cleanly, and the half that doesn't is the half that matters most** — the dashboards
you actually look at every day.

---

## 12. Concrete next steps (if you accept the verdict)

1. **Bump Dataview 0.5.68 → 0.5.70** (the terminal release). Free, and it is the last one there will
   be. Source: GitHub releases, 2026-07-23.
2. **Convert `04 - MOCS/Entities.md` only.** Ten `LIST` fences → one `09 - Entities/Entities.base`
   with ten list views, or a single ` ```base ` fence with ten views to preserve GitHub legibility.
   Live with it for a release cycle.
3. **Do not touch the dashboards.** They are the badge surface, and the badge surface is where Bases'
   missing user-function seam and missing list-length function both land.
4. **File a follow-up to verify in-app**, not from docs: (a) does `reduce()` count a list?
   (b) does `groupBy` on `file.tags` expand per tag? (c) is an embedded base fully interactive?
   All three are "not documented" today and all three change the buckets above.
5. **Update `PLUGINS.md`, `EXTERNAL-INTEGRATIONS.md`, and `ROADMAP.md`** to record that Bases is
   enabled (`.obsidian/core-plugins.json`) but deliberately unused except for Entities — otherwise
   the next reader will assume it's an oversight.

---

## Sources consulted

All retrieved **2026-07-23**.

**Obsidian first-party**
- <https://obsidian.md/help/bases> — Introduction to Bases
- <https://obsidian.md/help/bases/syntax> — Bases syntax (properties, filters, `this`, `groupBy`, `summaries`, operators)
- <https://obsidian.md/help/bases/functions> — full function reference
- <https://obsidian.md/help/bases/create-base> — `.base` files, ` ```base ` blocks, `![[File.base]]`, `![[File.base#View]]`
- <https://obsidian.md/help/bases/views> — view types
- <https://obsidian.md/help/bases/views/table> — table view, inline editing, undo/redo, row height
- <https://obsidian.md/help/bases/views/cards> — cards view
- <https://obsidian.md/help/bases/views/list> — list view
- <https://obsidian.md/help/bases/views/map> — map view, Maps plugin requirement
- <https://obsidian.md/help/formulas> — formulas
- <https://obsidian.md/roadmap/> — Bases ship dates and Planned/In-progress items
- <https://obsidian.md/changelog/> — version index (1.12.7 public; 1.13.3 early access)
- <https://obsidian.md/changelog/2025-05-21-desktop-v1.9.0/> — Bases introduction, early-beta warning
- <https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/> — groupBy, summaries, List view, Maps, Bases API, edit history, `reduce`/`html`/`random`
- <https://obsidian.md/changelog/2025-12-10-mobile-v1.11.0/> — Bases on mobile
- <https://obsidian.md/changelog/2026-02-27-desktop-v1.12.4/> — Bases search, drag-and-drop import, row context menu
- <https://obsidian.md/changelog/2026-05-28-desktop-v1.13.0/> — Bases fixes (early access)
- <https://obsidian.md/changelog/2026-07-14-desktop-v1.13.2/> — Bases fixes (early access)
- <https://docs.obsidian.md/plugins/guides/bases-view> — `registerBasesView`, `BasesView`, `onDataUpdated()`

**Dataview first-party**
- <https://blacksmithgu.github.io/obsidian-dataview/> — indexed data, query types, DQL clauses, "displaying, not editing"
- <https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/> — inline field syntaxes, mixing with frontmatter
- <https://github.com/blacksmithgu/obsidian-dataview> + GitHub REST API — release 0.5.70 (2025-04-07), last commit 2025-04-08, 660 open issues, 25 open PRs, not archived, no maintenance notice

**This vault**
- `.obsidian/core-plugins.json` (`"bases": true`, `"publish": false`, `"sync": true`), `.obsidian/community-plugins.json`
- `.obsidian/plugins/dataview/manifest.json` (0.5.68) and `data.json` (`enableDataviewJs: true`, `refreshInterval: 2500`)
- `.obsidian/plugins/media-extended/manifest.json` (`minAppVersion: 1.12.0` — the only Obsidian-version floor available)
- `docs/adr/0004-badge-rendering-dataviewjs.md`, `docs/adr/0005-inline-field-contract.md`
- `99 - Meta/05 - Views/badge-table/view.js`, `99 - Meta/02 - Scripts/sourceCaptureLecture.js`
- `99 - Meta/01 - Documentation/PLUGINS.md`, `REVIEW-SYSTEM.md`
- `08 - Nexus/*.md`, `04 - MOCS/*.md`, `99 - Meta/00 - Templates/*.md` — query inventory

**No secondary sources were used for any capability claim.** Two statements are explicitly marked as
unverified inference rather than sourced fact: GitHub's lack of a `.base` renderer (§0, §9), and
`reduce()` as a list-length workaround (§3, Bucket B).

**Explicitly "not documented"** (do not assume either way): Bases support for inline `key:: value`
fields; a list length/count function; `FLATTEN`-equivalent list expansion; whether `groupBy` on a
list property expands per element; a custom-function/formula plugin API; read-only-ness or feature
parity of embedded bases; any performance or scale figures for either tool. The
`help.obsidian.md/bases/roadmap` page is indexed by search engines but **returns 404 at both
`help.obsidian.md/bases/roadmap` and `obsidian.md/help/bases/roadmap` as of 2026-07-23** — the
roadmap facts above are taken from <https://obsidian.md/roadmap/> instead.
