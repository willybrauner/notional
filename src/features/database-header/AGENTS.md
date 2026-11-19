# DatabaseHeaderFeature

**File**: `src/features/database-header/database-header.ts`

## Purpose
Injects an editable title header into `.base` file views, allowing renaming of the database and its parent folder directly from the view.

## Behavior
- Shown in **every** open `.base` view, focused or not (split screens, side peek next to a base…)
- Header displays the file's basename as a `contenteditable` span
- Enter / blur → renames the file, then the parent folder when it was named like the base (`src/utils/renameNoteFolder.ts`, shared with `AutoRenameParentFolderFeature`, so it works with that feature off; a rename in progress is shared, the folder is renamed once). Folder last: renaming it first made the rename handlers of the base (auto-base-filter, `onFolderRenamed`) read it at a path it was leaving (ENOENT)
- Escape → resets to original name
- If Obsidian removes the header from the DOM (e.g. view refresh), a `MutationObserver` reinjects it

## Folder rename cascade
When the parent folder is renamed (by the header or `AutoRenameParentFolderFeature`), this feature listens to `vault.rename` on folders and updates the `filter:` expression in all `.base` files inside that folder to reflect the new path.

## Implementation
- `syncHeaders()` (layout ready, `file-open`, `layout-change`, base rename) walks all `bases` leaves and ensures each view's `contentEl` (`.view-content`) has its header, refreshing the title when the view switched to another base or the base was renamed
- Never tied to the active leaf: an earlier version kept a single header for `getLeaf(false)`, so focusing another split removed it from the base
- `createHeader.ts` builds the title; the file is read from the view at edit time
- One `MutationObserver` per view content re-adds a removed header; observers of closed views are dropped on the next sync
- Extends `Feature`: turned off, `onunload` disconnects the observers and removes every header
- `onFolderRenamed()` points the folder rule of every `.base` inside the renamed folder at its own new folder (`replaceFolderFilter()`), nested bases included
