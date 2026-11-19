# InlineNoteRenameFeature

**File**: `src/features/inline-note-rename/inline-note-rename.ts`

## Purpose
Inline rename of a note from its name cell (`.bases-table-cell`, `.bases-list-item`) in Obsidian Bases table and list views.

## Behavior
Clicks are left to Obsidian (the link opens the note) and to side-peek; this feature only handles the double-click.

### Rename
- Double-click on `.bases-table-cell` or `.bases-list-item` (not on `.internal-link`) → shows inline rename input
- Enter / blur → saves and renames file
- Escape → cancels
- Keys already handled by a popover on the input are ignored (`defaultPrevented`): the title mention "@" suggest (`title-mention`) uses Enter/Escape while open
- Rename calls `fileManager.renameFile()` which triggers `AutoRenameParentFolderFeature` as a side effect

## Implementation
Extends `Feature`: the capture `dblclick` listener on `document` goes through `registerDomEvent`, so turning the feature off removes it (an input already open stays until its blur).

The input is `mountRenameInput.ts`, shared with the board and timeline (**Rename** in their right-click menu, via `src/shared/entries/renameEntryTitle.ts`): absolute over its container, one at a time in any view, carrying the note path (`data-notional-path`). Pointer/click events inside it don't reach the card or bar under it.
