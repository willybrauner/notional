# Visual tweaks

**Files**: `src/features/visual-tweaks/visual-tweaks.ts`, `styles/visual-tweaks/<group>.scss`, registry entries `tweak-<group>` (section *Visual tweaks*).

- The former always-on theme, split in groups that are each a feature without behavior: `VisualTweakFeature` only gets the body class `notional-feature-tweak-<group>` from `Feature`, which turns its stylesheet on.
- All off by default.
- Groups: `accent` (grey accent, the "Accent color" setting still wins), `dark-background` (near black surfaces in dark mode), `typography` (heading sizes, links, note margins, code blocks), `tabs` (raised active tab), `properties` (Properties panel), `bases-layout` (bases on the note margins, tables, lists, cards). `board.scss` and `timeline.scss` compensate the bases layout padding under the same class.
- Every rule keeps the specificity it had in the old theme (`:where(...)`): the cascade against Obsidian's `.theme-*` rules depends on it.
- e2e: `test/e2e/specs/visual-tweaks.e2e.ts` turns each tweak off alone and checks a computed value of its own (and none of the others) changes.

## Limits

- Rules target Obsidian's own classes (`.bases-*`, `.metadata-*`, `.workspace-tab-header-*`, `.cm-header-*`), which can change with Obsidian releases.
