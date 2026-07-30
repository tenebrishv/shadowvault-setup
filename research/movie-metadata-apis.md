# Movie metadata APIs — can a "Movie" source-capture type auto-fetch keylessly?

Reference notes for a proposed 10th Source Capture type. The decision turns on **the keyless
constraint**: this repo is public and ships as a distributable framework
(`framework-manifest.json`), so no API key can be committed, and all five existing auto-fetching
capture types (Open Library, Microlink, CrossRef, YouTube oEmbed, Twitter oEmbed) read no credential
of any kind. An option needing a key is not disqualified, but it is a **new capability the vault has
never had**, not a free choice.

Every claim below is either (a) the result of a live HTTP request I made myself, marked
**VERIFIED**, or (b) a quote from a first-party document, marked **DOC**. Nothing is taken from blog
roundups or API-aggregator sites. Where I could not reach a host or could not verify a documented
claim, it says so.

- Wikidata Query Service: <https://query.wikidata.org/sparql> · manual: <https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual> · MWAPI: <https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual/MWAPI>
- Wikimedia REST: <https://en.wikipedia.org/api/rest_v1/>
- TMDB API terms: <https://www.themoviedb.org/api-terms-of-use> · docs: <https://developer.themoviedb.org/docs/getting-started> · rate limits: <https://developer.themoviedb.org/docs/rate-limiting>
- Apple iTunes Search API: <https://performance-partners.apple.com/search-api>
- TVmaze: <https://api.tvmaze.com> · OMDb: <https://www.omdbapi.com/apikey.aspx> · Watchmode: <https://api.watchmode.com> · Trakt: <https://api.trakt.tv>
- Letterboxd API: <https://letterboxd.com/api-beta/> · <https://api-docs.letterboxd.com/>
- Cinemeta (Stremio): <https://v3-cinemeta.strem.io/manifest.json> · SDK meta schema: <https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md>
- Microlink: <https://api.microlink.io/>
- **Audited: 2026-07-30.** All live requests were made on this date from a Windows host via `curl`.

> **This picture moves — two specific ways.**
>
> 1. **Apple's iTunes Search API is in an undocumented broken state right now** (§3). `media=movie`
>    returns zero results while Apple's own documentation still lists `movie` as valid. That is a
>    regression, not an announced retirement, which means it could be fixed without notice — and the
>    partial workaround I found could stop working just as quietly. Re-test before relying on
>    anything in §3.
> 2. **Wikidata is a wiki.** The coverage percentages in §2.1 are a snapshot of 347,749 film items on
>    2026-07-30 and drift upward over time. Field *availability* is stable; field *coverage for a
>    given film* is not, which is exactly why the module must degrade to manual prompts per-field.
>
> **One environment caveat this repo requires.** Every request below was made with `curl`, not from
> inside Obsidian. `helpers.httpGetJson` uses Obsidian's `requestUrl`, so **CORS does not apply** and
> is not a reason to reject anything here — but User-Agent handling differs (`sourceCaptureBook.js`
> documents Open Library 429-ing any UA matching `/obsidian/i`). I de-risked this for the winning
> option by replaying the query with an Obsidian-shaped UA (§2.4, **VERIFIED**), but a real
> in-Obsidian run is still the last mile.

---

## 0. Verdict

**Yes — build it keyless, on the Wikidata Query Service.** TMDb is not needed.

The four facts that decide it:

1. **Wikidata returns six of the seven wanted fields in a single keyless GET** — title, director,
   release year, runtime, studio, and a canonical URL — with no key, no account, no registration, no
   approval, and no terms to accept. **VERIFIED** live, sub-second (§2).
2. **The seventh field, poster, is the one thing Wikidata does not have.** Only 1.2% of film items
   carry `P3383` (film poster) and 4.0% carry `P18` (image) — film posters are non-free, so Commons
   largely cannot host them. **VERIFIED** by direct count (§2.1). The fix is a second, optional GET
   to the Wikimedia REST summary endpoint, whose lead image for a film article *is* the poster
   (**VERIFIED**, §2.3) — and the SPARQL query already returns the exact Wikipedia article URL
   needed to address it, so no search step is required.
3. **TMDb has no keyless read path whatsoever.** Not v3, not v4, not guest sessions, not even
   `/configuration`; there is no oEmbed endpoint. Every single one answers
   `401 {"status_code":7,"status_message":"Invalid API key: You must be granted a valid key."}`
   **VERIFIED** (§4.1). And TMDb's attribution clause is mandatory and specific — logo plus a
   verbatim disclaimer notice (§4.3) — so adopting it is not just "add a key file", it is a
   licensing obligation that propagates to every framework user.
4. **Disambiguation is real and cheap.** "Dune" resolves to four distinct films and "The Thing" to
   seven, so a `tp.system.suggester` picker is required — but it is a picker over rows *already
   fetched by the one request*, with no vault reads and no note creation. That is nothing like
   `sourceCaptureLecture.js` (235 lines, which reads three folders and births notes from templates).
   Realistic size: **~100–120 lines**, between `sourceCaptureBook.js` (93) and
   `sourceCaptureYoutube.js` (114) (§6).

