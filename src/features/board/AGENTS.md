# BoardFeature

**File**: `src/features/board/board.ts` (view: `BoardView.ts`)

## Purpose
Notion-like board view for Bases (`notional-board`): one column per value of a property, drag cards between columns (writes the value) and reorder them, drag columns, hide columns, color them.

## Implementation
- Registered through `registerFeatureBasesView` (`src/shared/entries/lifecycle/`), with a hover link source.
- `BoardView` gets its services as deps (colors, icons, select picker and its options), never another feature.

## Limits
- Turning off relies on Bases internals of the base's controller (`view`, `viewContainerEl`, `update`, `clearError`, `getViewConfig`, `query`), see `src/shared/entries/lifecycle/types.ts`.
- A drag in progress when the feature is turned off is not cancelled (its ghost stays until the pointer is released).

## Turning off
Extends `Feature`. `deregisterView` only forgets the type: Obsidian keeps an open board running. So `onunload` closes every open board (its controller drops the view and runs `update()`): the base shows Obsidian's **"Base configured with an unknown view type: notional-board"** message, the view menu keeps the view name, and the `.base` file is left untouched. Turning it on again rebuilds those views (`clearError()` then `update()`), unless the base was closed or switched to another view meanwhile. The view removes its host class, `tabindex` and body drag class.
