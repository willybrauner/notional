# TableClipboardFeature

**File**: `src/features/table-clipboard/table-clipboard.ts`

## Purpose
Makes Cmd+C / Cmd+V work on the keyboard-selected cells of a base table: copy a cell (or a range), select one or more cells below (arrows, Shift+arrows, Mod+Shift+arrows) and paste the value into all of them.

## Behavior
Obsidian's table already implements copy and paste on its container (`.bases-table-container`): copy writes the selection (`text/plain`, `obsidian/bases-cells`…), paste writes the value into every cell of the selection (one transaction, Mod+Z undoes it). But Chromium fires clipboard events at the text selection or the focused editable, else at `<body>`: the table container (a plain focusable div) never receives them with the real shortcuts — paste does nothing, copy leaves the clipboard unchanged.

## Implementation
- `forwardToTable.ts`: capture listeners on the document (and popout window documents, `window-open`) for `copy` and `paste`. When the focused element is a table container and the event target is outside it, the event is re-dispatched on the container with the same `clipboardData` (still writable during the original dispatch); if the table handled it (`defaultPrevented`), the original is cancelled so the browser doesn't overwrite the clipboard.
- Left alone (native behavior): any other focused element (editor, input, modal…), an event already targeting the inside of the container (editing a cell focuses its contenteditable), and a non-collapsed text selection (the text is copied, not the cells).
- No `stopPropagation`: the original event still reaches every other listener. Checked with real copy/paste (`webContents.copy/paste`): text copy/paste in the editor, inputs and image paste (media-drop) are unchanged; with the table focused but no active cell, the clipboard is untouched.

## Limits
- Relies on Obsidian's internal table listeners and the `.bases-table-container` class

## Lifecycle
`Feature` subclass: the capture listeners (main and popout documents) and `window-open` are registered on the feature, so turning it off stops forwarding (e2e: `plugin.e2e.ts`, a synthetic `copy` fired at `<body>` with the table focused).
