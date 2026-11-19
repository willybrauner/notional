# Select picker service

**Files**: `src/services/select-picker/` (`SelectPicker.ts`, `dropdown/`, `bottom-sheet/`, `seeds/`)

## Purpose
The select value picker (dropdown on desktop, bottom sheet on phones), always loaded: select chips, board and timeline open it, so none of them depends on another feature.

## Behavior
- `show(anchor, fmKey, sourcePath, context)` opens it on an element; `dismiss()` / `dismissDropdown()` close it. Picking a value writes the frontmatter (`writeFrontmatterValue.ts`). `openPicker` / `getOptions` are what board and timeline use.
- Owns the shared UI state (`ui`: open dropdown, bottom sheet, backdrop, anchor cell, timers).
- Seeds: `globalSeeds` merges the `select.options` of every `.base` (rebuilt when a base changes); `activeBaseSeeds` holds those of the active base. Options offered: the base's options (all the bases in the note properties panel), then `DEFAULT_OPTIONS` of the property (`constants.ts`: the common statuses for `status`), then the values already used (folder of the base, or vault).
- Tracks the active file alone: `onActiveFileChange((file, seedsRead) => …)` is called right away on a new active file, then with `seedsRead` once the seeds of an active base are read (again after it is modified). A read finishing after another file opened is dropped.
- Phone or not: `src/utils/isMobile.ts` (touch screen narrower than 768px).
- Colors come from the colors service (`ColorStore`, `palette/`).

## Users
select-property, board, timeline.
