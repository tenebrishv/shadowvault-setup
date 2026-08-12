# Third-party notices

ShadowVault redistributes Obsidian community plugins under `.obsidian/plugins/`
so that the vault works immediately on unzip. That code is written and owned by
other people.

**ShadowVault's own licence ([LICENSE](LICENSE), AGPL-3.0-only) does not apply
to any of it, and nothing in this project restricts your rights in these
plugins.** Each is governed solely by its own terms below. Several are licensed
under the GPL and AGPL; ShadowVault's own AGPL-3.0 licence is compatible with
them, so bundling them imposes no further obligation on you.

Where the upstream project publishes a licence file, it is vendored alongside
the plugin at `.obsidian/plugins/<id>/LICENSE`. Where it does not, the grant is
declared in the project's `package.json`, cited below, and the standard text of
that licence is reproduced at the end of this file.

## Bundled components

| Plugin | Version | Author | Licence | Upstream |
|---|---|---|---|---|
| Dataview | 0.5.68 | Michael Brenan | MIT | [blacksmithgu/obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview) |
| File Explorer Note Count | 1.2.4 | Ozan Tellioglu | MIT ¹ | [ozntel/file-explorer-note-count](https://github.com/ozntel/file-explorer-note-count) |
| Folder Links | 1.2.5 | Stefan Rausch | MIT | [steveoversea/obsidian-folder-links](https://github.com/steveoversea/obsidian-folder-links) |
| Media Extended | — | AidenLx | **not bundled** ² | [aidenlx/media-extended](https://github.com/aidenlx/media-extended) |
| Metadata Menu | 0.8.12 | mdelobelle | MIT | [mdelobelle/metadatamenu](https://github.com/mdelobelle/metadatamenu) |
| Natural Language Dates Redux | 0.8.28 | Tommy Bergeron | MIT | [tbergeron/obsidian-nldates-redux](https://github.com/tbergeron/obsidian-nldates-redux) |
| Excalidraw | 2.23.7 | Zsolt Viczian | **AGPL-3.0** ³ | [zsviczian/obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) |
| Git | 2.38.3 | Vinzent | MIT | [vinzent03/obsidian-git](https://github.com/vinzent03/obsidian-git) |
| Iconize | 2.14.7 | Florian Woelki | MIT | [florianwoelki/obsidian-iconize](https://github.com/florianwoelki/obsidian-iconize) |
| Link Converter | 0.1.6 | Ozan Tellioglu | MIT ¹ | [ozntel/obsidian-link-converter](https://github.com/ozntel/obsidian-link-converter) |
| Style Settings | 1.0.9 | mgmeyers | **GPL-3.0** ³ | [obsidian-community/obsidian-style-settings](https://github.com/obsidian-community/obsidian-style-settings) |
| Pane Relief | 0.5.9 | PJ Eby | ISC ¹ | [pjeby/pane-relief](https://github.com/pjeby/pane-relief) |
| Review | 1.6.6 | ryanjamurphy | MIT ¹ | [ryanjamurphy/review-obsidian](https://github.com/ryanjamurphy/review-obsidian) |
| Supercharged Links | 0.13.10 | mdelobelle & Emile | MIT | [mdelobelle/obsidian_supercharged_links](https://github.com/mdelobelle/obsidian_supercharged_links) |
| Tag Wrangler | 0.6.4 | PJ Eby | ISC | [pjeby/tag-wrangler](https://github.com/pjeby/tag-wrangler) |
| Templater | 2.20.5 | SilentVoid | **AGPL-3.0** ³ | [silentvoid13/Templater](https://github.com/silentvoid13/Templater) |
| Paste URL into selection | 1.11.4 | denolehov | MIT ¹ | [denolehov/obsidian-url-into-selection](https://github.com/denolehov/obsidian-url-into-selection) |

`shadowvault-property-icons` is ShadowVault's own plugin and is covered by
[LICENSE](LICENSE), not by this file.

¹ No licence file is published upstream; the grant is declared in the project's
`package.json`. Standard text reproduced below.

² **Not redistributed — see below.** Listed because ShadowVault ships settings
for it and its workflow depends on it.

³ Copyleft. Corresponding source is identified below.

## Corresponding source for GPL and AGPL components

GPL-3.0 and AGPL-3.0 require that recipients of a binary can obtain the
corresponding source. The files bundled here are compiled `main.js` builds. The
complete corresponding source for the exact versions distributed is publicly
available at no charge from:

- Templater 2.20.5 — <https://github.com/silentvoid13/Templater/tree/2.20.5>
- Excalidraw 2.23.7 — <https://github.com/zsviczian/obsidian-excalidraw-plugin/tree/2.23.7>
- Style Settings 1.0.9 — <https://github.com/obsidian-community/obsidian-style-settings/tree/1.0.9>

ShadowVault has not modified any of these builds. They are redistributed
byte-identical to the upstream release artefacts.

## Media Extended — required, but not redistributed

Media Extended's upstream repository publishes **no licence** — no licence file,
and no `license` field in `package.json`. Under default copyright that means no
redistribution right has been granted to anyone, including this project.
ShadowVault therefore **does not ship its code**.

The YouTube capture workflow still depends on it. Install it yourself from
Obsidian's community plugin browser (Settings → Community plugins → Browse →
"Media Extended"). ShadowVault does ship `.obsidian/plugins/media-extended/
data.json` — that file is ShadowVault's own configuration, not AidenLx's code —
so once you install the plugin it picks up the settings this vault expects.

Nothing about the capture pipeline changes: the `media`, `mx-uid` and `captions`
frontmatter keys are written by ShadowVault's own scripts, and seek-links are
pasted from the plugin at note-taking time. See
`99 - Meta/01 - Documentation/EXTERNAL-INTEGRATIONS.md`.

## MIT License

Applies to Dataview (Copyright © 2021 Michael Brenan), Folder Links, Metadata
Menu, Natural Language Dates Redux, Git, Iconize and Supercharged Links — see
each plugin's vendored `LICENSE` for its own copyright line — and to the
following components whose grant is declared in `package.json`:

- File Explorer Note Count — Copyright © Ozan Tellioglu
- Link Converter — Copyright © Ozan Tellioglu
- Review — Copyright © ryanjamurphy
- Paste URL into selection — Copyright © denolehov

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## ISC License

Applies to Tag Wrangler (see its vendored `LICENSE`) and to Pane Relief
(Copyright © PJ Eby), whose grant is declared in `package.json`.

```
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

## Obsidian

ShadowVault is a vault for [Obsidian](https://obsidian.md), which is
proprietary software distributed separately by Dynalist Inc. and is not included
here. "Obsidian" is their trademark; this project is unaffiliated.

## External data sources

The Source Capture pipeline queries Open Library, Microlink, CrossRef, YouTube
oEmbed, Twitter oEmbed, Wikidata and TVmaze at capture time. No credentials and
no data from these services are bundled. Retrieved metadata is subject to each
provider's terms and is fetched into the user's local vault, not redistributed
by this project.
