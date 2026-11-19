# IconsFeature

**Purpose**: Attach custom icons (+ optional color) to files, folders, page headers, and inline links throughout Obsidian.

## Architecture

| File | Role |
|---|---|
| `icons.ts` | Main feature class (extends `Feature`) — DOM rendering, event wiring, click handling |
| `clearIcons.ts` / `restoreTabIcons.ts` | Turning off: remove the areas, icons and wrappers, give tabs Obsidian's icon back |
| `src/services/icons/IconStore.ts` | Service, always loaded (also used by title mentions, board, timeline, search). Persistence: get/set/remove icon configs per file path; follows vault renames and deletions itself |
| `icon-picker.ts` | Popover UI for choosing an icon and color |
| `render.ts` | `createIconEl()` — builds the icon DOM element; `renderGlyph()` reads the SVG through `getIconSvg` |
| `packs/` | Icon packs added by other plugins (`app.plugins.plugins.notionalize.registerIconPack({ svgs, keywords })`, returns the removal function). A pack name already bundled replaces its glyph, a new name joins the picker; pack names are listed first, each glyph once (`getPickerIcons`). Notionalize fires `notionalize:loaded` on the workspace at each load, so a pack plugin registers again after Notionalize reloads. Unit tests: `test/unit/icons/iconPacks.test.ts` |
| `codemirror-decoration.ts` | CodeMirror extension for inline icon decorations in edit mode |
| `types.ts` | `IconColor` (the 23 colors of the icon palette, `ICON_COLORS` in `constants.ts`; a config color is an `IconColor` or `'default'`), `ResolvedIconConfig` |

## Render targets

`renderAll()` calls four methods on every render pass:

- **`renderBaseHeaders()`** — DB (`.base`) file headers (`.notional-db-header`): places an `.notional-icon-area` zone above the title and an icon left of the title inside a `.notional-db-title-row`.
- **`renderPageHeaders()`** — Markdown page headers (`.inline-title`): places `.notional-icon-area` above the inline title.
- **`renderNavFolders()`** — Folder titles (`.nav-folder-title`): looks for a same-name `.base` or `.md` file inside the folder to resolve the icon.
- **`renderNavFiles()`** — File titles (`.nav-file-title`): resolves icon from store by `data-path`.
- **`renderTabIcons()`** (`renderTabIcons.ts`) — Tab headers (`leaf.tabHeaderInnerIconEl`, internal): replaces Obsidian's view icon with the note's chosen icon or favicon (path from `leaf.getViewState()`, so deferred tabs too). Default icons keep Obsidian's (`view.getIcon()` restored). Obsidian rewrites the element on header updates; the next render pass puts ours back.
- **`renderInlineLinks()`** — Internal links (`.internal-link`, `.cm-hmd-internal-link`): prepends a small icon inside the link element.

### Change detection / cache busting

Every rendered icon element gets a `data-notional-config-key` attribute (`"icon:color"` or `"none"`). Re-renders are skipped when the key matches. Invalidation clears these keys or removes elements outright.

## Observers

- **`observer`** (body, childList + attributes `data-path`): triggers `scheduleRender()` when nav items are inserted or `data-path` is set.
- **`navObserver`** (`.nav-files-container`, attributes `class`, set up on layout ready): detects folder expand/collapse (`is-collapsed` changes) → `invalidateAllNavIcons()` + `scheduleRender()`.

## Click handling

Two capture-phase listeners on `document`:

- **`onClickNav`**: any click in `.nav-files-container` (excluding own icons) → 50 ms delay → `invalidateAllNavIcons()` + `scheduleRender()` (handles folder toggles).
- **`onClick`**: click on `.notional-icon-header`, `.notional-icon-inline`, or `.notional-add-icon-btn` → opens `IconPicker`. On confirm/remove: updates store, invalidates the element, re-renders, dispatches `refreshIconsEffect` to all open CM editors.

## CodeMirror integration

`createInlineIconExtension(store, app)` is registered as an editor extension. After store mutations, `refreshIconsEffect` is dispatched to every open `MarkdownView` via `refreshCMEditors()`.

## Key invariants

- `scheduleRender()` is debounced via a single `requestAnimationFrame` flag (`rafPending`).
- `invalidateAllNavIcons()` removes all `.notional-icon-nav` elements — used before a full nav re-render.
- `fileForEl(el)` resolves the active `TFile` for a given DOM element by iterating workspace leaves.
- File explorer rows that carry an icon (`.tree-item-self` with a `.notional-icon-nav` child) are centered flex rows; the `notional-sole-link-line` CM line class (a line holding only a link) gets 3px of vertical padding.
- Touch devices get an extra CSS class on the "Add icon" button (`--touch-device` modifier).

## Website icons

`NotionalSettings.googleFavicons` (default `false`, *Website icons* under the feature's toggle): favicons of external links (`renderExternalLinks`, the editor's `ExternalLinkIconWidget`) and of notes with a URL property (`IconStore.getFaviconConfig`), fetched from `https://www.google.com/s2/favicons` (`render.ts`). Off, none is resolved and Google is never called. Changing it restarts the feature (`features.restart('icons')`).

## Turning off

`onunload` stops the observers, the pending nav click timer and a scheduled render (`destroyed`), closes the picker, then `clearIcons` removes `.notional-icon-area`, header, nav and link icons, unwraps `.notional-db-title-row` and the links' `.internal-link-text`, and `restoreTabIcons` puts Obsidian's view icon back in the tabs. The editor extension goes with the scoped plugin.

Icons rendered by other features (title mentions, board, timeline, search suggestions) follow the feature through `IconStore.shown`: set on load and unload, it notifies the `onChange` listeners so they re-render (`mentionKey` includes it).
