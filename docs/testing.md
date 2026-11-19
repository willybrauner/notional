# Testing

Three layers, from fastest to slowest. Run the first two before every commit that touches a feature; go through the manual checklist for the features a change touches.

| Layer | Command | What it covers |
|---|---|---|
| Unit | `pnpm test` | Pure logic in `test/unit/` (Vitest, `obsidian` replaced by `test/mocks/obsidian.ts`) |
| End-to-end | `pnpm build && pnpm test:e2e` | User actions in a real Obsidian, `test/e2e/specs/` |
| Manual | this page | What the e2e suite can't drive yet |

`pnpm verify` runs lint, unit, build and e2e quietly, and `pnpm vault:check` checks the build in your own vault (see `AGENTS.md`).

## End-to-end suite

`pnpm test:e2e` launches its own Obsidian, never yours:

- **Profile**: `test/e2e/.cache/userdata` (git-ignored). The first run starts on the installer's app version, waits for the auto-update, then relaunches. Later runs reuse the profile.
- **HOME**: `test/e2e/.cache/home`. Obsidian opens its CLI socket at `~/.obsidian-cli.sock` and removes it on quit: with the real HOME, every run cut the `obsidian` CLI off your app. `--use-mock-keychain` keeps the instance off the login keychain (no "keychain not found" prompt).
- **Vault**: a fresh copy of `test/e2e/vault/` in `test/e2e/.run/vault`, with the current `dist/` build installed. The fixture itself is never modified. Its `app.json` turns native menus off, so context menus are DOM elements a spec can click.
- **Driver**: `test/e2e/harness/ObsidianPage.ts` talks the DevTools protocol directly. Mouse and keyboard go through `Input.dispatch*`, so they are trusted events, like a real user's.
  - Playwright can't attach to Obsidian's Electron: `Browser.setDownloadBehavior` is not supported, and the `--inspect` fuse is disabled.
- **Isolation**: before each test the workspace is reduced to one empty tab. After each test, any uncaught exception or `console.error` fails it.
- **Failures**: a screenshot of the window is saved to `test/e2e/.run/failures/`.
- **Debugging**: `NOTIONAL_E2E_KEEP_OPEN=1 pnpm test:e2e` leaves the instance open (CDP on port 9333) to inspect it. Close it from Obsidian before the next run.

The test instance stays off your screen, so keep working: as soon as its window is up, `hideWindows` makes every window (popouts too) transparent and click-through, and removes the app from the Dock and Cmd+Tab. The windows keep rendering and the tests send events to them directly. Electron activates the app when the window opens: `rememberFrontmostApp` (macOS) gives the focus back to the app that was in front. `NOTIONAL_E2E_SHOW=1` keeps the windows visible to watch a run (implied by `NOTIONAL_E2E_KEEP_OPEN`).

### Writing a spec

- One file per area in `test/e2e/specs/*.e2e.ts`, starting with `const { page } = useObsidian();`.
- Act like a user:
  - `page().click/dblclick/hover/drag(selectorOrPoint)`
  - `page().type(text)`, `page().press(key, modifiers)`
- Read the state with `page().evaluate(() => …)` / `page().waitFor(() => …)`.
- Vault shortcuts live in `test/e2e/harness/workspace.ts`: `openFile`, `openBase`, `createFile`, `readFile`, `frontmatter`.
- Create the notes a test needs inside the test, so specs don't depend on each other.
- Popout windows go in `popout.e2e.ts`, run last (`vitest.e2e.config.ts`): opening one activates the test app (the spec gives the focus back), and with `NOTIONAL_E2E_SHOW` your pointer can disturb the specs after it. Close the popout in a `finally`.

## Coverage and manual checklist

**E2E** = automated in `test/e2e/specs`, **Unit** = logic in `test/unit`, **Manual** = check by hand after a change to the feature.

| Feature | E2E | Unit | Manual checks |
|---|---|---|---|
| Plugin lifecycle | Load, disable leaves no `notional-*` element, re-enable | `data.json` write queue, `DataStore` (fresh install, current shape) | Changing a setting keeps icons and colors |
| Feature toggles | Every feature runs; one off/on case per migrated feature (`breadcrumb-nav` also checks the saved state, `setFeature` helper); every feature off leaves no `notional-*` element | `FeatureManager`: order, defaults, `requires` cascade, `desktopOnly`, a throwing feature | |
| folder-view | Folder click opens its folder note; off, the click only folds the folder | | Chevron still folds the folder |
| breadcrumb-nav | Duplicate segment hidden, click opens folder note | | `.base` folder note opens from the breadcrumb |
| auto-rename-parent-folder | Renaming `X/X.md` renames `X`; off, the folder stays | | |
| note-template | Template applied to a new empty note; off, the note stays empty | Token replacement | `_template {{YYYY-MM-DD}}.md` names the note |
| folder-page | `/page <name>` creates the folder page and links it; off, no suggestion | | `/base`, `/todo` |
| auto-base-filter | New base gets its folder filter; off, it stays empty and the command is gone | Filter expression | Moved base gets its filter updated; "New" in a base creates the note in its folder |
| database-header | Base title shown; off, it is removed and not injected again; renaming the title renames the folder and its filter, even with auto-rename-parent-folder off | | Inline rename of the base (and its folder) |
| select-property | Pick a value from the chip dropdown; off, chips and markers removed | Seeds (options from bases) | Colors (palette), note properties panel, mobile bottom sheet, double-click inline edit |
| inline-note-rename | Double-click on a name cell renames the note; off, no input | | List view, Escape cancels |
| side-peek | Click in a base opens the panel, Escape closes; off, the panel closes and clicks open in place | | Resize and width kept, Open as full page, Enter on a selected table cell, still open after restart, "New" button |
| board | Columns per status, card drag changes the status; off, an open board shows the unknown view message, on again it comes back | Columns, order, card order | Column drag, hidden columns, card menu, multi-value (tags) copy |
| timeline | Bar drag moves start and end; hour zoom: end handle writes times and converts the types, timed bar moves by 15 min, click creates a one-hour slot; off, an open timeline shows the unknown view message, on again it comes back | Dates, range, manual order | Resize a bar end, zoom levels, sidebar resize, row reorder, undated notes |
| title-mention | `@` in the title links a note; off, titles and base links show the plain name | Title split | Chip opens the target, target rename follows, mention from a base rename input |
| icons | Header picker saves an icon; off, no icon or wrapper left, native tab icon back | | Icons in explorer, tabs, links (reading and live preview), emoji tab, favicon from a `url` property, remove |
| reskin-search | Quick switcher shows name + folder; off, native items | | Link suggestions (`[[`) |
| prettier | Cmd+S formats the note; off, Cmd+S saves it as it is | | Cursor and scroll kept |
| media-drop | Pasted GIF goes to `_assets/`; off, it is left alone | Filename slug | Drop and paste an image → `<note>/_assets/` + WebP; HEIC on macOS; daily note uses the attachment folder |
| tag-colors | Off, a colored tag loses its color; on again, it gets it back; in a popout too, with the right-click palette | | Right-click a tag → color; command "Set tag color" |
| table-clipboard | A copy at `<body>` reaches the focused table; off, it does not | | Cmd+C / Cmd+V on keyboard-selected table cells |
| hide-base-extension | Off restores ".base" in the links, on hides it again | | Links to `.base` files show no extension inside a base |
| base-own-context | Off restores the native controller method, on patches it again | | A base in a tab keeps `this` when another note becomes active |
