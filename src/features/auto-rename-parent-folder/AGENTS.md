# AutoRenameParentFolderFeature

**File**: `src/features/auto-rename-parent-folder/auto-rename-parent-folder.ts`

## Purpose
When a file is renamed and its parent folder has the same name as the file's old basename, the parent folder is automatically renamed to match the new basename.

## Example
```
projects/my-task/my-task.md  →  renamed to "new-task"
projects/my-task/            →  auto-renamed to "new-task"
```

## Why
The Notionalize convention stores a file inside a same-named folder (`name/name.md`). When you rename the file, the folder should follow.

## Implementation
Listens to `vault.rename` and calls `src/utils/renameNoteFolder.ts` (shared with database-header): when `file.parent.name` is the old basename and the new basename differs, renames the parent folder via `fileManager.renameFile`. Fails silently on error.

## Lifecycle
`Feature` subclass: the vault `rename` listener is registered on the feature, so turning it off stops renaming folders (e2e: `plugin.e2e.ts`).
