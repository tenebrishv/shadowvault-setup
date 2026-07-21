# Research: Fetching a YouTube transcript into an Obsidian note (ticket #28)

**Branch:** `research/yt-transcript-fetch`
**Goal:** Map, from primary sources, how a Templater script running inside Obsidian can pull a YouTube video's caption track and turn it into `[mm:ss] text` lines (later clickable seek-links), using Obsidian's `requestUrl` (CORS-bypassing) rather than browser `fetch`.

**Verification status:** The YouTube mechanism below was validated **live end-to-end via `curl` from this environment** on 2026-07-21 against video `jNQXAC9IVRw` ("Me at the zoo"). What has *not* been verified is behaviour **inside Obsidian's `requestUrl`** specifically — see "Recommended approach" for the one live check still owed. The project memory (CORS/UA-filtering failures only reproduce in Obsidian, not Node/mocks) applies: `curl` success is necessary but not sufficient evidence that `requestUrl` will behave identically.

---

## 1. Mechanism — obtaining the caption track programmatically

There are two layers. You need **both**: an InnerTube call to get the (signed) caption-track URL, then a GET on that URL to get the cues.

### Step A — InnerTube `youtubei/v1/player` (POST) to list caption tracks

- **URL:** `https://www.youtube.com/youtubei/v1/player` (an `?key=<INNERTUBE_API_KEY>` query param is *accepted* but **not required** — the live probe below omitted it and still got a 200 with full data).
- **Method:** `POST`, `Content-Type: application/json`.
- **Body (client context required):**
  ```json
  { "context": { "client": { "clientName": "ANDROID", "clientVersion": "20.10.38" } },
    "videoId": "VIDEO_ID" }
  ```
  The canonical `youtube-transcript-api` library uses exactly this ANDROID context (`INNERTUBE_CONTEXT = {"client": {"clientName": "ANDROID", "clientVersion": "20.10.38"}}`) and posts `{"context": ..., "videoId": ...}`. Source: [`_settings.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_settings.py) and `_fetch_innertube_data` in [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py). A WEB context (`"clientName":"WEB","clientVersion":"2.2024..."`) also works and needs no key/OAuth per [dev.to: "YouTube has a hidden API"](https://dev.to/0012303/youtube-has-a-hidden-api-heres-how-to-use-it-no-key-no-quotas-3knj); the ANDROID client is reported to have better success rates / fewer bot challenges.
- **Where the tracks live in the response:**
  `response.captions.playerCaptionsTracklistRenderer.captionTracks[]`.

**Live probe (this environment, 2026-07-21):** a keyless POST with the ANDROID body returned `numTracks 2`, e.g.:
```json
{ "baseUrl": "https://www.youtube.com/api/timedtext?v=jNQXAC9IVRw&ei=...&expire=1784628508&sparams=...&signature=6CA342...F5B&key=yt8&lang=en&fmt=srv3",
  "name": { "runs": [ { "text": "English" } ] },
  "vssId": ".en", "languageCode": "en", "isTranslatable": true, "trackName": "" }
```
Note the `baseUrl` carries a short-lived `signature` + `expire` — it must be used fresh, not cached.

### Step B — GET the caption `baseUrl` (choose format with `fmt=`)

Take `captionTracks[i].baseUrl` and GET it. The `baseUrl` from InnerTube already contains the video id and the required signature; append/replace `&fmt=`:

- `&fmt=json3` → structured JSON (recommended; easiest to parse).
- `&fmt=srv1` (or no `fmt`) → simple XML.
- `&fmt=srv3` → the default YouTube returns; XML with word-level timing.
- `&fmt=vtt` → WebVTT.

The `youtube-transcript-api` library strips `&fmt=srv3` from the `baseUrl` (falling back to the default XML) and GETs it directly — no second signature step needed. Source: `TranscriptList.build` in [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py); format list from [Grokipedia: YouTube timedtext endpoint](https://grokipedia.com/page/YouTube_timedtext_endpoint).

> **Important:** the *bare, legacy* form `https://www.youtube.com/api/timedtext?v=ID&lang=en&fmt=json3` (no signature) is effectively dead — a live `curl` with a browser UA returned an **empty body** for both `json3` and `srv1`. You must go through InnerTube to get a *signed* `baseUrl`. Do not build the timedtext URL by hand from just the video id.

**Live-verified response bodies** (GET on the signed `baseUrl`, this environment):

- **json3:**
  ```json
  { "wireMagic": "pb3", "events": [
    { "tStartMs": 1200, "dDurationMs": 2160, "segs": [ { "utf8": "All right, so here we are, in front of the\nelephants" } ] },
    { "tStartMs": 5318, "dDurationMs": 2656, "segs": [ { "utf8": "the cool thing about these guys..." } ] } ] }
  ```
- **srv1 XML:**
  ```xml
  <?xml version="1.0" encoding="utf-8" ?><transcript>
    <text start="1.2" dur="2.16">All right, so here we are, in front of the
  elephants</text>
    <text start="5.318" dur="2.656">the cool thing about these guys...</text>
  </transcript>
  ```

---

## 2. Line shape — start time + text per cue

**json3 (recommended):** each element of `events[]` has:
- `tStartMs` — start in **milliseconds** (integer).
- `dDurationMs` — duration in ms (how long it stays on screen; cues can overlap).
- `segs[]` — array of text segments; concatenate `segs[].utf8` for the cue text.
- Filter out events with **no `segs`** (timing/style markers) and the leading style objects (`pens`, `wsWinStyles`, `wpWinPositions`).

To produce `[mm:ss] text`: `s = Math.floor(tStartMs/1000); mm = Math.floor(s/60); ss = s%60` → `` `[${mm}:${String(ss).padStart(2,'0')}] ${text}` ``. Field semantics confirmed live and by [Grokipedia](https://grokipedia.com/page/YouTube_timedtext_endpoint); "some events have no `segs`, filter them" per the [json3 field summary](https://summarize.sh/docs/timestamps.html).

**srv1/srv3 XML:** each `<text>` has `start` and `dur` attributes in **seconds** (float, e.g. `start="5.318"`); text is the element's content. The library parses exactly this: `start=float(attrib["start"])`, `duration=float(attrib.get("dur","0.0"))`, text = element text (source: `_TranscriptParser.parse` in [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py)).

> **Text-decoding gotcha:** XML cue text is HTML-entity-escaped, sometimes doubly (the live srv1 body showed `&amp;#39` for an apostrophe). The library runs `html.unescape` and strips residual tags with a regex. json3 `utf8` is cleaner but can contain literal `\n` newlines inside a cue (collapse to spaces for one-line-per-cue output). For seek-links, prefer json3's integer ms → no float rounding ambiguity.

---

## 3. No-captions fallback — detecting "captions disabled / none"

Detect at **Step A**, before any timedtext GET. After parsing the InnerTube response:

1. Read `response.captions?.playerCaptionsTracklistRenderer`.
2. If that object is **absent**, or it has **no `captionTracks`** array, the video has **no usable captions** → degrade gracefully (write the note without a transcript, show a notice). This is precisely the library's `TranscriptsDisabled` trigger: `if captions_json is None or "captionTracks" not in captions_json: raise TranscriptsDisabled` (`_extract_captions_json` in [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py)).
3. Also check `response.playabilityStatus.status`. If it is **not** `"OK"`, the video itself is blocked and there'll be no captions regardless:
   - `LOGIN_REQUIRED` + reason `"Sign in to confirm you're not a bot"` → bot/IP block.
   - `LOGIN_REQUIRED` + `"This video may be inappropriate…"` → age-restricted.
   - `ERROR` + `"This video is unavailable"` → unavailable/invalid id.
   (Enumerated in `_assert_playability` / `_PlayabilityStatus` / `_PlayabilityFailedReason`, [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py).)
4. Secondary guard at Step B: if the chosen `baseUrl` contains **`&exp=xpe`**, YouTube requires a "PO token" and the GET returns an **empty body** — treat as "transcript unavailable" (`if "&exp=xpe" in self._url: raise PoTokenRequired` in `Transcript.fetch`, [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py); [issue #592](https://github.com/jdepoix/youtube-transcript-api/issues/592)). An empty/zero-length response body from the timedtext GET should always be handled as "no transcript" rather than erroring.

**Prevalence note:** many videos legitimately have *no* caption track (uploader disabled them and no ASR was generated), so the "no captions" branch is a normal path, not an edge case — the workflow must handle it cleanly.

---

## 4. Auto (ASR) vs manual captions & language selection

From `captionTracks[i]`:
- **ASR vs manual:** an auto-generated track has `"kind": "asr"`. Manually uploaded tracks **omit** `kind`. The library splits on exactly this: `if caption.get("kind","") == "asr": generated else: manually_created` (`TranscriptList.build`, [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py)). `is_generated = kind == "asr"`.
- **Language:** `languageCode` (e.g. `"en"`, `"de"`) is the selection key; `name.runs[0].text` is the human label (e.g. "English"); `vssId` looks like `.en` (or `a.en` for asr). Select by matching a preferred `languageCode` list, preferring manual over ASR (the library's `find_transcript` returns manual first, then generated).
- **Translation:** tracks with `"isTranslatable": true` can be machine-translated by appending `&tlang=<langcode>` to the `baseUrl`. The tracklist's `translationLanguages[]` lists the valid targets (`Transcript.translate`, [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py)).

Live probe confirmed the fields: `"kind"` absent on the manual English/German tracks, each with `languageCode`, `name.runs[0].text`, `vssId`, `isTranslatable`.

---

## 5. Fragility / auth

- **API key:** not required. InnerTube accepts a `key=` param but the live keyless POST returned full data. ([dev.to](https://dev.to/0012303/youtube-has-a-hidden-api-heres-how-to-use-it-no-key-no-quotas-3knj), live probe.)
- **OAuth / cookies:** none required for public videos in this probe. A `CONSENT` cookie is sometimes needed in EU-consent regions (the library sets `CONSENT=YES+…` if it sees a `consent.youtube.com` redirect — `_create_consent_cookie`, [`_transcripts.py`](https://raw.githubusercontent.com/jdepoix/youtube-transcript-api/master/youtube_transcript_api/_transcripts.py)). Age-restricted/private videos will not yield captions without auth.
- **POST body required?** Yes — Step A is a `POST` with the `{context:{client:…}, videoId}` JSON body. There is no GET equivalent that reliably returns caption tracks. (An older approach scraped `ytInitialPlayerResponse` from the watch-page HTML; the current library still fetches the watch page but only to pull `INNERTUBE_API_KEY`, then POSTs to InnerTube.) **This raises implementation weight slightly: the robust path needs a POST with a JSON client-context body, not a simple GET.**
- **Endpoint stability:** unofficial, undocumented, unversioned — known to change. Specific live risks: bot-detection (`playabilityStatus` flips to `LOGIN_REQUIRED` from datacenter IPs), the **PO-token / `&exp=xpe`** rollout that empties caption bodies on some videos ([issue #592](https://github.com/jdepoix/youtube-transcript-api/issues/592)), signed `baseUrl` expiry (must fetch fresh), and periodic client-version bumps. Grokipedia states plainly these endpoints are "not documented, not versioned, and not stable" ([Grokipedia](https://grokipedia.com/page/YouTube_timedtext_endpoint)).
- **Officially supported alternative — NOT usable here:** YouTube Data API v3 `captions.download` requires **OAuth 2.0 with `youtube.force-ssl`/`youtubepartner` scope AND edit permission on the video (i.e. you must own it)**, and costs 200 quota units/call ([Google docs](https://developers.google.com/youtube/v3/docs/captions/download)). It cannot download captions for arbitrary third-party videos, so it does **not** fit a "paste any YouTube URL into my vault" workflow. The unofficial InnerTube+timedtext path is the only viable one for arbitrary videos.

---

## 6. CORS / `requestUrl` fit (Obsidian)

`requestUrl` is the right tool; browser `fetch` would be blocked by CORS on both `youtubei/v1/player` and `api/timedtext`.

Confirmed from the official Obsidian API docs:
- `requestUrl` issues HTTP/HTTPS requests **"without any CORS restrictions"** (main-process client, not the renderer's `fetch`). ([requestUrl](https://docs.obsidian.md/Reference/TypeScript+API/requestUrl))
- **`RequestUrlParam`** supports everything needed: `url` (string, required), `method` (string — so `POST` is fine), `headers` (`Record<string,string>` — custom `Content-Type`, and a UA if needed), `body` (`string | ArrayBuffer` — for the JSON POST body), `contentType` (string), `throw` (boolean, default `true` — set `false` to inspect non-2xx without an exception, useful for the no-captions/blocked branches). ([RequestUrlParam](https://docs.obsidian.md/Reference/TypeScript+API/RequestUrlParam))
- **`RequestUrlResponse`** exposes the raw body: `status` (number), `headers` (`Record<string,string>`), `text` (string — raw XML/json3 body), `json` (any — parsed InnerTube response), `arrayBuffer`. So you can POST InnerTube and read `.json`, then GET the timedtext URL and read `.text`. ([RequestUrlResponse](https://docs.obsidian.md/Reference/TypeScript+API/RequestUrlResponse))

Sketch (conceptual):
```js
const player = await requestUrl({
  url: "https://www.youtube.com/youtubei/v1/player",
  method: "POST",
  contentType: "application/json",
  body: JSON.stringify({ context:{client:{clientName:"ANDROID",clientVersion:"20.10.38"}}, videoId }),
  throw: false,
});
const tl = player.json?.captions?.playerCaptionsTracklistRenderer;
if (!tl?.captionTracks?.length) { /* no captions -> graceful notice */ }
const track = pickLanguage(tl.captionTracks);           // prefer manual, then kind:"asr"
const url = track.baseUrl.replace(/&fmt=\w+/, "") + "&fmt=json3";
const cues = (await requestUrl({ url, throw:false })).json?.events ?? [];
// cues.filter(e=>e.segs).map(e => `[${mmss(e.tStartMs)}] ${e.segs.map(s=>s.utf8).join("")}`)
```

---

## Recommended approach for the vault

**Use the two-step unofficial path: InnerTube `POST youtubei/v1/player` (ANDROID client, no key/cookies) → GET the returned signed `baseUrl` with `&fmt=json3`.** Rationale:
- json3 gives integer `tStartMs`, which maps cleanly to `[mm:ss]` and to future seek-links (`https://youtu.be/ID?t=<seconds>`), avoiding XML double-unescaping and float rounding.
- InnerTube is the only path that yields a *working* (signed, non-empty) timedtext URL today; the bare legacy timedtext URL is dead (verified).
- No API key, OAuth, or cookies for public videos (verified live). The official `captions.download` is a dead end for third-party videos (owner-OAuth only).

**Graceful-degradation contract to implement:** treat *any* of these as "no transcript, write the note anyway with a notice" — (a) missing `playerCaptionsTracklistRenderer`/`captionTracks`; (b) `playabilityStatus.status !== "OK"`; (c) `baseUrl` contains `&exp=xpe`; (d) empty timedtext body. Never hard-error the capture on these.

**Language selection:** accept a preferred `languageCode` list; prefer tracks **without** `kind:"asr"` (manual) over `kind:"asr"` (auto); fall back to the first available; optionally offer `&tlang=` translation for `isTranslatable` tracks.

**Still needs live Obsidian verification (owed before shipping):**
1. That `requestUrl` reproduces the keyless InnerTube POST success from a real user IP inside Obsidian (residential IPs are *less* likely to hit bot-detection than this probe's, so risk is low — but per project memory, only an in-Obsidian run proves it; a UA header may be needed).
2. Whether Obsidian/Electron's default UA triggers any different `playabilityStatus`; if so, set a `User-Agent` header via `RequestUrlParam.headers`.
3. Real-world `&exp=xpe` (PO-token) hit-rate on the user's typical videos — if high, we may need the WEB client or a watch-page-HTML fallback. Confirm on a sample before relying solely on ANDROID/InnerTube.

**Risk flags for the ticket:**
- The robust path **requires a POST with a JSON client-context body** (not a plain GET) — modest added complexity, and the client version string is a maintenance point that YouTube may force-bump.
- A **non-trivial fraction of videos legitimately have no captions**, and a growing subset are hit by **PO-token (`&exp=xpe`) empty responses** — both are normal, expected branches, so the "no transcript" path must be first-class, not an afterthought.
- Endpoints are unofficial/unversioned and **can break without notice**; budget for occasional maintenance (client version, format quirks).
