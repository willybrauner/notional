# BaseOwnContextFeature

**File**: `src/features/base-own-context/base-own-context.ts`

## Purpose
A base opened in a tab of the main area (or a popout window) always uses itself as `this` (filters, formulas), whatever tab has the focus. Natively, focusing another tab (e.g. a note in a split) made `this` that note: bases filtered on `this.file.folder` (see `auto-base-filter`) then showed the other note's folder.

## Behavior
- Main area / popout bases: `this` = the base file, never changes with the focus
- Sidebar bases: native behavior kept (`this` follows the active note, that is their purpose)

## Implementation
- On each `file-open` and active leaf change, Obsidian calls `view.updateCurrentFile(activeFile)` on every `bases` view, which forwards it to `controller.updateCurrentFile` (re-runs the query). Both are internal.
- The patch and its helpers live in `src/shared/bases-context/`, with side-peek's `freezeBaseContext` (an instance override on top of this prototype patch): the only module touching `updateCurrentFile`.
- Patched on the **controller** prototype (`patchUpdateCurrentFile.ts`), not the view's: the view's event handlers keep a reference to its original method, so a view prototype patch is bypassed for open bases.
- The controller has no link to its tab: `findHostView.ts` finds the `bases` leaf whose `view.controller` is it. Found and outside the sidebars (`isInSidebar.ts`, via `leaf.getRoot()`) → the controller gets `view.file`. Not found (base embedded in a note) → native argument.
- The controller class isn't exported: its prototype is taken from the first loaded `bases` view (`findBasesView.ts`), on layout ready or the next `layout-change`. Loaded bases are then re-synced. `Feature` subclass: `onunload` restores the prototype, then re-syncs every base with the native behavior (e2e: `plugin.e2e.ts`, the prototype method changes on each toggle). The re-sync re-renders open bases: a feature decorating base cells must drop its pending scans when it stops (see select-property's observer).

## Limits
- Relies on Obsidian internals: `view.controller`, `controller.updateCurrentFile`
