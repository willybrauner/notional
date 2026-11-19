# Entries

**Files**: `src/shared/entries/`

## Purpose
What the Bases views listing notes (board, timeline) share, so neither depends on the other: their registration and lifecycle, note menus, selection, rename and rendering of an entry.

## Modules
- `lifecycle/registerFeatureBasesView.ts`: registers a Bases view type for a feature. Obsidian keeps open views running after `deregisterView`, so turning the feature off closes them (`closeBasesView`: the base shows the "unknown view type" message, the `.base` file is untouched) and turning it on again rebuilds them (`reopenBasesViews`). Uses Bases controller internals listed in `lifecycle/types.ts`.
- `showEntryMenu.ts`: right-click menu of an entry (open in new tab, open to the right, rename, delete the note or the selection), then the items of other plugins (`file-menu` event).
- `renameEntryTitle.ts`: rename input over an entry title (inline-note-rename's `mountRenameInput`, which title-mention extends with its `@` suggest).
- `trashEntries.ts` and `ConfirmDeleteModal.ts`: deleting notes, after a confirmation listing them; they go to the trash set in Obsidian's settings.
- `selection/attachMarquee.ts`: rectangle selection drawn from an empty area (Shift/Cmd adds to the selection), `hitTestPaths.ts` finds the items it touches.
- `autoScroll.ts`: scrolls a view while a drag nears its edges.
- `render/renderEntryTitle.ts` (icon, title with mention chips), `renderSelectChip.ts`, `renderBarProperties.ts` (property chips of a card or bar).

## Users
board, timeline (and inline-note-rename's input, title-mention's chips through `renderEntryTitle`).
