# Icons service

**File**: `src/services/icons/IconStore.ts`

## Purpose
The icon of each path, always loaded: the icons feature renders and edits them, title mentions, board, timeline and search suggestions show them. None of them depends on the icons feature.

## Behavior
- Persisted under `icons` (`{ [path]: { icon, color } }`) and `recentIcons` (24 names at most) in `data.json`, through the `DataStore`.
- Follows vault renames and deletions itself (`onload`), whether the icons feature runs or not.
- `resolve(path)`: the icon set on the path, else a website icon (`getFaviconConfig`), else the default icon of its extension (`file`, `base`).
- Website icons only while `settings.googleFavicons` is on: a `url`/`URL`/`website`/`Website` property, else the first `https://` value of the frontmatter, gives `favicon:<hostname>`. The image itself is fetched by the icons feature (`render.ts`, Google's favicon service).
- `shown`: set by the icons feature on load and unload (`setShown`). Features rendering note icons skip them while it is false, and re-render on `onChange` (also called on every set, remove and rename).
- Icon names: a Lucide id (`setIcon`), one of the bundled SVGs (`src/features/icons/constants.ts`, never read it whole: 537 KB), or `emoji:<char>`.

## Users
icons, title-mention, board, timeline, reskin-search (link suggestions).
