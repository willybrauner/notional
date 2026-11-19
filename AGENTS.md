# Notionalize

Obsidian community plugin that brings Notion-like behaviors to Obsidian (folder notes, select chips, icons, Bases views…). TypeScript bundled by esbuild into `dist/main.js`, SCSS compiled into `dist/styles.css`.

## Commands

Package manager is **pnpm** (see `package.json` scripts): `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test` (unit), `pnpm test:e2e` (drives an isolated Obsidian; build first).

Before committing a feature change: `pnpm verify` (lint, unit, build, e2e in a row: one line per layer, the output of the failing one only, exit code 1 on failure; `--no-e2e` to skip e2e), then `pnpm vault:check` and the feature's manual checks. All three test layers and the per-feature checklist are in `docs/testing.md`. Add an e2e spec when a change adds a user action.

`scripts/build.ts` type-checks, bundles, compiles `styles/main.scss`, then copies `main.js`, `styles.css` and `manifest.json` into `NOTIONAL_PLUGIN_DIR` (env var, or the same key in the uncommitted `.env.local`). Unset → no copy.

## Layout

- `src/main.ts`: plugin lifecycle only: `DataStore` → services → `FeatureManager` → settings tab.
- `src/core/`: feature infrastructure.
  - `featureRegistry.ts`: one `defineFeature({ id, name, description, section, create… })` entry per feature, in load order. A new feature is added here.
  - `Feature.ts`: base class of a feature (an Obsidian `Component`). Its `this.plugin` is scoped: plugin APIs (`addCommand`, `registerEditorExtension`, `registerBasesView`…) register their cleanup on the feature, so turning it off leaves nothing. `body.notional-feature-<id>` is set while it runs. Use its `this.onLayoutReady(cb)`, not the workspace's: the callback is skipped if the feature was turned off before the layout got ready.
  - `FeatureManager.ts`: `enable(id)` / `disable(id)` while Obsidian runs (`app.plugins.plugins.notionalize.features`), with `requires` and `desktopOnly`.
