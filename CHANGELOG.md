# Changelog

All notable changes to Screenr are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ebbanflo/Screenr/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/ebbanflo/Screenr/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/ebbanflo/Screenr/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ebbanflo/Screenr/releases/tag/v1.0.0
