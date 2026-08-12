# Pricing and income strategies for ShadowVault

Evaluation of seven ways this project could earn money, against the licence it actually ships
(AGPL-3.0-only, as of v2.16.0) and the audience it actually has.

Every claim below is either (a) a figure or statement taken from the seller's or platform's own
page, marked **DOC**, (b) the result of a query I ran against the GitHub API or this repo, marked
**VERIFIED**, or (c) an estimate or arithmetic model I built, marked **ESTIMATE** — those are
assumptions, not findings, and §8 lists what could not be checked. Prices are USD, as published.

- **Audited: 2026-08-12.** All GitHub API queries and price fetches were run on this date.
- Companion research: `research/licensing-shortlist.md` (licence analysis, ecosystem norms) and
  `docs/handoff-licensing.md`. This document takes the AGPL decision as **settled** and works inside
  it; it does not re-open the licence question.

---

## 0. Verdict

**Pricing is not this project's binding constraint. Distribution is.** ShadowVault has been public
since 2026-06-01 and has **0 stars, 0 forks, 0 watchers, and 3 unique page viewers in the last 14
days** (**VERIFIED**). Every strategy below multiplies a price by an audience, and the audience term
is currently zero — so every strategy below yields approximately $0 today, at any price. Choosing
between them right now is optimising the wrong factor.

That is the honest headline. The useful part is what to do about it, and the ranking changes once
audience is non-zero, so each strategy is evaluated twice: **at current audience** and **at plausible
audience** (defined in §2 as ~2,000 monthly repo visitors — roughly where the mid-tier vault
templates in this niche sit).

Ranked, accounting for both:

| # | Strategy | Now | At plausible audience | Licence-compatible? | Effort |
|---|---|---|---|---|---|
| 1 | **Donations, upgraded** (add GitHub Sponsors alongside Ko-fi) | ~$0 | $10–80/mo | Yes, trivially | ~30 min |
| 2 | **Knowledge product** (methodology course/guide) | ~$0 | $200–2,000/mo | Yes — sells non-code | Weeks–months |
| 3 | **Paid packaged distribution** (Gumroad zip + support) | ~$0 | $50–400/mo | Yes — AGPL permits charging | Days |
| 4 | **Services** (setup/customisation) | $0–low | Lumpy, hourly | Yes — sells your time | Per engagement |
| 5 | **Hosted service** (the Obsidian model) | ~$0 | Unbounded but requires a product that does not exist | Yes | Months+ |
| 6 | **Dual commercial licensing** | ~$0 | ~$0 | Yes, via the CLA | Low, but see §2.6 |
| 7 | **Open-core paid module** | ~$0 | ~$0 | **Largely blocked** — see §1.3 | High |

**The single highest-value action is #1**, not because its ceiling is high (it is the lowest of the
seven) but because it costs half an hour and the current funding surface is leaving free money on the
table: `.github/FUNDING.yml` declares only `ko_fi: tenebrishv` (**VERIFIED**), and GitHub Sponsors
takes **0% from personal-account sponsors** (**DOC**) while rendering a native Sponsor button on the
repo page. Ko-fi's own fee on tips is also 0% (**DOC**), so this is additive, not a swap.

**The strategy to stop considering is #7, open-core paid modules** — and for a reason that is
specific to this vault rather than a matter of taste. See §1.3. This matters because open-core is the
obvious shape to reach for (it is what `remotely-save` does, the one source-available precedent in
the whole ecosystem) and it does not transfer here.

---

## 1. The four facts that constrain every answer

### 1.1 Audience is effectively zero, and one metric is misleading

**VERIFIED** via `gh repo view` and the traffic API, 2026-08-12:

| Metric | Value |
|---|---|
| Created | 2026-06-01 |
| Stars / forks / watchers | 0 / 0 / 0 |
| Views, 14 days | 105 total, **3 unique** |
| Clones, 14 days | 102 total, **53 unique** |
| Releases published | **18**, v1.0.0 (2026-06-02) → v2.16.0 (2026-08-12) |

