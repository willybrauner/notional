# Architecture

How Notionalize is built, for contributors. The implementation notes of each module live next to its code, in its `AGENTS.md`; this page is the map.

## The plugin

`src/main.ts` only wires the parts together, in this order:

1. **`DataStore`** reads `data.json`.
2. **Services** are created: icons, colors, select picker. They are always loaded.
3. **`FeatureManager`** starts every enabled feature, in registry order.
4. The **settings tab** is added.

```
main.ts
 ├─ DataStore ──────────── data.json { version, settings: { …, features }, icons, recentIcons, selectColors }
 ├─ services
 │   ├─ IconStore          icon of each path
 │   ├─ ColorStore         value → color map, palette
 │   └─ SelectPicker       select dropdown / bottom sheet, seeds of the bases
 ├─ FeatureManager ─────── one Feature per registry entry, turned on and off while Obsidian runs
 └─ NotionalSettingTab     one toggle per feature, grouped by section
```

## Feature

A feature is one entry of the registry (`src/core/featureRegistry.ts`) and one class extending `Feature` (`src/core/Feature.ts`), in its own folder `src/features/<id>/`.

```ts
defineFeature({
	id: 'board',                       // folder, data.json key, body class, docs page
	name: 'Board view',                // settings tab
	description: 'A board view for bases: …',
	section: 'Bases',                  // settings tab group
	create: ctx => new BoardFeature(ctx),
	// defaults: defaultEnabled true, desktopOnly false, requires []
})
```

`Feature` is an Obsidian `Component`: everything it registers in `onload` is undone when it unloads. While it runs, `body.notional-feature-<id>` is set, so its styles only apply then. Use `this.onLayoutReady(cb)` instead of the workspace's: the callback is skipped when the feature was turned off before the layout got ready.

A feature receives a `FeatureContext`: `app`, the services, and live settings (`ctx.settings.get()`, read on use). It never imports another feature: what two features share goes into a service or `src/shared/`.

## The scoped plugin

Plugin APIs (`addCommand`, `registerEditorExtension`, `registerMarkdownCodeBlockProcessor`, `registerBasesView`, `registerEditorSuggest`…) end with `plugin.register(cleanup)`: on the real plugin, their cleanup would only run when the whole plugin unloads. So a feature's `this.plugin` is scoped (`createScopedPlugin.ts`): it is the real plugin with `register*`, `addChild` and `removeChild` routed to the feature. A command or a Bases view registered through it disappears when the feature is turned off.

What the scoped plugin can't clean up, the feature does in `onunload`: DOM it added, a monkey patch it restores, an open Bases view of its type (see `src/shared/entries/lifecycle/`).

## FeatureManager

`src/core/FeatureManager.ts` (`app.plugins.plugins.notionalize.features` at runtime):

- `loadAll()` starts the enabled features in registry order (the order of their listeners matters).
- `enable(id)` / `disable(id)` save the state and start or stop the feature. A feature runs when it is enabled, available on this platform (`desktopOnly` features skip mobile) and every feature of its `requires` runs. Disabling a feature stops its running dependents; enabling it starts them again.
- `restart(id)` reloads a running feature after a sub-setting it reads on load changed.
- A feature that throws while loading is stopped and logged; the others still load.

## DataStore

`src/core/DataStore.ts` is the only reader and writer of `data.json`:

```json
{
	"version": 5,
	"settings": { "convertImagesToWebp": true, "webpQuality": 80, "convertHeic": true, "googleFavicons": false, "features": { "prettier": true } },
	"icons": { "Projects/Projects.base": { "icon": "rocket", "color": "blue" } },
	"recentIcons": ["rocket"],
	"selectColors": { "in progress": "blue" }
}
```

- `settings.features` only holds the states the user changed: a missing id uses the feature's default.
- Every write is a queued read-modify-write (`src/utils/updatePluginData.ts`), so the settings, icon and color stores never drop each other's keys.
- `version` is `DATA_VERSION` (`src/core/constants.ts`), written on a fresh install. It starts at 5: earlier shapes only existed during development. A new shape means a migration from the stored version, run by `DataStore.load` and tested in `test/unit/core/`, and a bump of `DATA_VERSION`.

## Services and shared code

- **Services** (`src/services/`) are always loaded and never toggled: `icons/IconStore`, `colors/` (`ColorStore`, palette), `select-picker/`. Features depend on them, never on each other. Each has its `AGENTS.md`.
- **Shared code** (`src/shared/`) is used by several features but is never a feature: `bases-context/` (the only module patching Bases' `updateCurrentFile`), `entries/` (what the board and timeline views share), `constants.ts` (class names set by one feature and read by another).
- **Helpers** (`src/utils/`): file and folder renames, folder notes, platform checks, base content.

## Styles

`styles/main.scss` imports one file per feature. A rule on Obsidian's own elements goes under the `feature(<id>)` mixin (`styles/mixins.scss`), so it only applies while the feature runs, with the same specificity. The visual tweaks are features without behavior: each one only turns its stylesheet on (`styles/visual-tweaks/`).

## Adding a feature

1. Create `src/features/<id>/<id>.ts` with a class extending `Feature`. Register everything through `this.register*` and `this.plugin`, undo the rest in `onunload`.
2. Add its entry to `FEATURES` in `src/core/featureRegistry.ts`, at the place its load order needs. Set `defaultEnabled: false` for anything that changes notes unasked, `desktopOnly` for Node/Electron APIs, `requires` for a feature it can't run without.
3. Put shared logic in a service or `src/shared/`, not in another feature.
4. Styles in `styles/<id>.scss` under `feature(<id>)`, imported by `styles/main.scss`.
5. Write `src/features/<id>/AGENTS.md` (purpose, behavior, internals it relies on under **Limits**, what turning it off undoes) and `docs/features/<id>.md` (the user page `docsUrl` points to; a unit test checks it exists).
6. Add an e2e case that turns it off and on again (`test/e2e/specs/plugin.e2e.ts`), and its line in the checklist of `docs/testing.md`.
7. `pnpm verify`.
