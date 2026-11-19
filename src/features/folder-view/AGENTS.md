# FolderViewFeature

**File**: `src/features/folder-view/folder-view.ts`

## Purpose
When clicking on a folder name in the sidebar, opens the index file of that folder (same name as folder, `.md` or `.base`) instead of toggling expand/collapse.

## Behavior
- Click on folder title text → opens `folderName/folderName.md` or `folderName/folderName.base`
- If no index file exists → default Obsidian behavior (toggle)
- `.md` takes priority over `.base`

## Implementation
`Feature` subclass: one click listener on `document` (capture phase) registered with `this.registerDomEvent`, removed when the feature is turned off. Reads `data-path` of the clicked `.nav-folder-title`, constructs both possible index file paths, and opens whichever exists via `workspace.getLeaf(false).openFile()`.

`evt.stopPropagation()` prevents Obsidian from also toggling the folder. Chevron clicks (`.collapse-icon`) pass through.
