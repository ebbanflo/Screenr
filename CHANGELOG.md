# Changelog

All notable changes to Screenr are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-07-07

### Changed

- **Complete UI redesign — the app now looks like the page itself.** Courier for every UI element, white paper sheets on a pale desk, typewritten uppercase controls, black-ink active states, hairline rules, red-pencil danger accents. Emoji removed from the chrome.
- **Print engine rewritten with true pagination.** Screenr now lays out exact 8.5×11" pages itself (Courier 12pt, 6 lines/inch, 60-char lines, standard element indents) and prints with zero browser page margin — eliminating the URL/date headers and footers browsers add. Scene headings keep with their following block, dialogue never splits across pages, and pages get standard top-right numbers from page 2.
- The header page count is now exact — computed by the same pagination engine that prints — instead of a rough estimate.

### Fixed

- Mobile keyboards no longer offer contact/name autofill or fight autocorrect in structural fields: autofill is disabled across the app, autocorrect is off for locations, character names, transitions, and times (prose fields keep it), and the name-hinting input ids that triggered iOS contact heuristics were renamed.
- Elements hidden with the `hidden` attribute could still show when they carried a `display` style of their own (the editor's Export/Print buttons appeared on the library screen); a global guard now enforces it.

## [2.1.0] - 2026-07-07

### Added

- Responsive phone layout: the app auto-detects the viewport and switches below 700px — full-width bottom toolbar with safe-area padding, character picker and export menu presented as bottom sheets, stacked library cards and setup rows, and a compact header.
- Touch-device detection (`pointer: coarse`): block tools are always visible instead of hover-only, and chips/buttons get larger tap targets on any touch screen regardless of size.

### Fixed

- Inputs use 16px font on small screens so iOS Safari no longer zooms the page when a field is focused.
- Header buttons no longer wrap their labels on narrow screens.

## [2.0.0] - 2026-07-07

### Added

- Fountain (`.fountain` / `.txt`) import: parses the title page, scene headings, dialogue (including extensions, parentheticals, and dual-dialogue `^` marks), transitions, and action; rebuilds the character list, saved locations, and per-scene casts automatically. Files that fail JSON parsing fall back to the Fountain parser.
- Dual dialogue: a ⇄ toggle on dialogue blocks pairs a line with the dialogue block above it; printed side by side in two columns and exported to Fountain with the `^` mark.
- Drag-to-reorder: a ⠿ handle on every block for dragging it anywhere in the script, with a drop-position indicator.
- Live page estimate in the editor header and `~pages` on library cards, based on standard element line widths (~55 lines per page).

## [1.0.0] - 2026-07-07

### Added

- Project library: create, open, duplicate, delete, and browse multiple screenplays with scene/word counts.
- Structured script editor with four block types: scene headings (slug lines), action, dialogue, and transitions.
- Slug line builder: INT./EXT. chips, saved-location autocomplete, time-of-day chips with custom values, and per-scene character cast tagging.
- Dialogue blocks with one-tap character picker (scene cast surfaced first), inline character creation, V.O./O.S./O.C./CONT'D extensions, and parentheticals.
- Transition presets (CUT TO:, FADE OUT., DISSOLVE TO:, …) with free editing.
- Title page builder: title, credit, author, source, draft date, contact, and copyright.
- Characters & Places setup tab; locations typed into slug lines are remembered automatically.
- Keyboard flow: Enter advances to the next logical block (with speaker alternation in dialogue), Shift+Enter for line breaks, Backspace on an empty block deletes it.
- Local persistence in IndexedDB with debounced autosave.
- Export to Screenr backup (`.screenr.json`) and Fountain (`.fountain`); JSON import that never overwrites existing projects.
- Print output in US industry-standard screenplay format (Courier 12pt, US Letter, standard margins and element indents) including a formatted title page.
- Dark, writer-focused UI with a light "page" for the script; responsive down to phone widths.

[Unreleased]: https://github.com/ebbanflo/Screenr/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/ebbanflo/Screenr/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/ebbanflo/Screenr/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/ebbanflo/Screenr/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ebbanflo/Screenr/releases/tag/v1.0.0
