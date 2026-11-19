# FolderPageFeature

**File**: `src/features/folder-page/folder-page.ts`

## Purpose
Editor autocomplete commands to create folder pages and folder bases inline while writing.

## Triggers (typed in editor)
| Command | Creates |
|---|---|
| `/page Name` | `Name/Name.md` (markdown folder page) |
| `/base Name` | `Name/Name.base` (database with folder filter) |
| `/todo Name` | `Name/Name.base` (todo database with status property + First item.md) |

## Behavior
1. User types `/page My Task` → suggestion dropdown appears
2. On selection: creates the folder + file, inserts a markdown link at the cursor, opens the file
3. The current file is moved into its own folder if needed (`ensureInOwnFolder`)

## Todo template
`/todo` creates an additional `First item.md` with `status: "Not started"` frontmatter, and the `.base` file includes a `note.status` select property with options: Not started, Selected for work, In progress, In review, Waiting, Done (`DEFAULT_STATUSES` from select-property, also offered by the status picker in every base).

## Implementation
Uses Obsidian's `EditorSuggest` API. Each trigger keyword (`page`, `base`, `todo`) is a separate `FolderPageSuggest` instance sharing the same `FolderPageFeature` for the creation logic.

Extends `Feature`: the suggests go through the scoped `this.plugin.registerEditorSuggest`, so turning the feature off removes them from `workspace.editorSuggest`.
