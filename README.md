# 🎬 Screenr

### **[▶ Open Screenr](https://ebbanflo.github.io/Screenr/)** — write now, right in your browser

A structured screenwriting app that runs entirely in your browser. Set up your characters and places once, then build your screenplay block by block — every dialogue cue, slug line, and transition is one tap away, so you spend your time on the ideas, not the formatting.

**No accounts, no server, no build step.** Your work is stored locally in your browser (IndexedDB) and never leaves your device.

## Features

- **Project library** — create, open, duplicate, and delete multiple screenplays.
- **Structured blocks** — the script is built from four block types:
  - 🎬 **Scene headings (slug lines)** — tap INT./EXT., pick a saved location (or type a new one — it's remembered), tap a time of day. Tag which characters are in the scene.
  - ✏️ **Action** — free description of what we see.
  - 💬 **Dialogue** — tap to pick the speaker (scene cast shown first), add V.O./O.S. extensions and parentheticals. New characters can be created inline without leaving the script. Toggle **dual dialogue** (⇄) to have two characters speak at once — printed side by side.
  - ⤳ **Transitions** — CUT TO:, FADE OUT., and friends as one-tap presets.
- **Drag to reorder** — grab the ⠿ handle on any block to move it; ↑/↓ buttons work too.
- **Page estimate** — a live rough page count in the header (one page ≈ one minute of screen time).
- **Title page builder** — fill in title, credit, author, source, draft date, contact, and copyright; the printed title page lays it out in standard format.
- **Smart flow** — press <kbd>Enter</kbd> to continue to the next logical block (scene → action, dialogue → dialogue with the speaker alternated for you). <kbd>Shift</kbd>+<kbd>Enter</kbd> for a line break, <kbd>Backspace</kbd> on an empty block to remove it.
- **Print to industry standard** — the Print button produces US-standard screenplay output (Courier 12pt, US Letter, 1.5" left margin, standard element indents). Use your browser's "Save as PDF" to get a PDF.
- **Export / import**
  - **Screenr backup (`.screenr.json`)** — full-fidelity backup; import it on any device to restore.
  - **Fountain (`.fountain`)** — export *and* import the open plain-text screenplay standard, readable by Final Draft, Highland, Fade In, and others. Importing a Fountain script rebuilds your character list, locations, and per-scene casts automatically.
- **Autosave** — every change is saved to IndexedDB within half a second.
- **Phone and desktop** — the layout auto-detects your device: on phones the toolbar goes full-width, pickers open as bottom sheets, and tap targets grow; on desktop you get hover tools and anchored menus. Works the same from a pocket or a workstation.

## Running it

It's a static site — no build, no dependencies.

- **Live:** [ebbanflo.github.io/Screenr](https://ebbanflo.github.io/Screenr/) (deployed via GitHub Pages; every push redeploys automatically).
- **Locally:** open `index.html` in a browser, or serve the folder with any static server (`python3 -m http.server`).

## A note on your data

Everything lives in your browser's IndexedDB, scoped to the site's origin. That means:

- Clearing site data / browsing data will erase your screenplays — **export backups regularly**.
- Work doesn't sync between browsers or devices on its own — use export/import to move it.

## Project structure

```
index.html      app shell
css/style.css   UI theme + print stylesheet (US screenplay format)
js/db.js        IndexedDB persistence
js/fountain.js  Fountain (.fountain) exporter
js/app.js       application logic
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
