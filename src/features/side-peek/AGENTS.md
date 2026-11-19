# SidePeekFeature

**File**: `src/features/side-peek/side-peek.ts`

## Purpose
Notion-like side peek: notes opened from a base — a plain click in any view (table, cards, list, timeline…) or the "New" button — open in a full-height right panel over a light overlay. **Desktop app only** (`desktopOnly` in the registry), so nothing exists on mobile (phones and tablets keep Obsidian's native behavior).

## Behavior
- Slide-in from the right (200ms) + overlay fade-in; **Close** button (`chevrons-right`, top left of the panel) or **Escape** → slide-out (150ms) and close. The overlay doesn't catch clicks: the page behind stays editable while the panel is open
- The panel is a **real workspace leaf**: the note is edited exactly as when opened normally (properties, select picker, icons, commands…). Links clicked inside navigate within the panel
- **Mod+Enter** or **Open as full page** button (`maximize-2`, next to Close) → closes the panel and opens the note in the leaf behind
- **Border**: `--side-peek-border-color` if a theme sets it, the table border color otherwise.
- **Resizable**: drag the panel's left border. The width is saved in the vault's localStorage (`app.saveLocalStorage`, per device) and reused by every side peek; any later resize replaces it. Clamped between the panel's CSS `min-width` and `max-width` (`styles/side-peek.scss`, read via `getComputedStyle`: the only place to change them); the CSS `max-width` also caps a saved width
- New items open with their title selected (`eState: { rename: 'all' }`)
- **Keyboard**: in a table, select the file name cell with the arrows and press Enter → the note opens in the panel (other cells keep their native Enter: edit the property). A note whose title is a single mention alone (see `title-mention`) opens the mentioned note instead, in every view (Enter only, not clicks)
- Mod/Shift/Alt/middle clicks keep the native behavior (new tab, selection…)
- Still open after quitting or reloading Obsidian, exactly as it was

## Implementation
- **Panel** (`createSidePeek.ts`): `workspace.getLeaf('split', 'vertical')`, then its tab group (`leaf.parent.containerEl`, not in the public API) gets `.notional-side-peek` → `position: fixed` takes it out of the split layout, so the page behind keeps its full width. Closing detaches the leaf (layout restored). The overlay lives in `document.body`; no workspace ancestor creates a stacking context.
- **Header buttons**: Close and Open as full page are prepended to the view's `.view-header-left` (before back/forward), once per view (views are reused when navigating inside the leaf).
- **Resize** (`attachResizeHandle.ts`): a handle over the left border; on `pointerdown`, `pointermove`/`pointerup` are listened on the document (not pointer capture) so the drag survives the pointer leaving the thin handle. Width = window width − `clientX` (panel anchored right), applied as `--notional-side-peek-width` on the panel, saved on release (`WIDTH.storageKey`). The CSS default (`clamp(420px, 50vw, 900px)`) applies until a width is saved.
- **Restart** (`findLeftoverPeekLeaf.ts`): the workspace layout is saved with the peek's split, so quitting/reloading (even "Reload app without saving") with the panel open restores it as a regular right split. The open peek's leaf id (`getLeafId.ts`, internal) is kept in the vault localStorage (`OPEN_LEAF_STORAGE_KEY`) until closed; on `onLayoutReady`, a remaining id → `workspace.getLeafById` (internal) → that same leaf is turned back into a side peek (`createSidePeek(app, onClosed, restoredLeaf)`): same note, scroll and cursor as restored by Obsidian, `.is-restored` skips the slide-in. `findOriginLeaf.ts` picks the page behind (outside the panel's tab group) for **Open as full page**.
- **Base context** (`src/shared/bases-context/freezeBaseContext.ts`, next to base-own-context's prototype patch): natively, a base makes `this` follow the active file (`file-open` → `controller.updateCurrentFile`, internal), so peeking a note in another folder emptied bases filtered on `this.file.folder`. Main area bases no longer follow it (see `base-own-context`); this still covers sidebar bases. While the peek is open, `updateCurrentFile` is overridden on the controllers of the bases outside the panel; closing removes the override and re-syncs them with the active file.
- **Hotkeys**: a `Scope` (parent `app.scope`) is pushed on the keymap stack while open, so unhandled keys reach the app and the focused view as usual. Suggests, menus and modals push their own scope above it and keep Escape. It overrides Obsidian's default Mod+Enter (open link under cursor in new tab) while the panel is open. Popped on close, including when the tab is closed from Obsidian (`layout-change` with `leaf.parent` gone).
- **Clicks** (`patchOpenLinkText.ts`): every base view opens notes through `workspace.openLinkText`. Capture listeners flag plain `click`/`pointerup`/Enter inside `.bases-view` for the duration of their dispatch (timeline bars open on `pointerup`, focused items on Enter); while flagged, `openLinkText` on a markdown note (`resolveMarkdownFile.ts`) opens the peek instead.
- **Table keyboard** (`getActiveTableCellLink.ts`): Obsidian's table does nothing on Enter for the file name cell. Its keyboard-selected cell is a `.bases-table-active-cell` box drawn over the table (no DOM link to the row): the cell under its center (`elementsFromPoint`) is found; if it is a `file.*` cell, its `.internal-link` note opens in the peek. Only when the focus is on `.bases-table-container` itself (not while editing a cell).
- **New item** (`isNewItemPopover.ts`): Obsidian creates the note then shows it in a hover popover (embedded editor: our features don't run there). A `MutationObserver` on `document.body` children spots it — Obsidian flags the `.bases-toolbar-new-item-menu` button `has-active-menu` *before* appending it — and hides it before paint. Once tagged `bases-new-item-popover` (ready, its editor is `workspace.activeEditor` on the new note), it is closed by simulating an outside click (`closeHoverPopover.ts`) and the note reopened in the peek.

## Limits
- Relies on Obsidian internals: `leaf.parent.containerEl`, `leaf.id`, `workspace.getLeafById`, new item menu classes
- After a restart the split may show for a frame before becoming the panel again

## Turning off
Extends `Feature`. `openLinkText` is restored and the listeners go with the feature; `onunload` closes the panel without animation (leaf detached, overlay, scope and base context freeze removed), stops the new item observer and gives a new item popover still waiting (observer per popover in `pendingNewItems`) its native look back.