- `src/features/<feature>/`: one folder per feature, entry `<feature>.ts`, implementation notes in its `AGENTS.md`. Read that `AGENTS.md` before changing a feature, and update it when behavior changes, with its user page `docs/features/<id>.md` (the registry's `docsUrl`, checked by `test/unit/core/docs.test.ts`).
- `src/services/`: always loaded, never toggled, so features depend on them and not on each other. Each has its `AGENTS.md`, like `src/shared/bases-context/` and `src/shared/entries/`. `colors/` (ColorStore, palette), `icons/IconStore.ts` (icon of each path), `select-picker/` (select dropdown/bottom sheet, seeds of all the bases, the active file and its base seeds).
- `src/shared/`: code shared by several features, never a feature itself. `constants.ts` (`DRAG_THRESHOLD`, `TEMPLATE_BASENAME`, `SHARED_CLASSES` set by one feature and read by another), `bases-context/` (the only module patching Bases' internal `updateCurrentFile`: base-own-context's prototype patch, side-peek's freeze), `entries/` for the Bases views listing notes (board, timeline): entry menus, selection, rename, and `render/` (entry title, property chips). Register a Bases view type with its `lifecycle/registerFeatureBasesView`: turning the feature off closes the views already open.
- `src/settings/`: the settings tab. `NotionalSettings.ts` (shape and `DEFAULT_SETTINGS`), `NotionalSettingTab.ts`, one file per registry section in `sections/` (its sub-settings renderers by feature id), `renderFeature.ts` (toggle, description, Learn more, Desktop only badge, dependents warning). A feature's sub-settings (`sub-settings/`) only show while it is on; one read on load calls `features.restart(id)` when it changes.
- `src/core/DataStore.ts`: the only reader and writer of `data.json`, shaped `{ version, settings: { …, features }, icons, recentIcons, selectColors }`. A fresh install gets `version: DATA_VERSION` (5, earlier shapes only existed during development). Writes go through `src/utils/updatePluginData.ts`, which serializes read-modify-writes so settings, colors and icons keep each other's keys. A new shape means a migration from the stored version in `DataStore.load`, with its unit test, and a bump of `DATA_VERSION`.
- `src/utils/`: helpers shared across features: file and folder renames, `findFolderNote` (`X/X.md`, else `X/X.base`), `isMobile` (phone-sized touch screen), base content.
- `styles/<feature>.scss`, imported by `styles/main.scss`. A rule on a native Obsidian element goes under its feature with the `feature(<id>)` mixin (`styles/mixins.scss`: `:where(body.notional-feature-<id>) &`, same specificity as without it), so nothing applies while the feature is off.
- `styles/visual-tweaks/<group>.scss`: opinionated adjustments of the native UI (accent, dark background, typography, tabs, properties, bases layout). Each is a registry entry of section *Visual tweaks* (`src/features/visual-tweaks/`, a feature with no behavior), off by default, its rules under `:where(body.notional-feature-tweak-<group>)`. Keep the `:where`: the specificity decides the cascade against Obsidian's own rules. `.theme-*` and `.show-indentation-guide` sit on body itself: write `.theme-dark:where(.notional-feature-tweak-<group>) …`, not nested under the wrapper.
- `docs/`: `features/<id>.md` (user page of each feature: use, settings, limits, what it writes, network), `architecture.md` (for contributors), `testing.md`, `images/` (one image per feature, still or animated WebP, made on a demo vault; don't edit them by hand).
- `styles.css` is compiled without a BOM (`--no-charset`): Obsidian injects it as text, and a BOM made the first selector match nothing.

## Code conventions

- One exported function per file, grouped in a folder named by responsibility (`seeds/parseSeedsFromFile.ts`); constants of a feature grouped in its single `constants.ts`.
- Explicit imports from each file, no barrel files. A thin feature class holds state and passes dependencies as params.
- A short intent comment per function.
- Shared UI mechanics (pickers, palettes, menus) live in one shared module reused by every feature. UI matches Notion closely.
- Prefer native APIs (`<dialog>`, Popover API, Obsidian `Menu`, `setIcon`).
- Register every listener, observer, interval and monkey patch with `register*` / `plugin.register(() => …)` so unloading leaves nothing behind.
- UI strings in English, sentence case (enforced by `eslint-plugin-obsidianmd`).
- Popout windows (enforced by `eslint-plugin-obsidianmd`, the rules of Obsidian's review bot): `activeDocument`, `window.setTimeout` / `window.requestAnimationFrame`, `createDiv()` / `createEl()`, `node.instanceOf(X)` and `evt.targetNode` rather than `instanceof`. Feature body classes go on the main window's body: Obsidian mirrors its classes into popouts. No regex lookbehind (iOS before 16.4).
- Node/Electron APIs only behind `Platform.isDesktopApp` and a lazy `require()`; the plugin also runs on mobile (`isDesktopOnly: false`).
- Several features rely on Obsidian internals (Bases controllers, leaf parents, hover popovers). Each feature's `AGENTS.md` lists the internals it uses under **Limits**.

## Verifying a change in Obsidian

Use the `obsidian` CLI (the app must be running):

- `pnpm vault:check` after `pnpm build`: backs up `data.json` (`.cache/vault-backups/`), reloads the plugin, and prints one line. It fails on errors logged by the reload, on a feature that doesn't run, or on icons, recent icons or colors lost.
- By hand: `pnpm build`, then `obsidian plugin:reload id=notionalize`.
- Check with `obsidian dev:errors`, `dev:console`, `dev:screenshot path=<abs.png>` and `obsidian eval code="''+<expr>"`. Only string results print, hence the `''+` prefix.

## Releases

Bump with `pnpm version <x.y.z>` (`version-bump.mjs` syncs `manifest.json` and `versions.json`). The GitHub release tag equals the version, without a `v` prefix. Pushing the tag runs `.github/workflows/release.yml`: it checks the tag against `manifest.json`, builds, and drafts the release with `main.js`, `manifest.json` and `styles.css`; publish the draft by hand. `.github/workflows/ci.yml` runs lint, unit tests and build on each push to `main` and each pull request (e2e stays local).