**The runner-up worth knowing about** is **Cinemeta** (§5.1), Stremio's public metadata service — an
option I was not asked about and found by probing. It is keyless, ~0.25 s, and returns *better*
per-film data than Wikidata for the fields it has (director, runtime, poster all present where
Wikidata's are sparse), with cleaner search ranking. It loses on exactly one axis, and it is the
axis this repo cares about: **it publishes no terms of use for third-party callers and no stability
guarantee** — the Stremio SDK docs reference it only as an example (§5.1, **DOC**). Wikidata is
CC0-licensed public infrastructure with a published rate-limit and User-Agent policy. Prefer
Wikidata; keep Cinemeta as the documented fallback if Wikidata's runtime/studio sparsity proves too
annoying in practice.

**And one genuine finding to record regardless of the outcome:** Apple's iTunes Search API has
silently stopped returning movies for the documented `media=movie` filter, while still holding movie
records that a bare, unfiltered search will surface (§3). This is worth writing down because it is
undocumented, contradicts Apple's live documentation, and is the kind of thing that gets rediscovered
expensively.

---

## 1. What "usable" means here (the consumer)

Read from the vault, 2026-07-30:

- **`99 - Meta/02 - Scripts/sourceCaptureBook.js`** — the target shape. `module.exports = async (tp,
  helpers) => ({ noteTitle, yamlFields, body }) | null`; one optional identifier prompt, one
  `fetchWithFallback` with `fetch` / `fillGaps` / `manual` branches, then `yamlField(...)`
  concatenation. 93 lines.
- **`99 - Meta/02 - Scripts/sourceCaptureHelpers.js`** — `httpGetJson(url, { headers })` is
  **GET-only**, throws on any non-2xx, and returns `res.json`. This is a hard constraint on the
  design: **a SPARQL query must fit in a GET query string** (it does — §2.2). `fetchWithFallback`
  treats *any throw* from `fetch` as "fall back to manual", explicitly including "a response that
  parsed fine but lacks essentials" — which is exactly how a zero-result search must be handled.
- **`99 - Meta/02 - Scripts/sourceCaptureArticle.js`** — the existing keyless Microlink call,
  53 lines: `https://api.microlink.io/?url=...`, check `meta.status !== "success"`, take
  `title` / `author` / `publisher`.

Constraints that follow, and that I applied throughout:

- One request per capture is the norm; a second is tolerable; **CORS is a non-issue** (`requestUrl`).
- Rate limits in the hundreds or thousands per day are irrelevant to a human pressing a hotkey.
- A required key or an approval-gated signup is a serious problem.
- Search-then-detail is acceptable but costs complexity.

Wanted fields, priority order: **title, director, release year, runtime, studio, poster/thumbnail
URL, canonical URL back to the record.**

---

## 2. Wikidata — the recommendation

### 2.1 Keyless, and what it actually has

**VERIFIED.** `https://query.wikidata.org/sparql` answers `HTTP 200` over plain GET with no
`Authorization` header, no key, and no account. A trivial probe with curl's *default* User-Agent
succeeded, so there is no registration wall.

**DOC**, from <https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual>: query timeout is
60 seconds; "One client (user agent + IP) is allowed 60 seconds of processing time each 60 seconds"
and "One client is allowed 30 error queries per minute," with `HTTP 429` on breach; "Clients who
don't comply with the User-Agent policy may be blocked completely – make sure to send a good
User-Agent header"; and "It is recommended to use GET for smaller queries and POST for larger
queries, as POST queries are not cached." No authentication is documented anywhere. For a
one-request-per-capture user script these limits are not a constraint.

**Field coverage — VERIFIED by direct `COUNT` queries against the live endpoint, 2026-07-30.**
Denominator is all items with `wdt:P31 wd:Q11424` (instance of *film*):

| Wanted field | Property | Items with it | Coverage of 347,749 films |
|---|---|---:|---:|
| release year | `P577` publication date | 292,582 | **84.1%** |
| — (join key) | `P345` IMDb ID | 272,763 | **78.4%** |
| director | `P57` director | 262,939 | **75.6%** |
| runtime | `P2047` duration | 159,326 | **45.8%** |
| studio | `P272` production company | 50,668 | **14.6%** |
| poster (fallback) | `P18` image | 13,851 | 4.0% |
| **poster** | `P3383` film poster | 4,134 | **1.2%** |

Two things to read off this table. Title, year and director are solid. **Studio is thin (14.6%) and
poster is effectively absent (1.2%)** — and the poster number is not a data-quality accident, it is
structural: film posters are copyrighted and Wikimedia Commons is a free-media repository, so it
mostly cannot host them. Do not expect this to improve. §2.3 routes around it.

*(Note: the head-count query `SELECT (COUNT(?f) AS ?films) WHERE { ?f wdt:P31 wd:Q11424 }` took
14.6 s and several coverage counts took 20–51 s. Those are whole-corpus aggregations run once for
this document; the per-capture query in §2.2 runs in 0.3–2.1 s.)*

### 2.2 The query — one GET, everything but the poster

The naive approach fails, and it is worth recording *how*, because both failures look like the
service being down:

- **A `FILTER(LCASE(STR(?l)) = "dune")` over `rdfs:label` does not return.** **VERIFIED**: curl
  reported `HTTP 000` (connection dropped) after a long wait. That filter is an unindexed scan of
  every label in Wikidata and blows the 60 s deadline. Do not write it.
- **Exact-match `rdfs:label "Dune"@en` works and is fast, but is case-sensitive.** **VERIFIED**:
  `"Dune"@en` → 3 rows; `"dune"@en` → **0 rows**. Unacceptable for a prompt a human types into.

The working form uses Wikidata's federated MediaWiki-API service to do the fuzzy search *inside* the
SPARQL query, so it is still one round trip. **DOC**, from
<https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual/MWAPI>: `EntitySearch` is a
supported `wikibase:api` profile, documented as "Wikibase entity search, by title", accepting
`mwapi:search`, `mwapi:language` and `limit`, and binding results via
`?item wikibase:apiOutputItem mwapi:item`.

```sparql
SELECT ?f ?fLabel (MIN(?y) AS ?year)
       (GROUP_CONCAT(DISTINCT ?dirL; separator=", ") AS ?directors)
       (SAMPLE(?dur) AS ?runtime)
       (GROUP_CONCAT(DISTINCT ?stuL; separator=", ") AS ?studios)
       (SAMPLE(?imdb) AS ?imdbId) (SAMPLE(?article) AS ?wiki)
WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org";
                    mwapi:search "dune"; mwapi:language "en"; mwapi:limit "50" .
    ?f wikibase:apiOutputItem mwapi:item
  }
  ?f wdt:P31 wd:Q11424 .
  OPTIONAL { ?f wdt:P577 ?dt }
  OPTIONAL { ?f wdt:P57/rdfs:label  ?dirL FILTER(LANG(?dirL)="en") }
  OPTIONAL { ?f wdt:P2047 ?dur }
  OPTIONAL { ?f wdt:P272/rdfs:label ?stuL FILTER(LANG(?stuL)="en") }
  OPTIONAL { ?f wdt:P345 ?imdb }
  OPTIONAL { ?article schema:about ?f ; schema:isPartOf <https://en.wikipedia.org/> }
  BIND(YEAR(?dt) AS ?y)
  ?f rdfs:label ?fLabel FILTER(LANG(?fLabel)="en")
}
GROUP BY ?f ?fLabel ORDER BY ?year LIMIT 25
```

**VERIFIED** live via `GET https://query.wikidata.org/sparql?query=…&format=json`. Encoded query
length ~895 characters — comfortably inside any GET limit, so `helpers.httpGetJson` can issue it
unchanged. Verbatim result for `"dune"`, 1.48 s:

| title | year | director | runtime | studio | IMDb | Wikipedia article |
|---|---|---|---|---|---|---|
| Dune | 1984 | David Lynch | 137 | Dino De Laurentiis Company | tt0087182 | `…/Dune_(1984_film)` |
| Dune | 1989 | *(none)* | 81 | Uzbekfilm | tt0309338 | *(none)* |
| The Dune | 2014 | Yossi Aviram | 87 | Les Films du Poisson | tt2251648 | `…/The_Dune_(film)` |
| Dune | 2021 | Denis Villeneuve | 155 | Legendary Pictures | tt1160419 | `…/Dune_(2021_film)` |

**The `GROUP BY` is not optional — it is the whole trick.** Without aggregation, multi-valued
properties form a cartesian product: the same query un-grouped returned **15 rows for "true grit"**
(2 directors × 2 publication dates × 3 studios for the one Coen film) and **20 rows for
"inception"**, all of them the same movie. **VERIFIED** both ways. `MIN(?y)` additionally collapses
country-specific release dates, which is what turns a stray "True Grit 2011" row into the correct
2010.

Two behaviours the module must handle, both **VERIFIED**:

- **A miss is `HTTP 200` with `"bindings": []`**, not a 4xx. `httpGetJson` will return happily, so
  the module must explicitly `throw` on an empty binding list to reach `fetchWithFallback`'s manual
  path.
- **`?wiki` is genuinely optional** — the 1989 Uzbekfilm title has no English Wikipedia article, so
  the poster step in §2.3 must be skippable.

### 2.3 The poster — one optional second GET

**VERIFIED.** `https://en.wikipedia.org/api/rest_v1/page/summary/<article-title>` is keyless and
answered `HTTP 200` **even with no User-Agent header at all**. For film articles the lead image is
the poster:

| article | `thumbnail` / `originalimage` | `wikibase_item` |
|---|---|---|
| `Dune_(1984_film)` | `…/wikipedia/en/5/51/Dune_1984_Poster.jpg` | Q114819 |
| `Dune_(2021_film)` | `…/wikipedia/en/8/8e/Dune_%282021_film%29.jpg` | Q60834962 |

It also returns `description` ("Film by Denis Villeneuve"), an `extract`, and the canonical article
URL. Because §2.2's query already hands back the exact article URL, this is a deterministic
`title → poster` lookup with no search step.

**Two caveats, stated plainly.** First, the host path is `upload.wikimedia.org/wikipedia/en/`, not
`/commons/` — these are English Wikipedia *local* non-free fair-use uploads. Hotlinking one into a
personal note is unremarkable, but it is not a freely-licensed image and the vault should not
present it as one. Second, this makes the capture two requests instead of one. Given that the second
is optional, cheap, and only fires when `?wiki` came back, that is a fair trade — but if the goal is
strictly one request, drop the poster field and note that Wikidata cannot supply it.

### 2.4 Disambiguation — VERIFIED, and it decides the module's shape

The brief's exact test cases, plus a remake case of my choosing (*True Grit*, 1969 Hathaway vs. 2010
Coen), run against the §2.2 query. All **VERIFIED**, all sub-2.1 s:

