# SelectPropertyFeature

**Files**: `src/features/select-property/` (multiple modules)

## Purpose
Replaces Obsidian's plain-text editing for select-type properties with a chip display and a custom dropdown/bottom-sheet picker. Also supports per-value color assignment.

## Module structure

```
constants.ts             — CLASSES, SELECTORS, ATTRS, TIMINGS, EXCLUDED_PROPERTY_TYPES
types.ts                 — PointerState (clicks, taps, touch), InteractionDeps
select-property.ts       — Orchestrator (extends Feature): holds the state, registers the events, scans the active leaf

interactions/
  handleMouseDown.ts     — Desktop: opens the dropdown (delayed) or starts the inline edit (double-click)
  handleTouchStart.ts    — Mobile: remembers the cell a touch starts on
  trackTouchMove.ts      — Mobile: a touch past 8px is a scroll, not a tap
  handleTouchEnd.ts      — Mobile: opens the bottom sheet or starts the inline edit (double tap)
  blockNativeClick.ts    — Blocks Obsidian's click handler on the cells handled here

inline-edit/
  startInlineEdit.ts     — Text edit of the [contenteditable] until Enter, Escape or blur

colors/
  updateChip.ts          — Injects or updates a value chip before [contenteditable]
  refreshChips.ts        — Applies a value's new color to every visible chip (ColorStore listener)

render/
  processCells.ts        — Marks .bases-td cells as select cells, injects chips
  processRenderedValues.ts — Processes .bases-rendered-value (list/card views)
  clearRenderedValueCell.ts — Removes markers from a list/card property element
  markNoteProperties.ts  — Marks note panel properties as select cells
  clearSelectMarkers.ts  — Removes chips, classes and attributes (feature turned off)
  observeContainer.ts    — MutationObserver re-scanning on the next tick, pending scan dropped once stopped
  isValidSelectNoteProp.ts  — Re-validates at click time (guards against stale class)
```

The picker itself is the `SelectPicker` service (`src/services/select-picker/`),
always loaded and also opened by board and timeline (`openPicker`, `getOptions`).
It owns the shared `UIState` (`picker.ui`), the seeds of all the bases
(`picker.globalSeeds`, rebuilt when a `.base` changes), the frontmatter writes,
and the `dropdown/`, `bottom-sheet/` and `seeds/` modules. The feature opens it
with `picker.show(anchor, fmKey, sourcePath, context)` and closes it with
`picker.dismiss()` / `picker.dismissDropdown()`.

The service alone tracks the active file and reads the seeds of the active base
(`picker.activeFile`, `picker.activeBaseSeeds`). The feature subscribes with
`picker.onActiveFileChange((file, seedsRead) => …)`: called right away on a new
active file (the feature re-scans the leaf and dismisses the dropdown, as
Obsidian's event fires), then with `seedsRead` once the seeds of an active
`.base` are read, or re-read after it was modified (only the cells are
re-processed, an open dropdown stays). Dismissing only after the read closed a
dropdown opened in the meantime.

Colors (storage, palette, chip classes) live in the shared `src/services/colors/`
module, also used by the board and tag colors:
`ColorStore` (value → color map, `onChange`), `palette/openColorPalette` (floating
palette) and `palette/renderSwatches` (the only swatch UI, also used inline in the
bottom sheet).

## Contexts
- **Table view** (`.bases-td`) — database table cells
- **List/card view** (`.bases-rendered-value`) — rendered property values
- **Note panel** (`.metadata-property`) — frontmatter properties in the note sidebar

## Interaction model

### Desktop
| Action | Result |
|---|---|
| Single click | Shows dropdown picker (250ms delay to allow double-click) |
| Double click | Inline edit with keyboard |
| Escape / outside click | Dismiss |

### Mobile (`src/utils/isMobile.ts`: touchpoints > 0 AND width < 768px)
| Action | Result |
|---|---|
| Single tap | Shows bottom-sheet modal — no keyboard |
| Double tap | Inline edit with keyboard |
| Tap backdrop | Dismiss |
| Escape | Dismiss |

## Key state (the picker's UIState, `picker.ui`)
- `activeDropdown` / `activeModal` — currently open UI elements (the palette is tracked by `colors/palette/paletteState`)
- `activeBackdrop` — backdrop element for the bottom-sheet
- `activeTd` — the cell/property that triggered the open picker
- `dropdownTimer` / `modalTimer` — pending setTimeout handles

## Persistent data
- `colorMap` — `ColorStore.map` (`value → notion-color-name`), persisted under `selectColors`
- `currentBaseSeeds` — `select.options` from the open `.base` file (`picker.activeBaseSeeds`)
- `globalSeeds` — merged `select.options` from all `.base` files (note panel context)

## Options offered
`select.options` of the base (or of all bases in the note panel), then `collectOptions`: the `DEFAULT_OPTIONS` of the property (`services/select-picker/constants.ts`: the common statuses for `status`, offered in every base) followed by the values already used (folder of the base, or vault). A value created in a base stays specific to it (only stored in its notes).

## Dismiss logic
`dismissDropdown` and `dismissModal` accept the `UIState` object and mutate it in place. Both are safe to call when nothing is open.

## Phase 2 (future)
`dropdown/` and `bottom-sheet/` are kept separate to facilitate future unification via native APIs (`<dialog>`, Popover API) and custom elements.

## Observer
`render/observeContainer.ts` defers its re-scan to the next tick. The deferred scan is dropped when the observer was stopped in between (its stop function sets `stopped`): a scan after the cleanup would put the chips back on cells (seen when base-own-context, turned off just before, re-renders the open base).

## Turning off
`onunload` ends an inline edit in progress, stops the observer, dismisses the dropdown, bottom sheet and palette, and `clearSelectMarkers` removes the chips, classes and `data-*` it set. Its `onActiveFileChange` subscription is registered on the feature, so a seed read that ends after the feature was turned off calls nothing. The service drops a seed read when another file opened meanwhile.
