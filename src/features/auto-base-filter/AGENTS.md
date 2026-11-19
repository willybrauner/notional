# AutoBaseFilterFeature

**File**: `src/features/auto-base-filter/auto-base-filter.ts`

## Purpose
Automatically injects a folder-scoped filter into every `.base` file so it only shows files from its own folder and direct subfolders.

## Behavior
- **On create**: an empty `.base` gets the full initial content (`buildNewBaseContent.ts`). A base with content is never touched (sync, git, copy). The `create` listener is registered on layout ready: Obsidian fires `create` for every file while it loads the vault, and the former `onload` listener wrote a filter into every base without a top-level `filters:` at startup
- **On rename/move**: updates the filter expression to reflect the new folder path (`replaceFolderFilter.ts`). The rule line may be unquoted (older Notionalize) or between single quotes (Notionalize now, Obsidian when it saves the base itself): it is always written back quoted. Without that case, a quoted rule kept its old folder and this write (new `newItemFolder` only) overwrote database-header's filter update
- **New base (command, file explorer, ribbon…)**: `patchCreateNewFile.ts` wraps `app.fileManager.createNewFile` so an empty `.base` is created with its initial content directly. Filling it afterwards in the `create` event raced with Obsidian opening the new base: the leaf kept Obsidian's default `viewName: "View"`, missing from our content → "View not found" until another view was picked. The `create` handler stays as a fallback for other creation paths.
- Alongside the filter, sets the top-level `newItemFolder` to the base's folder (`src/utils/withNewItemFolder.ts`), kept in sync on rename/move (also by `DatabaseHeaderFeature` on folder rename). Root-level bases get none.
- Command **Set new item folder on all bases** (`migrateNewItemFolders.ts`) back-fills `newItemFolder` on existing bases

## Why newItemFolder
Obsidian picks the folder for items created from a base (toolbar "New", "Add item" command, `createFileForView` in grouped views) as: `newItemFolder` → `newItemTemplate`'s folder → a folder derived from a top-level `file.inFolder(...)` / `file.folder == ...` filter rule → default new note location. Our filter is a single `&&` expression, so Obsidian can't derive the folder from it — `newItemFolder` makes it explicit for every entry point. `NoteTemplateFeature` then applies `_template.md` since the note is created directly in the right folder.

## Filter format
Built by `buildFilterExpression(folderPath)`, `buildFilterRule(folderPath)` and `buildBaseFilterSection(folderPath)` from `src/constants/base-filter.ts`. The expression targets `file.folder` to restrict displayed rows. Each string of the formula (folder path, folder name) is double-quoted with its backslashes and quotes escaped, and the rule is single-quoted in the YAML (single quotes doubled), so a folder name with `"`, `: ` or ` #` can neither break the filter nor widen it.

## Why
Without this, a `.base` file at `projects/work/tasks.base` would show all files in the vault. This feature makes each database self-contained to its folder by default.

## Lifecycle
`Feature` subclass: the `createNewFile` patch (restored by `this.register`), the vault listeners and the command (through the scoped `this.plugin`) all go with the feature when it is turned off (e2e: `plugin.e2e.ts`).
