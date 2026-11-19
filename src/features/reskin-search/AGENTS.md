# ReskinSearchFeature

**Files**: `src/features/reskin-search/reskin-search.ts`, `styles/reskin-search.scss`

## Purpose
Reskins Obsidian's search/quick-switcher suggestion items for a cleaner look:
- Filename only in the main title (no full path)
- Full directory path displayed smaller in secondary color below
- 8px gap between suggestion items
- File or base icon before the filename

## Behavior

### Path splitting
When `.suggestion-title` contains a `/` (i.e., the full path is displayed), the feature:
1. Strips the directory prefix from the title, keeping only the filename
2. Puts the directory path into `.suggestion-note` (creates the element if absent)

When the title is already just a filename (Quick Switcher default), the title is left untouched and the existing `.suggestion-note` is styled as secondary.

### Icon detection
- File is `.base` → adds `notional-suggestion-item--base` class → base icon
- Otherwise → adds `notional-suggestion-item--file` class → file icon (markdown/generic)

Icons are rendered before `.suggestion-title` (flex row with 6px margin-right), styles in `styles/reskin-search.scss`.

## Implementation

### Key state
- `data-notional-search="1"` on processed items prevents double-processing

### Event flow
1. `MutationObserver` watches `document.body` for added nodes
2. When a `.suggestion-item` is added (or a container with `.suggestion-item` children), `processSuggestionItem` is called
3. Items outside a `.prompt` ancestor are not reskinned. Only the inline `[[` link completions (their container has the `.prompt-instructions` footer, "Type # to link heading") get the note icon before the title + folder lines (`addLinkIcon`): the file is `<folder><title>.md` (or `<folder><title>` for other files); headings, blocks, new or unresolved names get an empty slot so titles stay aligned. Same helper and look as the title mention "@" popover: `icons/prependSuggestionIcon.ts`, `.notional-suggestion-with-icon`
4. Extends `Feature`: the observer is disconnected in `onunload`. Items already reskinned are left as they are (lists are rebuilt on every keystroke, none is open while the settings tab turns the feature off)

### CSS hooks
- `.suggestion-item + .suggestion-item` — 8px top margin between consecutive items
- `.notional-suggestion-path` — 11px font-size, `--text-muted` color
- `.notional-suggestion-item--file .suggestion-title` — flex + file icon via `::before`
- `.notional-suggestion-item--base .suggestion-title` — flex + base icon via `::before`