| search | distinct films returned | includes |
|---|---:|---|
| `dune` | 4 | 1984 Lynch, 1989 Uzbekfilm, 2014 *The Dune*, 2021 Villeneuve |
| `true grit` | 2 | **1969 Henry Hathaway**, 2010 Ethan+Joel Coen |
| `the thing` | 7 | 1951 *…from Another World*, **1982 Carpenter**, 1990 Moretti, **2011 van Heijningen** |
| `parasite` | 4 | 1925, 1982 Charles Band, 2004, **2019 Bong Joon-ho** |
| `seven samurai` | 1 | 1954 Kurosawa — no picker needed |

**Conclusion: a picker is required.** Multiple same-titled films are the normal case, not the
exception, and no year constraint can be applied *before* the request because the user may not know
the year — which is the entire reason they are looking it up. The right design is: fetch once, then
`tp.system.suggester` over the rows with a `"{title} ({year}) — {director}"` display string, and
skip the picker automatically when exactly one row comes back (as with *Seven Samurai*).

Note the SPARQL is **not** what disambiguates — `EntitySearch` does the fuzzy matching and
`wdt:P31 wd:Q11424` filters to films. A "year" prompt could still be offered as an *optional*
pre-filter applied client-side to the returned rows, which costs about four lines and skips the
picker in the common case where the user does know the year.

### 2.5 Obsidian-environment de-risking

**VERIFIED.** WDQS's User-Agent policy is the one documented way this could fail inside Obsidian, so
I replayed the §2.2 query with a User-Agent string containing `obsidian/1.12.7` in an Electron-shaped
UA. It returned `HTTP 200` with correct bindings. So the Open Library trap that
`sourceCaptureBook.js` documents (any UA matching `/obsidian/i` → 429) does **not** apply here.

That said, `requestUrl`'s real UA is not necessarily the string I sent, and the repo's own standard
is that environment-dependent claims get proven in-app. **Treat §2.5 as strong evidence, not
proof — send a descriptive UA anyway** (exactly as `OPEN_LIBRARY_UA` does), which also satisfies
Wikimedia's stated policy and is good citizenship regardless.

---

## 3. Apple iTunes Search API — the movie filter is broken, undocumented

This section is entirely **VERIFIED** by live `curl`, 2026-07-30. It confirms and then substantially
extends the reported symptom.

### 3.1 Confirming the symptom

All three reported URLs reproduce exactly — `{"resultCount":0, "results": []}`:

- `…/search?term=dune&media=movie&limit=2` → **0**
- `…/search?term=dune&entity=movie&country=US&limit=2` → **0**
- `…/search?term=inception&media=movie&attribute=movieTerm&limit=2` → **0**

The endpoint is alive: `…?term=dune&media=music&limit=1` returns a track.

### 3.2 Mapping the blast radius

| request | resultCount |
|---|---:|
| `media=movie` | **0** |
| `entity=movie` | **0** |
| `entity=movieArtist` | **0** |
| `entity=shortFilm` | **0** |
| `media=movie&country=GB` / `&country=CA` | **0** |
| `media=tvShow` | **0** |
| `entity=tvSeason` | **0** |
| `media=ebook` / `entity=ebook` | 2 / 3 ✅ |
| `media=podcast` | 2 ✅ |
| `media=music` | 1 ✅ |

So it is not "movies were removed" — **every video-media filter is dead** (movie, shortFilm,
movieArtist, tvShow, tvSeason) while every non-video filter works. Country does not change it.

### 3.3 The finding: the records are still there

**Movie data has *not* been removed from the index. Only the filter is broken.** Two requests prove
it:

- **`https://itunes.apple.com/search?term=dune&limit=25`** (no `media`, no `entity`) → `resultCount:
  28`, including `feature-movie` records for *Dune* (2021, Denis Villeneuve), *Dune: Part Two*
  (2024), *Dune* (1985, David Lynch), *The Dunes* (2019), *Woman in the Dunes* (1964).
  `media=all` behaves identically.
- **`https://itunes.apple.com/lookup?id=1585877256`** → returns the 2021 *Dune* record in full.

