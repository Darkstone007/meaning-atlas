# Meaning Atlas

A living archive of culturally situated expression. A word is only the beginning: each account stays intact, and a connection appears only when two accounts share an exact label.

This is not a translator and not a similarity model. Distance in the web is a camera position, not a cultural score.

## What the archive shows

Three written responses from the 12 October 2026 survey are included because those contributors allowed the writing to be shown in a public visualization, under the names they chose:

- Ndeye Astou Ndiaye — Massa, Wolof
- Khadidjatou — Massa, Wolof, from Senegal
- Lana — Čist račun - duga ljubav, Montenegrin / Serbian / Bosnian

The two Massa accounts are not merged. One treats the word as too light for a death; the other uses it in grief as well. On the feeling layer they connect only because both were labelled `care`. On the intention layer the shared label is `comfort`. Lana’s saying connects to them on the context layer only through `friends`.

Contact details are not in this repository. One survey response asked not to be displayed or played. It is not stored here.

## How to move through it

- **Explore** — the word web. Solid lines are branches. Dashed lines are the selected connection layer. Rotate and tilt inspect the structure. Shelves gather the same records by language label. Search checks the wording, not a synonym list.
- **Contribute** — the survey questions, on this site. Optional labels create later connections. The last step is the display permission from the form. Email and phone are not collected.
- **Import & backup** — map a CSV export of the form. Unmapped columns are dropped. Email, phone, WhatsApp and timestamp columns cannot be imported. A row that asks not to be displayed is skipped. A JSON backup stays in your hands.
- **Method** — the rules, in the interface.

Accounts added in a browser stay in that browser. There is no shared account system.

## Rules

| Layer | A connection exists when | It means |
| --- | --- | --- |
| Emotion | Both accounts carry the same feeling label | Similar reported feeling, not the same meaning |
| Context | Both accounts carry the same setting or relationship label | Similar circumstances of use |
| Intention | Both accounts carry the same purpose label | Similar aim, such as comfort or approval |
| Media | Both accounts use the same label on an attachment | A shared annotation, not a similar image or voice |
| Personal | Someone named another account and wrote why | An association a person authored |

Labels on the three included accounts are a researcher’s provisional reading of their wording. They are stored apart from the wording. A later model, if one is ever used, may only propose a label for a person to accept.

## Source map

| Path | Role |
| --- | --- |
| `src/lib/atlas/core.ts` | Normalisation, grouping, search, connections, CSV, consent |
| `src/lib/atlas/seed.ts` | The three display-cleared accounts |
| `src/lib/atlas/layout.ts` | Perspective placement of words, responses and detail branches |
| `src/components/atlas/` | Web, shelves, survey form, import and method |
| `src/lib/atlas/core.test.ts` | Checks that the Massa accounts stay distinct and that consent withholding works |

Prepared for David Ziklag Foster · capstone · 12 October 2026.
