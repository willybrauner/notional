# TimelineFeature

**File**: `src/features/timeline/timeline.ts` (view: `TimelineView.ts`)

## Purpose
Notion-like timeline view for Bases (`notional-timeline`): one bar per dated note, drag to move, resize the ends, reorder rows, zoom levels, resizable sidebar.

## Implementation
- Registered through `registerFeatureBasesView` (`src/shared/entries/lifecycle/`), with a hover link source.
- `TimelineView` gets its services as deps (colors, icons, select picker), never another feature.

## Limits
- Turning off relies on Bases internals of the base's controller (`view`, `viewContainerEl`, `update`, `clearError`, `getViewConfig`, `query`), see `src/shared/entries/lifecycle/types.ts`.
- A drag in progress when the feature is turned off is not cancelled.
- Writing a time converts the start and end properties from "Date" (or untyped) to "Date & time" through the internal `app.metadataTypeManager` (`getPropertyInfo`, `setType`, `write/getTypeManager.ts`), vault-wide (`write/ensureDatetimeTypes.ts`). A "Date & time" property shows a date-only value at 00:00 and drops the "Open daily note" link.

## Start and end properties
- A view without `startProperty` gets the guessed pair written to its config on render (`options/guessDateProperties.ts`): base note properties first, then the vault's "Date"/"Date & time" properties from the internal `metadataTypeManager.getAllProperties()` (`allProperties` only lists the base's notes). Only once: a set start means the user chose.
- A note with only an end value sits on that day; a write adds its start.

## Hour zoom
- `isHourScale(dayWidth)` decides it. A timed note (`EntryRow.timed`: start or end has a time) sits at its times and moves by 15 minutes; a date-only note keeps whole days and moves by days.
- Any bar resizes by 15 minutes and is written with times (`withTime`); a date-only bar's end edge is the next midnight.

## Turning off
Extends `Feature`. `deregisterView` only forgets the type: Obsidian keeps an open timeline running. So `onunload` closes every open timeline (its controller drops the view and runs `update()`): the base shows Obsidian's **"Base configured with an unknown view type: notional-timeline"** message, the view menu keeps the view name, and the `.base` file is left untouched. Turning it on again rebuilds those views (`clearError()` then `update()`), unless the base was closed or switched to another view meanwhile. The view removes its host class, `tabindex` and body drag state.