The `feature-movie` record is field-rich and, on paper, well matched to the brief:

| wanted field | iTunes field | 2021 *Dune* value |
|---|---|---|
| title | `trackName` | `Dune` |
| director | `artistName` | `Denis Villeneuve` |
| release year | `releaseDate` | `2021-09-15T07:00:00Z` |
| runtime | `trackTimeMillis` | `9337078` (156 min) |
| studio | — | **no field**; `collectionArtistViewUrl` names a distributor only when the film sits in a collection |
| poster | `artworkUrl100` | upscalable — **VERIFIED** that rewriting `100x100bb.jpg` → `600x600bb.jpg` and `2000x2000bb.jpg` both return `HTTP 200 image/jpeg` (66 KB / 615 KB) |
| canonical URL | `trackViewUrl` | `https://itunes.apple.com/us/movie/dune/id1585877256?uo=4` |

### 3.4 Why the workaround is still unusable

Without the `media` filter, relevance ranking is dominated by non-film content and the films it does
surface are frequently wrong. **VERIFIED**, `limit=50`, counting only `kind == "feature-movie"`:

| bare search | feature-movie hits | the film you wanted? |
|---|---:|---|
| `dune` | 8 | ✅ 2021, 2024, 1985 all present |
| `inception` | 29 | ❌ **not one of them is *Inception*** (top hits: *Ring of Fire (IMAX)*, *Ayrton Senna*, *Metal Mania*) |
| `parasite` | 2 | ❌ *Superman: Man of Tomorrow*, *DC Super Hero Girls* |
| `blade runner` | 1 | ⚠️ *Blade Runner*, Ridley Scott — but dated **2013** |
| `the thing` | 10 | ❌ neither 1982 Carpenter nor 2011; only *The Thing That Couldn't Die* etc. |
| `john carpenter the thing` | 0 | ❌ |
| `true grit` | 2 | ❌ neither 1969 nor 2010; got *True Grit (2016)* (an ABC Australia item) and *Rooster Cogburn* |

*Dune* works. Almost nothing else does. **There is no parameter combination that restores filtered
movie search** — I tried `media`, `entity`, `attribute`, and `country` in every combination above.
`media=all` and the bare form are the only ways to see films at all, and their ranking is not fit
for purpose.

Also note the date quality: Apple gives the Lynch *Dune* as `1985-01-01` (it opened December 1984)
and *Blade Runner* as `2013`. These are store/media release dates, not theatrical years — a
correctness problem for a `publish_date` field even where a match is found.

### 3.5 Is there a first-party announcement? No.

**DOC**, from Apple's own current documentation at
<https://performance-partners.apple.com/search-api>: `movie` **is still listed as a valid `media`
value**, with documented entity values `"movieArtist, movie"`. The page carries **no changelog, no
deprecation notice, no "what's new" section, and no statement that movie or video results have been
retired.** Stated limit: "The Search API is limited to approximately 20 calls per minute (subject to
change)." Stated purpose: "The Search API allows you to place search fields in your website to search
for content within the iTunes Store and Apple Books Store," available to participants in the Apple
Services Performance Partner Program.

So: **Apple documents a parameter that returns zero results.** I searched for a first-party
announcement and found none. The only adjacent first-party-ish signal is that Apple removed the
dedicated iTunes Movies and iTunes TV Shows apps in tvOS 26.4 (February 2026), continuing a phase-out
begun in 2023 — reported by MacRumors,
<https://www.macrumors.com/2026/02/17/tvos-26-4-itunes-movies-tv-shows-removed/>. **That is a
secondary source and it is about apps, not the API.** It is suggestive of a storefront migration from
"iTunes Store" to "Apple TV" that could plausibly have orphaned the video media types, but I am
explicitly **not** asserting causation, and I could not date the API regression.

**Verdict: unusable, and do not build on the bare-search workaround.** It is undocumented behaviour
standing in for a documented parameter that is broken, with poor relevance and unreliable dates. If
Apple fixes `media=movie` this becomes a genuinely good option — single request, director + runtime +
poster + canonical URL — so it is worth a re-test in a quarter, but nothing should depend on it now.

---

## 4. TMDb

### 4.1 Keyless read paths: none exist — VERIFIED

Every one of these returned `HTTP 401` with
`{"status_code":7,"status_message":"Invalid API key: You must be granted a valid key.","success":false}`:

- `https://api.themoviedb.org/3/search/movie?query=dune`
- `https://api.themoviedb.org/3/movie/438631`
- `https://api.themoviedb.org/4/search/movie?query=dune` (v4)
- `https://api.themoviedb.org/3/authentication/guest_session/new` (**guest sessions themselves
  require a key to create**)
- `https://api.themoviedb.org/3/configuration` (even the public config endpoint)

And **there is no oEmbed endpoint**: `https://www.themoviedb.org/oembed?url=…` returns TMDb's HTML
404 page and `https://api.themoviedb.org/oembed?url=…` returns `HTTP 404`.

The only keyless data on a TMDb film page is its Open Graph markup — `og:title`, `og:description`,
`og:image` (`https://media.themoviedb.org/t/p/w500/…jpg`), `og:type: video.movie` (**VERIFIED** by
fetching the HTML directly with a browser UA). That is title + synopsis + poster and **no director,
runtime, or studio** — and see §4.4 for why Microlink cannot reach it anyway.

### 4.2 Registration — partially verified

**DOC**, <https://developer.themoviedb.org/docs/getting-started>: "To register for an API key, click
the API link from within your account settings page," and users must agree to the terms of use before
receiving a key. So a **TMDb account is required**, and the key lives behind account settings.
**DOC**, <https://developer.themoviedb.org/docs/authentication-application>: the v4 "API Read Access
Token" is also issued from the same account API settings page, and "Both authentication methods
provide the same level of access" — **so v4 is not a keyless alternative to v3**, which §4.1
confirms empirically.

**Not verified:** the exact fields on the signup form — whether it demands a stated use case, an
application URL, a company name, or asks a commercial-intent question. That form sits behind an
authenticated account page which I did not create. What *is* documented is that TMDb "reserves the
right to, in its sole discretion, determine whether Your use is commercial **at the time that you
apply** for the license," which strongly implies a commercial-intent question exists — but I am
flagging that as inference, not fact. Whether approval is instant or reviewed is likewise unverified.

### 4.3 Terms of use — DOC, quoted from <https://www.themoviedb.org/api-terms-of-use>

- **Free for non-commercial use.** §1.A grants a "worldwide…, non-exclusive, **non-transferable,
  non-sublicensable**" licence. §2.A: "The license in Paragraph 1.A above does not permit any
  commercial use… only permitted under a separate written agreement." A personal PKM vault is
  squarely non-commercial and permitted.
