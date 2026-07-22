# Prototype — MX YouTube workflow check (issue #26)

**Throwaway.** Delete once the verdict is folded into the implementation build (the MX rewrite of
`99 - Meta/02 - Scripts/sourceCaptureYoutube.js`) and recorded on #26.

## Question

Do Media Extended **v4.2.7**'s real characteristics match the designed YouTube workflow (the #29
source-note layout + the map's `#t=` / screenshot / transcript assumptions)? And which behaviors can
only be proven inside Obsidian?

## How to run it

One step: open `(prototype) mx-workflow-check.md` in the **dev vault** (MX installed) and walk the
two checklists at the top. The paper-confirmed items (✅) are already settled by
`research/media-extended-v4-characteristics.md`; the ⚠️ items are the live checks that are the whole
reason this prototype exists.

## Why a note, not a terminal/web prototype

The `/prototype` skill's branches (terminal state-machine, web route) don't map to an Obsidian
vault — the "app" is the vault and the "UI" is a rendered note. Per skill rule #1 (obey the
project's existing convention) this follows the repo's `_prototype-ticket-*/` pattern established by
#29 and #31.

## Relationship to prior work

- Layout is the **already-decided #29 capture seam** (closed) — this prototype re-renders it so the
  live MX behavior can be checked against it, not to re-open the layout question.
- Research: `research/media-extended-v4-characteristics.md` (fresh audit vs `mx.aidenlx.site/docs/v4`).

## Verdict

_Fill in after the in-Obsidian walk:_

- Embed renders: ⬜
- Inline-embed click-to-seek (`#t=`): ⬜
- **Inline-embed right-click screenshot** (the unproven one): ⬜ works / ⬜ needs Web Viewer
- `media-lib/` stays clean with editor open: ⬜
- Screenshot alias shape (`mm:ss` vs `Title - time`): ⬜

The screenshot result decides whether the impl's capture step is "right-click the inline player" or
"open in Web Viewer first" — that's the one open design fork this prototype exists to close.
