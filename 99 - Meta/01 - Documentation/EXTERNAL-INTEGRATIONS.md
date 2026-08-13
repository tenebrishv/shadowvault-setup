# External Integrations

This file tracks tools that connect to your vault.  
None are currently implemented – add them here as you adopt them.

README: [README](../../README.md)

---

## Implemented Integrations

Tools currently in the vault.

| Tool | Purpose | Platform | Status |
|------|---------|----------|--------|
| **Media Extended** (v4.2.7) | Timestamped notes + screenshots for YouTube/video directly in Obsidian (Coursera-style) | Obsidian plugin | Plugin installed and enabled. YouTube capture emits an MX player embed plus `media:` and a minted `mx-uid:`, which together make the source note MX's media-note — one note per video, no `media-lib/` duplicate. MX writes one key back at us — `captions:`, after its caption fetch; see *Media Extended frontmatter keys* below for all three. Screenshots land in `07 - Attachments/Screenshots` as WEBP. **Capture is view-gated** — timestamps and screenshots only register from an open side-pane player view, never from the inline embed. Seek-links are pasted, never hand-written — see *Media Extended seek-links* below for their actual shape. See issue #26 (Map: Coursera-style YouTube note-taking). Chosen over HoverNotes and the Web Clipper for video. |

### Media Extended frontmatter keys — the conformance contract

Three MX keys live in our notes. This integration **fails silently** — a missing
or malformed key throws nothing, it just quietly stops working — so each one is
written down here with who writes it and what breaks without it:

| Key | Written by | Purpose | What breaks if it's wrong |
|-----|-----------|---------|---------------------------|
| `media` | **Us** (`sourceCaptureYoutube.js`) — mirrors `url` | MX's own media property (it recognises `media`, `video`, `audio`); makes the embed and its seek-links resolve | Player embed and seek-links stop resolving |
| `mx-uid` | **Us** (`helpers.mxUid`) — minted at capture | MX's *identity* key; its parser gates on this and never reaches `media` without it (ADR 0012) | MX can't see the note, spawns a duplicate under `media-lib/` |
| `captions` | **Media Extended**, after its caption fetch | List of wikilinks to fetched `.vtt` tracks | Nothing we own — but hand-edits are lost/ignored; re-run the fetch instead |

`captions` is the odd one out: the only MX key **MX writes into our frontmatter**
rather than one we write into MX's namespace. Its value is a list of wikilinks to
`.vtt` files in flat `07 - Attachments/`, each with a `#lang=…&label=…` fragment,
named `<mx-uid>.<short>.<lang>.vtt` — so the caption files inherit whatever uid MX
resolved. Full shape in METADATA.md → *YouTube / Video*; it is in the schema
fixture's `PLUGIN_WRITTEN` so the vault at least knows it exists (#49).

Any of the three changing across an MX upgrade is a silent break, which is why
they are enumerated rather than left to be rediscovered live.

### Media Extended seek-links

What MX's timestamp command actually inserts (observed live, v4.2.7, 2026-07-28):

```
[00:17](https://www.youtube.com/watch?v=caCeQppJOW4&t=18#t=00:17.60)
[03:23](https://www.youtube.com/watch?v=lq7tnxGLWGk&t=204#t=03:23.64)
```