**Do not read the 53 unique cloners as 53 users.** 53 unique cloners against 3 unique human page
views is not a plausible human ratio, and the clone traffic is concentrated almost entirely in
2026-07-29 → 07-31 (91 of 102 clones), which is the window in which research branches were pushed to
this repo for agents to read. This is machine traffic — CI, agent clones, mirrors — not demand. The
honest read of the table is **3 humans**.

Release cadence, by contrast, is genuinely high: **18 tagged releases in the 10 weeks** between
v1.0.0 (2026-06-02) and v2.16.0 (2026-08-12) — a release roughly every four days. The project is not
under-built. It is unseen.

### 1.2 What AGPL-3.0-only does and does not permit for income

From `licensing-shortlist.md` §5 and §10, and the licence text:

- **You may charge money for copies.** AGPL constrains redistribution terms, not price. The README
  already states this correctly. What it does *not* let you do is stop the buyer from redistributing
  the copy for free — so any price must attach to something the buyer cannot copy and hand on. That
  is the central economic fact for strategies #3 and #7.
- **You may sell commercial licences** (strategy #6), because you hold copyright and `CONTRIBUTING.md`
  carries a relicensing grant. AGPL binds recipients, not the author.
- **You may run a paid hosted service** on your own code without restriction (strategy #5).
- **AGPL earns you nothing from internal corporate use.** GPL-3.0 §2 permits running and modifying
  without conveying, unconditionally. A company deploying ShadowVault on 50 laptops owes nothing and
  is fully compliant. §13's network clause is a literal no-op for a local-first vault
  (`licensing-shortlist.md` §10).

### 1.3 The constraint that kills naive open-core

This is the finding most likely to be missed, and it comes straight out of
`licensing-shortlist.md` §9.2.

ShadowVault's logic lives in `99 - Meta/02 - Scripts/*.js`, which are **Templater user scripts**.
Templater is **AGPL-3.0** (**VERIFIED** in that research against the upstream repo). Templater loads
those scripts in-process, calls them, and exchanges objects with them (`tp.system.suggester()`,
`tp.file.create_new()`, `tp.user.*`). Under the FSF's own stated tests — `#GPLPlugins` ("if the main
program dynamically links plug-ins, and they make function calls to each other and share data
structures, we believe they form a single combined program") and `#IfInterpreterIsGPL` — that is a
combined work, not mere aggregation (**DOC**).

**Consequence: a proprietary or source-available "ShadowVault Pro" implemented as a Templater user
script is the one shape you cannot ship.** It would be a combined work with AGPL Templater and would
have to be AGPL-compatible, which a paid-proprietary module by definition is not.

The `remotely-save` precedent does **not** transfer. Its split is Apache-2.0 for `src`/`tests`/`docs`
and PolyForm Strict for a `pro/` folder (**VERIFIED** in the prior research) — but that pro folder is
part of *its own* plugin, which is Apache-licensed; it is not a script running inside someone else's
AGPL plugin. Its PRO tier also requires an online account precisely because "we don't have a payment
method inside the plugin" (**DOC**), and it is still free during beta through 2027-01-01 with prices
unannounced (**DOC**) — so it is not even a proven revenue precedent yet, only a proven *structure*.

A paid layer is therefore only viable **outside the Templater process**: standalone tooling (the
`99 - Meta/04 - Tooling/` updater scripts are already outside it), a hosted service, or content.
That is a real architectural constraint on strategies #3, #5 and #7, and it is why #7 ranks last.

### 1.4 The free supply in this niche is abundant and high-quality

Two independent samples:

- The 12 star-ranked vault templates surveyed in `licensing-shortlist.md` §13.3 — `kepano-obsidian`
  (4,257 ★), `obsidian-mind` (4,185 ★), `CyanVoxel/Obsidian-Vault-Template` (607 ★) and so on — are
  **all free**, MIT/GPL-3.0/CC0 or unlicensed (**VERIFIED** in that research).
- The `obsidianmate.com/vaults` curated directory lists 18 starter vaults, **all free and open
  source**, including LYT's own Ideaverse (**DOC**, secondary aggregator — see §8).

So the substitute for "pay for ShadowVault" is not "pay a competitor", it is "download a well-starred
free vault". Any price has to clear that. Notably, the sellers who *do* charge in this niche (§3) sell
**a course wrapped around a vault**, not a vault — which is the same conclusion §1.2 reaches from the
licence side, arrived at from the market side.

---

## 2. The seven strategies

"Plausible audience" throughout = **~2,000 monthly repo visitors and a few hundred stars** — roughly
the low end of the star-ranked template corpus in §1.4. It is a target, not a forecast; nothing in the
current data suggests a path to it without deliberate distribution work (§4).

### 2.1 Donations, upgraded — *do this now*

**Mechanism.** Ko-fi already exists. Add GitHub Sponsors to `.github/FUNDING.yml`, which renders a
Sponsor button in the repo header and on every release page.

**Economics (all DOC):** GitHub Sponsors takes **0%** from personal-account sponsors (organisations
pay up to 6%: 3% card processing + 3% service, avoidable via invoiced billing). Ko-fi takes **0% on
tips**, 5% on other payment types, or $12/mo for Ko-fi Gold which zeroes all service fees. **Do not
buy Ko-fi Gold** at current volume — $12/mo against 0 income is a guaranteed loss, and the 5% only
applies to shop/membership payments you are not yet making.

**Now:** ~$0. **At plausible audience:** ~$10–80/mo (**ESTIMATE**; donation conversion in dev tooling
is conventionally well under 1% of users, and a 200-star project earning $50/mo would be doing well).

**Verdict: do it, today, and then stop thinking about it.** Highest ratio of value to effort in the
list, and the lowest ceiling. Donations are a thank-you mechanism, not an income strategy.

### 2.2 Knowledge product — *the highest realistic ceiling*

**Mechanism.** Sell the methodology, not the files: a written guide or a video course on the pipeline
this vault encodes — source-dependence as the literature/permanent boundary (ADR 0010), the
containment hierarchy (ADR 0011), the growth model, the capture architecture. The vault stays free and
AGPL and becomes the course's worked example and its funnel.

**Why this one fits.** It is the shape the market has actually validated (§3: Ideaverse Pro at $299,
LYT Workshop at $1,297 — both **DOC**), it is completely untouched by §1.3's AGPL constraint because a
course is not a Templater script, it is untouched by the detection problem in §2.6, and it sells the
asset this repo is genuinely unusual for. `CONTEXT.md` and the 14 ADRs are a more distinctive artefact
than the scripts are; very few vaults in this niche have a reasoned domain model behind them.

**Now:** ~$0, and it is months of work. **At plausible audience:** $200–2,000/mo (**ESTIMATE**, from
§3's price points at 0.5–1% conversion).

**Verdict: the best long-term answer, and the one with the highest cost.** It also demands a skill
this repo shows no evidence of yet — audience-building and teaching — which is the same missing
capability as §1.1. Do not start here; start at §4.

### 2.3 Paid packaged distribution — *viable, honest, modest*

**Mechanism.** A paid Gumroad/itch.io listing: versioned zip, install support, maybe a private Discord
or priority issue triage. The repo stays free.

**What the buyer is actually paying for.** Not the files — AGPL guarantees they could get those free
and pass them on (§1.2). They are paying for convenience, curation and your attention. That is a
legitimate sale, and it is precisely Obsidian's own **Catalyst** licence: $25 one-time, explicitly
framed as supporting development rather than unlocking the app (**DOC**). Frame it that way and it is
honest; frame it as "buy the vault" and the first buyer who reads the LICENSE will be annoyed, fairly.

**Economics.** Gumroad: **10% + $0.50** on direct sales, **30%** on Discover marketplace sales
(**DOC**). At $29 direct, that is $25.60 net (**ESTIMATE**, before payment-processor and VAT effects).

**Reality check (ESTIMATE).** To net $500/mo at $29 you need ~20 sales/mo; at a 1% visitor→buyer
conversion that is ~2,000 monthly visitors — i.e. the entire "plausible audience" target, spending its
whole conversion budget on this one product. That arithmetic is why this ranks below #2: same audience
requirement, much lower revenue per visitor.

**Recommended price if you do it:** $19–29 one-time, or pay-what-you-want with a $15 floor.
Deliberately below Ideaverse Pro's $299 (§3), because that price buys a 4-hour course and a
1,000-note vault and yours would buy a zip.

**Verdict: worth doing after §4, not before.** Zero licence risk, real but capped.

### 2.4 Services — *the only one that can earn money this month*

**Mechanism.** Paid setup, migration and customisation: adapting the vault to someone's field, writing
bespoke capture types, migrating an existing vault onto the pipeline.

**Now:** the only strategy in the list with a non-zero "now" column, because it needs one client, not
an audience. **At plausible audience:** still lumpy and hourly — it does not scale, and it competes
with the time that builds #2.

**Verdict: a useful bridge and a good source of design feedback; not a strategy.** Its real value is
that paying clients tell you which parts of the vault are actually hard to adopt — information the
other six strategies all need and none of them generate.

### 2.5 Hosted service — *right model, wrong stage*

**Mechanism.** Charge for a service rather than software: the model Obsidian itself validated in this
exact ecosystem — free app, paid Sync ($4–8/user/mo) and Publish ($8–10/site/mo) (**DOC**). AGPL
places no obstacle in your way as the copyright holder, and §13's source-offer obligation is
something you would simply comply with.

**The problem is that there is no service.** ShadowVault is markdown files and local Templater
scripts. To sell a subscription you would first have to build a thing that runs somewhere and does
something a local vault cannot — hosted enrichment, a sync layer, a review service. That is a new
product, competing with Obsidian Sync at $4/mo and with a free plugin ecosystem, and it would need to
live outside the Templater process anyway (§1.3).

**Verdict: correct model, and it is not available to you yet.** Revisit only if the roadmap ever grows
a genuinely server-side capability. Do not contort the vault to create one.

### 2.6 Dual commercial licensing — *the door is open and the room is empty*

**Mechanism.** Keep AGPL as the public licence; sell a proprietary-terms licence to anyone who wants
to redistribute a modified ShadowVault without opening their source. `CONTRIBUTING.md` clause 2 grants
exactly the relicensing authority this needs, and `licensing-shortlist.md` §12 confirms it is
functionally Harmony §2.3 Option Five — the dual-licensing-enabling variant.

**Why it earns nothing here, despite being well set up.** Three independent reasons:

1. **The buyer pool is close to empty.** The only party who needs this licence is one that wants to
   *redistribute* a derivative under closed terms. For a markdown vault, that party barely exists.
   Internal use — the case one might imagine paying for — is already free under AGPL (§1.2).
2. **Detection is impossible.** Nothing about a local vault produces an observable signal
   (`licensing-shortlist.md` §15). You would only ever be paid by someone who volunteers to pay.
3. **Diligence would surface the AI-authorship question.** A portion of this repo was authored through
   an AI agent, and the U.S. Copyright Office's published position is that material whose expressive
   elements were determined by an AI "is not the product of human authorship" and is unprotected
   (**DOC/LAW**, 88 Fed. Reg. 16190, 16192). Any commercial-licence buyer doing real diligence asks
   what you own. That is a live weakness in *selling* rights, and it is neutral for every other
   strategy here, since unprotected material is unprotected for a copier too.

**Verdict: keep the option, do not pursue it.** The maintenance cost is one clause in a file you
already have. The five CLA gaps in `licensing-shortlist.md` §12 (patent grant, employer
representation, moral-rights waiver, transferability, statutory verbs) are still worth fixing —
they cost nothing today, since neither repo has an external human contributor, and they are the only
work here that pays off under *every* strategy.

### 2.7 Open-core paid module — *do not*

**Mechanism.** A free core plus a paid premium module.

**Why it is blocked.** §1.3, in full. The paid module would have to live outside the Templater
process, which excludes essentially every feature on the roadmap — the roadmap's value is
concentrated exactly in the capture/pipeline scripts that Templater runs. What is left outside that
boundary is the updater tooling, which nobody will pay for, and a hypothetical service (#5).

Adding to that: it would fork the project's story ("open source, except the good bits") at precisely
the moment the project needs adoption more than revenue, and it inverts the licence signal you just
committed to in v2.16.0.

**Verdict: rejected, on a structural constraint rather than a preference.**

---

## 3. What the market actually charges (all DOC)

| Seller | Product | Price | Recurring | What it tells you |
|---|---|---|---|---|
| Nick Milo / LYT | **Ideaverse Pro** | **$299** one-time (see note) | $29/yr renewal | The direct comparable: a paid Obsidian vault (1,000 notes) **bundled with a 4-hour course** and a Bases masterclass. The vault is the artefact; the teaching is the product. No free version of Pro. *The page carried a "price increases tomorrow" banner when fetched, and search results showed $129 launch / $249 "normal" — this figure is promo-framed and moves.* |
| Nick Milo / LYT | **LYT Workshop** | **$1,297** | — | 6-week cohort. Pure methodology teaching, no vault required. |
| Nick Milo / LYT | **Knowledge Accelerator** | **$1,697** (from $2,500) | **$197/yr** | The high tier is community + access, i.e. recurring, not a file. |
| Obsidian | **Sync** | $4/user/mo annual, $5 monthly | yes | Service, not software. Plus Sync at $8/mo annual. |
| Obsidian | **Publish** | $8/site/mo annual, $10 monthly | yes | Service, not software. |
| Obsidian | **Commercial licence** | **$50/user/yr** | yes | The ecosystem's own price for "a company uses this at work". |
| Obsidian | **Catalyst** | **$25** one-time | — | Explicitly a *support* purchase, not an unlock. The honest model for §2.3. |
| `remotely-save` | **PRO** | unannounced; free during beta to **2027-01-01** | planned | The ecosystem's only open-core precedent — structurally proven, revenue unproven. |
| Various Gumroad sellers | Obsidian starter vaults | ~$9–49 observed | — | Where a bare paid vault actually prices. See §8 — I could not read exact figures off the Gumroad pages. |

**The pattern across the top three rows is the finding:** in this niche, the people making real money
charge $299–$1,697 for *instruction and community*, and treat the vault as the exhibit. Nobody
successful is charging for files. That aligns with §1.2 — under AGPL you cannot charge for files
anyway — so the licence and the market point the same direction.

---

## 4. What I would actually do, in order

Sequenced, because the ordering is the whole recommendation.

**Now (this week, ~1 hour total):**

1. Add GitHub Sponsors to `.github/FUNDING.yml` alongside Ko-fi (§2.1). 0% fees, native repo button.
   Skip Ko-fi Gold.
2. Add a one-paragraph "Support / commercial enquiries" line to `SUPPORT.md` — it costs nothing and it
   is the only way strategy #6 ever fires, given §2.6's detection problem.
3. Fix the five CLA gaps from `licensing-shortlist.md` §12. Free today, pays off under every strategy,
   and gets strictly more expensive after the first outside contributor.

**Next (the actual bottleneck — this is the work):** distribution. Nothing in §2 has a non-zero value
until this moves. The repo has no description set (**VERIFIED**: `"description": ""`), 0 stars, and no
presence in any of the discovery surfaces this niche uses — the Obsidian forum's Share & Showcase
category, `r/ObsidianMD`, the `awesome-obsidian` list, and directories like the
`obsidianmate.com/vaults` one in §1.4 that lists 18 competitors and not this. Set the description,
then get listed. This is unglamorous and it dominates every pricing decision in this document.

**Then, once there is an audience (say >300 stars or >1,000 monthly uniques):** start §2.2, the
knowledge product, and ship §2.3's paid package at $19–29 as its low-priced entry point. Take §2.4
consulting opportunistically throughout, for the design feedback as much as the money.

**Never:** §2.7. **Only if the product changes shape:** §2.5.

**One thing worth saying plainly:** a realistic ceiling for this project, run well for a year, is
low-hundreds of dollars per month. That is a normal outcome for a solo PKM framework and it is not an
argument against doing any of it — but if the goal is meaningful income rather than a funded hobby,
the leverage is in §2.2's course, and the course's prerequisite is an audience, not a price list.

---

## 5. Sources

**Sellers' and platforms' own pages (fetched 2026-08-12)**
- <https://www.linkingyourthinking.com/ideaverse-pro> — $299, $29/yr renewal, contents, no free Pro tier
- <https://www.linkingyourthinking.com/workshop> — LYT Workshop $1,297; Knowledge Accelerator $1,697 / $197-yr
- <https://obsidian.md/pricing> — Sync $4–8, Publish $8–10, Commercial $50/user/yr, Catalyst $25
- <https://gumroad.com/pricing> — 10% + $0.50 direct; 30% Discover
- <https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors> — 0% personal, up to 6% organisation
- <https://help.ko-fi.com/hc/en-us/articles/360002506494-Does-Ko-fi-take-a-fee> and <https://ko-fi.com/pricing> — 0% on tips, 5% otherwise, Gold $12/mo
- <https://github.com/remotely-save/remotely-save/blob/master/docs/pro/README.md> — PRO requires an account; free during beta to 2027-01-01; "prices vary"
- <https://obsidianmate.com/vaults> — 18-vault directory, all free/open-source (secondary aggregator)

**Law / government position**
- Copyright Registration Guidance for Works Containing AI-Generated Materials, 88 Fed. Reg. 16190 (Mar. 16, 2023)
- GPL-3.0 §2; AGPL-3.0 §13; FSF GPL FAQ `#GPLPlugins`, `#IfInterpreterIsGPL` — via `research/licensing-shortlist.md`

**This repo (VERIFIED)** — `gh repo view tenebrishv/shadowvault-setup`, `traffic/views`,
`traffic/clones`, `gh release list`, `.github/FUNDING.yml`, `LICENSE`, `README.md`,
`99 - Meta/01 - Documentation/SUPPORT.md`, `99 - Meta/01 - Documentation/ROADMAP.md`, `CONTEXT.md`,
`docs/adr/`, `research/licensing-shortlist.md`

---

## 6. Explicitly not verified — do not treat these as settled

1. **Every figure marked ESTIMATE in §0 and §2** — the revenue bands, the conversion rates, the
   "plausible audience" definition. These are my arithmetic on assumed conversion, not observed data
   for this project or any comparable. No primary source was found for donation- or
   sale-conversion rates in the Obsidian ecosystem specifically.
2. **Exact Gumroad prices for competing paid vaults.** The Gumroad product pages render prices in
   JavaScript and returned no price text when fetched; the ~$9–49 range in §3 comes from search-result
   snippets, not from the pages themselves. Treat that row as indicative.
3. **Ko-fi's fee schedule** comes from a domain-restricted search over `ko-fi.com` / `help.ko-fi.com`
   rather than a successful direct fetch — `ko-fi.com` returned 403 and `more.ko-fi.com/features`
   404'd. The 0%-on-tips and $12/mo Gold figures are consistent across those results but were not read
   off the pricing page directly.
4. **Whether a court would adopt the FSF's plug-in/interpreter test** underlying §1.3. Carried over
   unchanged from `licensing-shortlist.md` §16 — it is the FSF's stated interpretation of GPL scope,
   and no case applying it was found. §1.3's conclusion is therefore "the licensor's stated position",
   which is the operative risk for a would-be seller, not a prediction of a holding.
5. **Tax, VAT and business-registration consequences** of any of these. Not researched at all, and
   they materially change net income and obligations — particularly for EU digital-goods VAT on
   strategy §2.3. Get local advice before selling anything.
6. **Whether Obsidian's Developer Policies constrain paid vault distribution.** They govern plugins
   and themes in the community directory and expressly "do not apply to plugins installed outside of
   the Obsidian directory" (per `licensing-shortlist.md` §13.2); I did not check for a separate policy
   covering commercial vault templates.
