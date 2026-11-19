# BreadcrumbNavFeature

**File**: `src/features/breadcrumb-nav/breadcrumb-nav.ts`

## Purpose
Clicking a breadcrumb segment in the view header opens the index file of that folder (same name, `.md` or `.base`) instead of doing nothing.

## Behavior
- Click on `.view-header-breadcrumb` → opens `segment/segment.md` or `segment/segment.base`
- If no index file → default Obsidian behavior
- `.md` takes priority over `.base`
- Folder note (`X/X.md` or `X/X.base`): the last segment `X` (same as the title) is hidden with its separator

## Implementation
Matches the clicked breadcrumb's index within `.view-header-title-parent` to the corresponding path segment of the current file. Constructs both possible index file paths and opens whichever exists.

Duplicate segment (`hideDuplicateBreadcrumb.ts`): on `file-open`, `layout-change`, `rename` and layout ready, after a `setTimeout` (Obsidian rebuilds the header first), every `FileView` whose parent folder has the file's basename gets `.notional-breadcrumb-duplicate` (`display: none`) on its last breadcrumb and separator. Hidden, not removed: the click handler's index matching still works.

## Note
Works the same as FolderViewFeature but for the breadcrumb bar rather than the sidebar.

## Lifecycle
`Feature` subclass: the click listener and workspace events are registered on the feature. `onunload` clears the pending hide pass and removes every `.notional-breadcrumb-duplicate`, so turning the feature off shows the segments again (e2e: `plugin.e2e.ts`, the feature toggle case).