- **Attribution is mandatory and specific.** §3: "You must use the TMDB logo to identify Your use of
  TMDB, the TMDB APIs, or TMDB Content," and "You must place the following notice prominently in or
  on Your Application: *'This [website, program, service, application, product] uses TMDB and the
  TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.'*" **This is the sleeper
  cost.** It is not optional and it would have to appear in the shipped framework.
- **Redistributing a script that calls the API with the user's own key: not addressed.** I read the
  terms in full. There is **no clause** governing this either way. The relevant surrounding facts
  are: the licence binds "the individual accepting these API Terms of Use", each framework user would
  obtain their own key and accept the terms themselves, and §1.C forbids "Sell, lease, or sublicense
  the TMDB APIs, access to the TMDB APIs, or TMDB Content" — a free framework that ships *code*
  rather than *access* is not selling or sublicensing. **My reading is that this is permitted, but it
  is a reading, not a quoted permission.** What §1.C *does* unambiguously rule out is shipping a
  shared key: that would be sublicensing access.
- **§1.C also forbids:** attempting to "cloak or conceal Your identity, or the identity of any
  Application that accesses TMDB"; caching "for longer than 6 months, any information obtained
  through or from TMDB"; and using the APIs or content "in connection with, including for training,
  a machine learning (ML) or artificial intelligence (AI) based Application."
- **Two clauses deserve a raised eyebrow for this specific vault.** The 6-month cache limit: a
  capture note holding TMDb-sourced director/runtime/studio *indefinitely* is arguably a cache older
  than six months. And the AI clause, given this repo is developed with AI agents — the prohibition
  is aimed at training and at chatbot query-response systems, not at a human's note-taking, but it is
  not nothing. Neither is disqualifying; both are things a distributable framework would be putting
  on its users' behalf.
- **Rate limit — DOC**, <https://developer.themoviedb.org/docs/rate-limiting>: "They sit somewhere in
  the 40 requests per second range. This limit could change at any time so be respectful of the
  service we have built and respect the `429` if you receive one." Irrelevant at one request per
  capture.

### 4.4 Microlink cannot substitute for TMDb — VERIFIED

`https://api.microlink.io/?url=https://www.themoviedb.org/movie/438631-dune` returns
`"status": "fail"` with the message: **"The URL `https://www.themoviedb.org/movie/438631-dune` uses
antibot protection. Upgrade to a PRO plan."** So the og: tags in §4.1 exist but are unreachable via
the keyless path the vault already uses.

---

## 5. The other keyless candidates — each confirmed or refuted live

| option | keyless? | covers film? | fields returned | verdict |
|---|---|---|---|---|
| **Wikidata SPARQL** | ✅ yes | ✅ 347,749 films | title, director, year, runtime, studio, IMDb id, Wikipedia URL | **recommended** (§2) |
| **Wikimedia REST summary** | ✅ yes | ✅ (as article) | poster, description, extract, canonical URL, QID | **poster companion** (§2.3) |
| **Cinemeta (Stremio)** | ✅ yes | ✅ | title, director, runtime, year, poster, genre, cast, IMDb + TMDb ids | strong runner-up; **no published terms** (§5.1) |
| **iTunes Search** | ✅ yes | ⚠️ filter broken | title, director, year, runtime, poster, URL — but unfindable | **broken** (§3) |
| **TVmaze** | ✅ yes | ❌ **TV only** | n/a for film | **refuted** (§5.2) |
| **Microlink → Letterboxd** | ✅ yes | ⚠️ partial | title+year, description, a still, date | degenerate (§5.4) |
| **Microlink → IMDb** | ✅ yes | ❌ | returns the *IMDb ID* as the title, nothing else | **refuted** (§5.4) |
| **Microlink → TMDb** | ✅ yes | ❌ | blocked: "antibot protection. Upgrade to a PRO plan" | **refuted** (§4.4) |
| **IMDb suggestion endpoint** | ✅ yes | ✅ | title, year, poster, IMDb id, top cast | undocumented, ToS-hostile (§5.3) |
| **TMDb** | ❌ key | ✅ | everything | costed at §7 |
| **OMDb** | ❌ key | ✅ | — | **confirmed key-required** (§5.5) |
| **Watchmode** | ❌ key | ✅ | — | **confirmed key-required** (§5.5) |
| **Trakt** | ❌ key | ✅ | — | **confirmed key-required** (§5.5) |
| **Letterboxd** | ❌ key | ✅ | — | **approval-gated, and explicitly excludes this use case** (§5.6) |
| **JustWatch** | ❌ | ✅ | — | no open public API (§5.7) |

### 5.1 Cinemeta — the option nobody named

`https://v3-cinemeta.strem.io` is Stremio's metadata addon. **VERIFIED**: its manifest self-describes
as `{"id":"com.linvo.cinemeta","version":"3.0.14","description":"The official addon for movie and
series catalogs","resources":["catalog","meta",…],"types":["movie","series"]}`. Keyless, no headers
required, **~0.25 s** across three consecutive calls.

Two requests:

1. `GET /catalog/movie/top/search=<title>.json` → ranked list of `{name, releaseInfo, imdb_id, poster}`
2. `GET /meta/movie/<imdb_id>.json` → full record

**VERIFIED** full record for `tt0087182` (*Dune*, 1984): `name` "Dune", `director` `["David Lynch"]`,
`runtime` `"136 min"`, `year` `1984`, `released` `1984-12-14`, `poster`
`https://images.metahub.space/poster/small/tt0087182/img`, plus `genre`, `cast`, `writer`, `country`,
`awards`, `imdbRating`, `description`, `imdb_id`, **`moviedb_id: 841`**, `background`, `logo`, `slug`.

**Disambiguation is excellent — VERIFIED.** `search=dune` → 15 films, correctly including the 1984
Lynch film alongside Parts One/Two/Three and *Jodorowsky's Dune*. `search=true grit` → 4, with both
**2010** and **1969** in the top two. This is better-ranked than Wikidata's and far better than
iTunes'.

**Why it is not the recommendation, honestly stated:**

- **No studio/production-company field at all** — the one wanted field it entirely lacks.
- **No published terms of use for third-party callers, and no stability guarantee.** **DOC**: the
  Stremio addon SDK's meta-response documentation references Cinemeta only as "a comprehensive
  example" of a detailed meta object; it documents the *schema* (`director`, `runtime`, `poster`,
  `released`, `releaseInfo`, `cast`, `imdbRating`, `country`, `awards`, `genres`, `description` are
  all documented optional fields) but contains **no statement about terms, licensing, stability, or
  permission for external callers**. Compare Wikidata: CC0, a published rate-limit, a published UA
  policy, and Wikimedia Foundation behind it.
