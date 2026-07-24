# External Integrations

This file tracks tools that connect to your vault.  
None are currently implemented – add them here as you adopt them.

README: [README](../../README.md)

---

## Implemented Integrations

Tools currently in the vault.

| Tool | Purpose | Platform | Status |
|------|---------|----------|--------|
| **Media Extended** (v4.2.7) | Timestamped notes + screenshots for YouTube/video directly in Obsidian (Coursera-style) | Obsidian plugin | Plugin installed and enabled. YouTube capture emits an MX player embed plus `media:` and a minted `mx-uid:`, which together make the source note MX's media-note — one note per video, no `media-lib/` duplicate. Screenshots land in `07 - Attachments/Screenshots` as WEBP. **Capture is view-gated** — timestamps and screenshots only register from an open side-pane player view, never from the inline embed. See issue #26 (Map: Coursera-style YouTube note-taking). Chosen over HoverNotes and the Web Clipper for video. |

---
## Planned Integrations
Tools you intend to implement **next**.

| Tool | Purpose | Platform | Priority |
|------|---------|----------|----------|
| **Zotero** | PDF archival, annotation, research paper export via Better BibTeX + Zotero Integration plugin | All | Medium |
| **Raindrop** | Article/bookmark save‑for‑later; the chosen article-capture pipeline (see WORKFLOWS.md: Article → Raindrop → Source Note) | Web/Extension | Medium |
| **Obsidian Web Clipper** | Quick-capture web pages/ideas into the Inbox to defer context switching | Browser extension | Low — Raindrop covers the article path; Web Clipper is for quick fleeting capture only |

---

## Considered Integrations

Tools under evaluation – no commitment yet.

| Tool | Purpose | Platform | Notes |
|------|---------|----------|-------|
| **Fabric** | AI‑assisted research and capture | Web | Subscription? Overlaps with getrecall.ai |
| **Snipd** | Podcast timestamped notes and reviews | iOS/Android | Good for mobile; feeds the Podcast source type |
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
| Purple | Literary note to look up later |
| Blue | Notes added later |

---

*This file will grow as you evaluate and adopt external tools.*