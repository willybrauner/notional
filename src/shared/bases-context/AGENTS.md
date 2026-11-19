# Bases context

**Files**: `src/shared/bases-context/`

## Purpose
The only module touching Bases' internal `updateCurrentFile` (what `this` is for a base). Shared by base-own-context and side-peek, so they never patch it twice in different ways.

## Behavior
- Obsidian calls `view.updateCurrentFile(activeFile)` on every `bases` view at each `file-open` and active leaf change; the view forwards it to `controller.updateCurrentFile`, which re-runs the query.
- `patchUpdateCurrentFile.ts` (base-own-context): patches the **controller** prototype (the view's handlers keep a reference to its original method). The prototype is taken from the first loaded bases view (`findBasesView.ts`). A controller hosted in a main area or popout tab (`findHostView.ts`, `isInSidebar.ts` through `leaf.getRoot()`) gets its own file; an embedded base keeps the native argument. Returns the restore function.
- `freezeBaseContext.ts` (side-peek): while a side peek is open, overrides `updateCurrentFile` on the controllers of the bases outside the panel (an instance override, on top of the prototype patch), then re-syncs them with the active file when it closes.

## Limits
- Relies on Obsidian internals: `view.controller`, `controller.updateCurrentFile`. Re-syncing re-renders the open bases.