- Its `moviedb_id` field makes clear the data is TMDb-derived, so using it is arguably routing around
  TMDb's attribution requirement.
- Two requests instead of one; unknown IMDb ids `307`-redirect to `cinemeta-live.strem.io`
  (**VERIFIED**), which `requestUrl` will follow silently.

A miss returns `HTTP 200` with `"metas": []` (**VERIFIED**) — same empty-success trap as Wikidata.

### 5.2 TVmaze — refuted, it is TV-only

**VERIFIED**, keyless (no key, no headers):

- `GET /search/shows?q=dune` → `HTTP 200`, returns **Dune: Prophecy** (the 2024 HBO *series*).
- `GET /search/movies?q=dune` → `HTTP 404`:
  `{"message":"Page not found.", "previous":{"name":"Invalid Route","message":"Unable to resolve the request: search/movies"}}`
- `GET /singlesearch/shows?q=inception` → `null`, `HTTP 404`.

The suspicion was right: **there is no movie route, and film titles do not resolve.** TVmaze is
keyless and pleasant, and entirely irrelevant to a Movie capture type.

### 5.3 IMDb's suggestion endpoint — works, but do not use it

**VERIFIED**: `https://v2.sg.media-imdb.com/suggestion/d/dune.json` and
`https://v3.sg.media-imdb.com/suggestion/x/dune.json?includeVideos=0` both return keyless JSON with
`{id: "tt15239678", l: "Dune: Part Two", y: 2024, q: "feature", qid: "movie", s: "Timothée Chalamet,
Zendaya", i: {imageUrl, width, height}}` — i.e. title, year, IMDb id, a full-resolution poster URL,
and a type discriminator. Excellent disambiguation material.

**Do not build on it.** It is IMDb's internal autocomplete backend: undocumented, unversioned in any
published sense, carrying no terms of use, and IMDb's own conditions of use prohibit data extraction.
It provides no director, runtime, or studio anyway. Recording it here so nobody rediscovers it and
thinks it is a find.

### 5.4 Microlink against film pages — VERIFIED, one of three works, partially

`sourceCaptureArticle.js` already calls Microlink keyless, so this is the cheapest possible option to
try. I called `https://api.microlink.io/?url=<film page>` against one real page on each host:

| host | URL | result |
|---|---|---|
| **IMDb** | `https://www.imdb.com/title/tt1160419/` | `status: success`, but **`title: "tt1160419"`** — the IMDb ID, not the film. `description`, `author`, `image`, `lang` all `null`. Re-run against `tt0087182` gave the same shape. **Useless.** |
| **Letterboxd** | `https://letterboxd.com/film/dune-2021/` | `status: success`. `title: "Dune (2021)"`, `description` = the synopsis, `date: 2021-09-03`, `publisher: letterboxd.com`, `image` = `…/dune-2021a-1200-1200-675-675-crop-000000.jpg`. **Partially useful.** |
| **TMDb** | `https://www.themoviedb.org/movie/438631-dune` | `status: fail` — "uses antibot protection. Upgrade to a PRO plan." **Blocked.** |

Reading the Letterboxd row carefully: it gives **title (with the year embedded in it, parseable) and
a synopsis and an image** — but **no director, no runtime, no studio**, and the image is a 1200×675
*crop of a still*, not a poster.

**And it changes the workflow.** Microlink needs a URL, so the user must already have found the film
on Letterboxd, in a browser, and pasted the link. That is the Article capture's model, and it is a
defensible one — but it is not "type a title, get metadata". For a Movie type it means the capture
begins outside Obsidian every single time. Say so plainly to whoever is deciding: **this option
trades away the search step entirely.** As a *supplementary* enrichment when the user happens to have
a Letterboxd URL, it is nearly free; as the primary path, it is a downgrade in both workflow and
field coverage.

### 5.5 OMDb, Watchmode, Trakt — all confirmed key-required, VERIFIED

- **OMDb**: `https://www.omdbapi.com/?t=dune&y=2021` → `HTTP 401`,
  `{"Response":"False","Error":"No API key provided."}`. **DOC**, from
  <https://www.omdbapi.com/apikey.aspx>: account types are "Patreon" or "FREE! (1,000 daily limit)";
  the free key is emailed to the address you supply, with the page itself warning of "Email Delays!…
  If your requested key doesn't show up within an hour, please contact me directly." All content is
  "licensed under CC BY-NC 4.0" and the site notes it "is not endorsed by or affiliated with
  IMDb.com". So: 1,000/day is plenty, but it is a key, obtained by email, from a one-person project.
- **Watchmode**: `https://api.watchmode.com/v1/search/?search_field=name&search_value=dune` →
  `HTTP 401`, `{"success":false,"errorMessage":"Please enter a valid API key."}`.
- **Trakt**: `https://api.trakt.tv/search/movie?query=dune` with no headers → a **Cloudflare
  "Attention Required!" challenge page**, not JSON. Trakt requires a `trakt-api-key` header
  (a registered client id).

### 5.6 Letterboxd — approval-gated, and it explicitly excludes this exact use

`https://api-docs.letterboxd.com/` is publicly readable and lists a rich film API (`GET /film/{id}`,
`GET /films`, `GET /films/autocomplete`, `GET /search`). **DOC**, from that page: "The Letterboxd API
uses standard OAuth2 Password, Client Credentials, Authorization Code and Refresh Token authorization
flows… The Password flow is for first-party use only. **Third-party API consumers must use the Client
Credentials or Authorization Code flows.**"

Getting credentials is the blocker. **DOC**, verbatim from <https://letterboxd.com/api-beta/>:

> "Access to the Letterboxd API is available by request only. If you'd like to be considered for
> access, please email details of your intended use to [address]. Please include the title of your
> app or project clearly in the subject line, and note that while we read all applications, we are
> unable to individually reply, or to guarantee access. **At this time we are not granting access for
> data-analysis, visualization or recommendation projects, for LLM or GPT-related use, for private or
> personal projects,** or for any usage that recreates current or planned features of our paid
> subscription tiers."

"For private or personal projects" is precisely what a personal PKM vault is. The suspicion was
correct and then some: this is not merely approval-gated, **the stated policy excludes this
use case by name.** The same page adds: "If you require an API for non-Letterboxd-specific movie and
TV data (cast, crew, synopsis, poster, etc.), we recommend applying for access to TMDB directly."
Letterboxd's own footer credits "Film data from TMDB."

### 5.7 JustWatch — no open public API

