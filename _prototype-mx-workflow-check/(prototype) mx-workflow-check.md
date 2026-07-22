---
tags: prototype
publish: false
---
> [!warning] Throwaway prototype — issue #26 (MX YouTube workflow check). Delete before any merge.
> Inert frontmatter (no `type`/`status`/`review`/`id`) so this note stays out of the dev vault's
> Dataview dashboards. **Purpose:** open this in the dev vault (Media Extended v4.2.7 installed) and
> walk the checklist to confirm MX behaves the way the `/research` findings and the #29 layout
> assume. The layout below is the *faithful* body `sourceCaptureYoutube.js` would emit after the #29
> redesign. Question this answers: *do MX v4's real characteristics match the designed workflow, and
> which behaviors can only be proven here in Obsidian?*

## What research confirmed on paper (no Obsidian needed) ✅

Cross-checked in `research/media-extended-v4-characteristics.md`:

- Bare `![](youtube-url)` → responsive MX player (caps `60vh`, `min-width: 400px`). Matches #29.
- Seek fragment is **`#t=SECONDS`**, not `?t=`. Matches #29's "fix by removal."
- Screenshot snippet template `- !{{SCREENSHOT}} {{TIMESTAMP}}` → a `![[…webp|alias|50]]` image
  paired with a `[mm:ss](url#t=SECONDS)` seek link. Matches #29's mid-watch example.

## What can ONLY be proven here, in Obsidian ⚠️ (this is the point of the prototype)

Walk these live. Repo convention: frame-capture / player-runtime claims are proven in-Obsidian, not
by curl/Node/mocks.

- [ ] **Embed renders.** The `![](…)` line below shows a live MX player (poster frame + controls),
      not a broken image or a raw link.
- [ ] **Click-to-seek works on the INLINE embed.** Click `[00:12]` under Notes → the *embedded*
      player (not a browser tab) jumps to 0:12. This is the whole reason for `#t=`.
- [ ] **Right-click screenshot on the inline embed.** Right-click the player → "Media → Add
      screenshot" (or the timestamped-screenshot command). Does a `.webp` land in
      `07 - Attachments/…` and an `![[…webp|…|50]] [mm:ss](url#t=…)` line insert into the note?
      ⚠️ **Research flags this as unproven for YouTube** — the docs say some hosts block frame
      capture in the local player and to fall back to the **Web Viewer**. #33 claimed right-click
      works on the inline embed; **confirm or refute here.** If it fails → the workflow's screenshot
      step must route through Web Viewer, which changes the capture UX.
- [ ] **No `media-lib/` pollution.** After capturing a timestamp/screenshot *with this note open*,
      confirm MX did **not** silently create a root `media-lib/` note with `mx-uid`/`video`
      frontmatter. (Research §4: auto-note creation triggers when *no editor is open*. Verify the
      "editor open" path stays clean; if a stray note appears, #30's suppress/relocate is load-bearing.)
- [ ] **Screenshot alias shape.** Note whether the inserted alias is `mm:ss|50` (as #29 assumed) or
      `Title - hh:mm:ss|50` (MX default per research §3). Cosmetic, but decides the "Screenshot
      snippet template" setting the impl should ship.

---
## ↓↓↓ Faithful #29 body the seam would emit starts here ↓↓↓

> [!meta]- Metadata
> **Source:** [Me at the zoo](https://www.youtube.com/watch?v=jNQXAC9IVRw)
> **Channel:** [jawed](https://www.youtube.com/@jawed)
> **Watched:** 2026-07-21
> **Transcript:** *not yet fetched*

![](https://www.youtube.com/watch?v=jNQXAC9IVRw)

## Notes
*Grab screenshots & timestamps as you watch — right-click the player or use the hotkey. Jot quick margin notes inline; save real synthesis for the Literature note.*

- [00:12](https://www.youtube.com/watch?v=jNQXAC9IVRw#t=12) first upload ever — deadpan framing
- 

<!--
  The two lines above are hand-written to mimic what MX inserts, so click-to-seek is testable even
  before you capture anything live. Real MX-inserted lines look like:
  - ![[mx-img-jNQXAC9IVRw-pt12s.webp|00:00:12|50]] [00:12](…#t=12)
-->
