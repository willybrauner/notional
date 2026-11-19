# HideBaseExtensionFeature

**File**: `src/features/hide-base-extension/hide-base-extension.ts`

## Purpose
Strips the `.base` suffix from internal link text inside `.base` view content so links display cleanly (e.g. "tasks" instead of "tasks.base").

## Behavior
- Only active when a `.base` file is open
- Processes all `.internal-link` elements in `.view-content`
- Marks processed links with `data-notional-processed="1"` to avoid re-processing
- Adds class `internal-link--base` on processed links (for CSS targeting)
- Uses a `MutationObserver` to handle dynamically rendered rows
- Turned off: every processed link gets its `.base` back, its class and attribute removed (`restoreLinks.ts`)

## Implementation
`Feature` subclass. Listens to `file-open` and `layout-change`. On each `.base` file open, runs `processLinks()` once and starts observing for DOM mutations. `onunload` disconnects the observer and restores the links of every leaf, popout windows included (e2e: `plugin.e2e.ts`, `Tasks/Sprint/Sprint.base` listed by `Tasks.base`).