I could not find a first-party self-service signup. `https://apis.justwatch.com/docs/api/` exists and
JustWatch markets a streaming-availability Data API, but access is stated to be partner-only via a
`data-partner@justwatch.com` contact, with the company able to "only work with bigger partners and
clients." **This is the weakest-sourced item in this document** — I am relying on search-result
summaries of JustWatch's own pages rather than a page I fetched and read end-to-end, so treat the
exact wording as unconfirmed. The direction is not in doubt: there is no self-service public API, and
JustWatch is about *where to stream*, not director/runtime/studio, so it is off-target for this use
case regardless.

---

## 6. What the module would look like

**`99 - Meta/02 - Scripts/sourceCaptureMovie.js`, ~100–120 lines**, plus one row in the orchestrator's
`TYPE_REGISTRY` (`name: "Movie"`, an icon, `tag: "source/movie"`, a filename prefix, `capturer`).

Shape, following `sourceCaptureBook.js` and reusing the existing helpers:

1. `requiredPrompt(tp, "Movie Title")`, then `optionalPrompt(tp, "Year (if you know it)")`.
2. `fetchWithFallback({ label: "movie data", fetch, fillGaps, manual })`.
3. `fetch` issues **one** `helpers.httpGetJson` GET to `query.wikidata.org/sparql` with the §2.2
   query (a descriptive `User-Agent` header, per §2.5 and matching `OPEN_LIBRARY_UA`'s precedent),
   then:
   - map `results.bindings` to plain rows;
   - **`throw new Error("No films found")` when the array is empty** — §2.2 showed a miss is a
     200, so `fetchWithFallback` only reaches `manual` if the module raises;
   - narrow by the year prompt if one was given;
   - if more than one row survives, `await tp.system.suggester(rows.map(r => `${title} (${year}) — ${director}`), rows)`; skip the picker on a single row; `null` from the suggester means cancelled.
4. `fillGaps` prompts only for what came back empty — chiefly **studio** (14.6% coverage) and
   **runtime** (45.8%), which is exactly the `d.general_subject || await optionalPrompt(...)` pattern
   `sourceCaptureBook.js` already uses.
5. Optional poster: if the row carried a Wikipedia article URL, one more `httpGetJson` to
   `…/api/rest_v1/page/summary/<title>` for `thumbnail.source`, wrapped so a failure costs nothing.
6. `yamlField("director", …)`, `publish_date` (year), `runtime`, `studio`, `url` (the Wikipedia
   article, or `https://www.wikidata.org/wiki/<QID>`), `imdb_id`, `poster`. Body follows the Book
   pattern plus `helpers.recapBlock("film")` — ADR 0010 and issue #41 put a Source Recap on every
   earning type, and a film is plainly one.

Sizing sanity check against the existing modules: Book 93, YouTube 114, Orchestrator 120, Lecture
235. The picker adds maybe 15 lines over Book; there is **no** vault reading, **no** `tp.file.create_new`,
**no** template-birthing — none of what makes Lecture 235 lines. **This is a Book-class module, not a
Lecture-class one.**

Tests belong in `99 - Meta/03 - Scripts-tests/` with a mocked `tp`, exactly as the existing suite
does; the SPARQL response is a fixture, so no network is needed in CI.

Docs to update if this ships: `99 - Meta/01 - Documentation/TEMPLATES.md` (source-capture
architecture), `METADATA.md` (the per-source-type field table gains a Movie row),
`EXTERNAL-INTEGRATIONS.md`, and the filename-prefix table in `CLAUDE.md`/`STRUCTURE.md`.

---

## 7. Ranked recommendation

### 1. Wikidata SPARQL, with Wikimedia REST for the poster — **build this**

Keyless, no account, no approval, no terms to accept, CC0 data, published rate limits, ~0.3–2.1 s,
one GET (plus one optional GET for the poster). Delivers title, director, year, runtime, studio,
IMDb id and a canonical URL. All **VERIFIED** live on 2026-07-30.

**What you are accepting:** studio present for 14.6% of films and runtime for 45.8%, so those two
fields will often fall through to a prompt — which is the vault's existing, well-worn pattern, not a
new failure mode. Posters need the second request and are non-free fair-use images. Query must use
`GROUP BY` aggregation or it returns cartesian nonsense, and must treat an empty `bindings` array as
a failure.

**Remaining risk, honestly:** everything was proven with `curl`, not inside Obsidian. §2.5 replayed
the query with an Obsidian-shaped UA successfully, which retires the specific failure mode
`sourceCaptureBook.js` documents — but a real in-app run is still the last mile, per this repo's own
standard for environment-dependent claims.

### 2. Cinemeta — the documented fallback

If Wikidata's runtime/studio sparsity proves annoying in practice, Cinemeta returns director, runtime
and poster with far higher hit rates and better search ranking, keyless, in two fast requests. It has
no studio field, no published terms for third-party callers, and no stability guarantee. That
governance gap is the only reason it is second, and it is a real reason for a *distributable*
framework — but for a purely personal vault it would be a defensible first choice.

### 3. Microlink against a Letterboxd URL — a supplement, not a path

Zero new dependencies (already used by `sourceCaptureArticle.js`), but only title+year, synopsis and
a still, and it requires the user to arrive with a URL in hand. Worth wiring as an *optional*
enrichment if a Letterboxd URL is pasted; not worth building the type around.

### 4. TMDb with a user-supplied key — **not needed, but here is the honest cost**

TMDb has the best data by a distance. It is not required, because option 1 works. But if the
runtime/studio coverage in §2.1 is judged unacceptable, this is what adopting it would actually cost
a distributable vault — and it is more than "add a key file":

- **Where the key lives.** A new gitignored file, e.g. `99 - Meta/02 - Scripts/apiKeys.local.js`
  exporting `module.exports = { tmdb: "" }` (a function-returning-object if Templater's loader
  objects — `CLAUDE.md` records that its user-script loader **rejects non-function exports**, which
  is why `TYPE_REGISTRY` is exposed via a `typeRegistry()` accessor). A committed
  `apiKeys.example.js` documents the shape.
- **It must be gitignored.** Add `99 - Meta/02 - Scripts/apiKeys.local.js` to `.gitignore`, beside
  the existing `.claude/settings.local.json` and `.obsidian/plugins/obsidian-git/data.json` entries —
  the file already has a precedent for exactly this class of "device-specific secret".
- **`framework-manifest.json` must actively exclude it, and this is the sharp edge.**
  `99 - Meta/04 - Tooling/generate-manifest.ps1` line 85 reads
  `Add-Tree '99 - Meta' 'core' @('99 - Meta/05 - Backups/')` — **every file under `99 - Meta` is
  swept in as class `core`**, and `core` means, per that script's own header comment, "the updater
  backs up user-modified copies, **then overwrites**." So without action the key file would be (a)
  **hashed into the manifest and shipped in the release zip** — publishing the maintainer's key —
  and (b) **overwritten on every user's update**. The fix is one line: add
  `'99 - Meta/02 - Scripts/apiKeys.local.js'` to that `Add-Tree` exclude-prefix array, exactly as
  `05 - Backups/` is excluded. The updater only touches paths present in a manifest — new or
  installed (**VERIFIED** by reading `update-vault.sh`'s merge and deletion loops) — so once excluded
  the file is untouched forever. The `updater-test` skill exists precisely to regression-test this,
  and should be run.
- **`SETUP.md` gains a manual step for every framework user.** `99 - Meta/01 - Documentation/SETUP.md`
  would have to instruct each user to: create a TMDb account, accept the API terms, generate a key
  from account settings, copy `apiKeys.example.js` to `apiKeys.local.js`, paste the key, and **reload
  Templater's user scripts** (`CLAUDE.md`: Templater caches loaded user scripts). That is six steps
  the vault has never asked of anyone.
- **Plus the attribution obligation (§4.3).** Every framework user's vault would need the TMDB logo
  and the verbatim notice "This [application] uses TMDB and the TMDB APIs but is not endorsed,
  certified, or otherwise approved by TMDB." This is a first for the repo — no existing integration
  imposes a branding requirement.
- **Degradation with no key.** The module reads the key file inside a `try`, treats a missing file or
  empty string as `skip: true` on `fetchWithFallback` — the exact mechanism `sourceCaptureBook.js`
  already uses when the user supplies no ISBN — and goes straight to manual prompts **with no Notice
  and no error**. Capture must never break for the majority of users who never configure a key. The
  practical consequence: the *default* experience of a Movie type built this way is a fully manual
  form, and only configured users get auto-fetch. Which is a strong argument for option 1, where
  everyone gets auto-fetch on day one.

### 5. iTunes Search API — broken; re-test in a quarter

`media=movie` returns zero results against Apple's own live documentation (§3). The bare-search
workaround surfaces real, field-rich movie records but ranks them so poorly that *Inception*,
*Parasite*, *The Thing* and *True Grit* are all unfindable. If Apple restores the filter this becomes
a genuinely good single-request option — worth a diary note, worth nothing today.

### Not viable at all

**TVmaze** (no movie route — **VERIFIED** 404 "Unable to resolve the request: search/movies"),
**OMDb / Watchmode / Trakt** (all **VERIFIED** key-required), **Letterboxd** (approval-gated and its
published policy excludes "private or personal projects" by name), **JustWatch** (no open public API;
and it answers a different question), **Microlink → IMDb** (returns the IMDb ID as the title),
**Microlink → TMDb** (**VERIFIED** blocked by antibot).

---

## Sources consulted

All retrieved **2026-07-30**.

**Live requests I made myself (curl)** — the basis for every claim marked VERIFIED:
- `query.wikidata.org/sparql` — ~25 queries: coverage counts, GET/POST, UA variants, label-match
  strategies, MWAPI EntitySearch, aggregation, and the five disambiguation cases
- `en.wikipedia.org/api/rest_v1/page/summary/…` and `en.wikipedia.org/w/api.php`
- `itunes.apple.com/search` and `itunes.apple.com/lookup` — ~20 parameter combinations;
  `is1-ssl.mzstatic.com` artwork upscaling
- `api.themoviedb.org` v3/v4/guest_session/configuration/oembed; `www.themoviedb.org` og: markup
- `api.microlink.io` against IMDb ×2, Letterboxd, TMDb film pages
- `v3-cinemeta.strem.io` — manifest, catalog search ×4, meta ×2, miss and bad-id cases, latency ×3
- `api.tvmaze.com` search/shows, search/movies, singlesearch/shows
- `www.omdbapi.com`, `api.watchmode.com`, `api.trakt.tv`
- `v2.sg.media-imdb.com` and `v3.sg.media-imdb.com` suggestion endpoints
- `letterboxd.com/api-beta/`, `api-docs.letterboxd.com`

**First-party documentation**
- <https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual> — 60 s timeout, throttling, UA policy, GET/POST guidance
- <https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual/MWAPI> — `EntitySearch` profile and example
- <https://www.themoviedb.org/api-terms-of-use> — §§1–8, read in full
- <https://developer.themoviedb.org/docs/getting-started>, <https://developer.themoviedb.org/docs/authentication-application>, <https://developer.themoviedb.org/docs/rate-limiting>
- <https://performance-partners.apple.com/search-api> — `movie` still documented; ~20 calls/min; no deprecation notice
- <https://letterboxd.com/api-beta/> — access policy, quoted verbatim; <https://api-docs.letterboxd.com/> — OAuth2 flows
- <https://www.omdbapi.com/apikey.aspx> — free tier terms
- <https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md> — meta schema; Cinemeta referenced only as an example

**Secondary, and labelled as such in the text**
- <https://www.macrumors.com/2026/02/17/tvos-26-4-itunes-movies-tv-shows-removed/> — tvOS 26.4 removed the iTunes Movies/TV Shows apps. Contextual only; **not** offered as an explanation for §3.
- JustWatch API availability (§5.7) rests on search-result summaries, not a page I read end to end.

**This vault**
- `99 - Meta/02 - Scripts/sourceCaptureBook.js`, `sourceCaptureArticle.js`, `sourceCaptureHelpers.js` — the consumer contract, `httpGetJson`'s GET-only shape, `fetchWithFallback`'s semantics, `OPEN_LIBRARY_UA`'s precedent
- `99 - Meta/02 - Scripts/*.js` line counts — module sizing (Book 93, YouTube 114, Orchestrator 120, Lecture 235)
- `99 - Meta/04 - Tooling/generate-manifest.ps1` (line 85 `Add-Tree '99 - Meta' 'core'`; class semantics at lines 11–13), `update-vault.sh` (merge + deletion loops), `framework-manifest.json` (v2.14.0; 147 core / 18 config; `research/` not shipped)
- `.gitignore` — existing precedent for machine-local secret files
- `CLAUDE.md` — Templater user-script loader rejects non-function exports; reload required after edits

**Explicitly not verified** (do not assume either way): the exact fields on TMDb's API signup form,
including whether it asks a commercial-intent question or requires an application URL; whether TMDb
key approval is instant or reviewed; whether the TMDb terms permit redistributing a script that calls
the API with an end user's own key (**no clause addresses it** — §4.3 gives my reading and labels it
as such); the date on which Apple's `media=movie` filter stopped returning results, and whether any
first-party announcement exists anywhere; JustWatch's exact stated access policy; and whether
`requestUrl` inside Obsidian sends a User-Agent that satisfies Wikimedia's UA policy (§2.5 is strong
evidence, not proof).
