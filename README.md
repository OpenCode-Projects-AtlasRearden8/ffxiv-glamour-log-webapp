# FFXIV Glamour Log

A tiny, offline tracker for Final Fantasy XIV glamour plates. One HTML file, zero
dependencies, no accounts, no servers, no network calls — your data lives in your
browser and nowhere else.

## What it does

- **Outfit cards per job** — plate name, all six glamour slots (Weapon, Head, Body,
  Hands, Legs, Feet), dye notes for each piece, and screenshot notes (where the
  /gpose shot lives, captions, album slots).
- **Themed-set tags** — built-in tags for *casual*, *raid night*, and *season*, plus
  any custom tags you like. Filter the whole log by job or tag.
- **Dup-piece warnings** — when the same piece shows up on more than one plate,
  the app flags it (dyed variants count as the same piece, since dye follows the
  plate, not the item). It also catches the same piece accidentally listed twice
  inside one plate.
- **Outfit-idea scratchpad** — park half-formed looks in a scratchpad, then turn an
  idea into a new plate with one click when it's ready.
- **Shopping list** — mark any piece as "need it" and it lands on a shopping list
  grouped across all your plates, with a one-click "mark owned everywhere" button.
- **Backups** — export everything to a JSON file and re-import it later. Great for
  moving between browsers or keeping a safe copy.

## How to run it

No install, no build step:

1. Download or clone this folder.
2. Double-click `index.html` (or open it in any modern browser).

Prefer a local server? From this folder run:

```
python3 -m http.server 8080
```

then visit `http://localhost:8080`. Either way the app works fully offline.

## Your data

Everything is stored in your browser's `localStorage` under the key
`ffxiv-glamour-log-v1`. It is private to that browser profile on that device.
Use **Save backup** to download a JSON copy, and **Load backup** to restore it.
Nothing is ever sent anywhere — the app makes no network requests at all.

## Tests

The duplicate-detection logic (cross-set warnings, within-set warnings, the
shopping list, and tag collection) is covered by a small dependency-free test
suite. If you have Node.js 18 or newer:

```
node tests/run-tests.mjs
```

The tests read the app's own inline scripts, so they always test the real code.
Node is only needed for tests — the app itself runs in the browser alone.

## Credits

Built by **Asdale Dynamics, LLC** (Dylan Asdale) — plain-English AI guides,
books, and practical tools at `dylanasdale.github.io`.

## Legal notes

- Unofficial fan tool. Not affiliated with or endorsed by Square Enix.
  FINAL FANTASY XIV is a trademark of Square Enix Holdings Co., Ltd.
- Released under the MIT License — see [LICENSE](LICENSE).
