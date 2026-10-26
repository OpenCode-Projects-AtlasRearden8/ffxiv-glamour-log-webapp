# STATUS

## What was built

**FFXIV Glamour Log** — a single-file, offline web app for logging FFXIV glamour
outfits per job. Pure HTML/CSS/JS in one `index.html`, zero dependencies, no
network calls of any kind, all data in `localStorage`.

Feature checklist:

- Outfit cards per job: plate name, all six glamour slots (Weapon, Head, Body,
  Hands, Legs, Feet), per-piece dye notes, screenshot notes (location / caption /
  album slot text).
- Themed-set tags: built-in *casual*, *raid night*, *season* checkboxes plus free
  custom tags; filter bar with job chips, tag chips, and free-text search.
- Dup-piece warnings across sets: shared pieces are grouped and shown in a
  "Shared pieces" panel, with per-card badges; dyed variants (e.g. "Circlet
  (Snow White)") are treated as the same underlying piece; same-piece-twice-in-
  one-plate mistakes are flagged on the card too.
- Outfit-idea scratchpad: add, delete, and "Use in outfit" (pre-fills a new
  plate from the idea).
- Shopping list: every piece marked "need it" (owned unchecked) is aggregated
  across plates with references, plus "Mark owned everywhere".
- Backups: JSON export/import, sample data loader, erase-all with double confirm.
- Local-first: everything persists in the browser (`ffxiv-glamour-log-v1` key);
  no accounts, no servers, no tracking, no API use.

## Files

- `index.html` — the entire app (markup, styles, logic).
- `tests/run-tests.mjs` — dependency-free Node test suite for the dup-detection
  core (reads the app's own inline scripts, so it tests the shipped code).
- `README.md` — usage, data notes, credits.
- `LICENSE` — MIT, Copyright (c) 2026 Asdale Dynamics, LLC.
- `STATUS.md` — this file.

## How to run

Open `index.html` in any modern browser (double-click works; fully offline), or
serve the folder with `python3 -m http.server 8080` and visit
`http://localhost:8080`.

## How to test

```
node tests/run-tests.mjs
```

## Verification results

- Node version used: v20.19.2
- Inline JS extracted from `index.html` and checked with `node --check`: OK
- Every element ID referenced in the app script verified to exist in the HTML: OK
- Test suite: **22 passed, 0 failed**, covering:
  - name normalization (trim, case, whitespace, parenthetical dye annotations)
  - cross-set duplicate detection (shared piece across 2 and 3 plates, dyed
    variants, case-insensitive matches, within-set repeats not inflating counts,
    blank names ignored, malformed input handled)
  - within-set duplicate detection
  - shopping-list aggregation (merge across plates, owned pieces excluded,
    reference counts)
  - tag collection (dedupe, sort, malformed input)
  - one realistic three-plate scenario matching the bundled sample data

The initial commit was made locally on branch `main` with the existing git
identity; nothing was pushed and no remote was created.

## Known gaps

- Data is per-browser, per-device: there is no sync between devices (use the
  JSON export/import to move data manually).
- No drag-and-drop reordering of plates or ideas; sorting is alphabetical.
- One dye note per piece slot — a piece worn dyed differently on two plates can
  note each dye, but the app doesn't track dye-per-plate variants separately
  beyond the free-text dye field.
- No image upload or photo storage — screenshot info is text only, by design,
  to keep the file self-contained and data small.
- No service worker / PWA install story; "offline" means the single file works
  with no network once you have it.
- Dup detection is name-based, so item name typos will read as distinct pieces.
- `<dialog>`-based forms require a reasonably modern browser (all evergreen
  browsers are fine).