Three things about that shape, none of which match the `[mm:ss](url#t=SECONDS)`
form the capability audit (#27) recorded — corrected by **#50**:

1. **Both** a `&t=` query param and a `#t=` fragment are written, not the
   fragment alone.
2. The **fragment is clock time**, `#t=mm:ss.dd` — `#t=00:17.60`, not `#t=18`
   (hundredths are dropped when zero: `#t=01:00`). Whole seconds, rounded, go
   in the *query* param instead.
3. **MX normalises the host.** A note captured from `https://youtu.be/<id>`
   gets anchors on `https://www.youtube.com/watch?v=<id>`, so an anchor URL
   will **not** string-match the note's own `url:` / `media:` values. Any future
   "does this anchor point at this source?" check must compare video ids, not
   URLs. Relevant to #46, which generalises the seek-link to non-AV media.

Nobody composes these by hand — the reader pastes what MX gives them — so
documentation should point at the command, not at a format to reproduce.

---
## Planned Integrations
Tools you intend to implement **next**.

| Tool | Purpose | Platform | Priority |
|------|---------|----------|----------|
| **Zotero** | PDF archival, annotation, research paper export via Better BibTeX + Zotero Integration plugin | All | Medium |
| **Obsidian Web Clipper** | Clip articles and selections straight into `00 - Inbox/` with the vault's own frontmatter and filename prefixes; also the only web-highlight capture the vault has | Browser extension (Chrome/Firefox/Safari incl. iOS/Edge) | **High** — keyless, first-party, schema-exact. Covers the *capture* half of the Article workflow today. Parallel fast-path to Templater Source Capture, not a replacement: no vault read access, so no stub-birthing (Lecture/Series) and no `mx-uid` (Video). Tracked as issues #64–#66; see `research/obsidian-web-clipper.md`. |
| **Raindrop** | Read-later **queue** outside the vault: collections, cross-device sync, an archived copy independent of Obsidian | Web/Extension | Medium — no longer "the article pipeline"; Web Clipper covers capture keylessly. Raindrop's remaining value is queuing and out-of-vault archival, and it is account-gated (ADR 0014 tier 2). Adopt only if a triage buffer outside the vault is genuinely wanted. |

---

## Considered Integrations

Tools under evaluation – no commitment yet.

| Tool | Purpose | Platform | Notes |
|------|---------|----------|-------|
| **Fabric** | AI‑assisted research and capture | Web | Subscription? Overlaps with getrecall.ai |
| **Snipd** | Podcast timestamped notes and reviews | iOS/Android | Good for mobile. A **companion capture tool, not a pipeline source**: its official Obsidian plugin syncs snips into its own `Snipd/` note tree, and carrying the essentials (host, guest, URL, date, key quotes) into a Podcast source note is a **manual** step. It cannot feed `sourceCapturePodcast.js` — the plugin talks to a private, undocumented backend behind device-code auth, so there is no third-party contract to build on (issue #67; `research/snipd-podcast-capture.md`). |
| **getrecall.ai** | AI summaries for YouTube, PDFs, podcasts, web; chat with notes | Web | Freemium; broadest coverage of the AI-summary tools |
| **Mathpix** | Screenshot → LaTeX conversion | All | Useful for STEM notes |
| **PastReads** | Pull highlights from Kindle, Apple Books, web, Readwise | Browser extension | Free; overlaps with the **Kindle Highlights** plugin already in PLUGINS.md — pick one importer |
| **Glasp** | Social web highlighter, export to Obsidian | Web/Extension | Free; overlaps with PastReads for web highlights |
| **PDF viewer** | Native or integrated PDF annotation | Obsidian / External | Likely covered by Zotero once adopted; Obsidian's built-in viewer + Omni Search/Text Extractor (PLUGINS.md) handle basics |

---

## Rejected / Not Pursuing

Ideas that were considered and dropped, kept here with the reason so they don't get re-raised.

| Tool | Reason dropped |
|------|----------------|
| **DevonThink Pro** | macOS-only; this vault runs on Windows, so it can't be adopted here. |
| **HoverNotes** | Superseded — Media Extended was chosen as the in-Obsidian video note-taking engine. |
| **TextSniper** | macOS-only. On Windows, PowerToys' Text Extractor covers screenshot OCR, and Omni Search + Text Extractor (PLUGINS.md) covers in-vault OCR search. |
| **Pocket** | Redundant with Raindrop (chosen article pipeline), and discontinued by Mozilla in 2025. |
| **Todoist** | Task management sits outside this PKM vault's scope; quick capture is handled by the Inbox + Web Clipper. Revisit only if a task layer is genuinely needed. |

---

## PDF Viewing

No PDF viewer integration yet. Options to consider:
- Obsidian's built‑in PDF viewer (basic)
- External: Zotero + Better BibTeX + Zotero Integration plugin
- External: Highlights (Mac/iOS)

---

## Integration Notes

When you add an integration, document:

- Plugin or tool name and version
- Setup steps (e.g., API keys, folder paths)
- How it feeds into your workflow (e.g., "Zotero highlights → Literature Notes via Zotero Integration plugin")
- Any colour conventions (e.g., Zotero highlight meanings)

---

## Zotero Highlight Colour Convention (when implemented)

| Colour | Meaning |
|--------|---------|
| Yellow | Important point by author |
| Green | Important to me |
| Pink | Disagree with author |
| Purple | Follow-up needed |
| Blue | Notes added later |

---

*This file will grow as you evaluate and adopt external tools.*