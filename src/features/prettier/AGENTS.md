# PrettierFeature

**File**: `src/features/prettier/prettier.ts`

## Purpose
Formats the active markdown document with Prettier every time the user saves (Cmd+S).

## Behavior
1. User presses Cmd+S → hook intercepts `editor:save-file` command
2. Active markdown view is formatted via `prettier.format()` with the markdown plugin
3. Original save callback is always called (in a `finally` block) — file saves even if formatting fails
4. Cursor position and scroll offset are restored after `editor.setValue()`

## Prettier options
- `parser: 'markdown'`
- `proseWrap: 'preserve'` — paragraphs are never reflowed, only structural formatting is applied
- `printWidth: 80`

## Implementation
- Hooks `app.commands.commands['editor:save-file'].checkCallback` at init, replaces it with a wrapper
- `Feature` subclass: `this.register()` restores the original callback when the feature is turned off (e2e: `plugin.e2e.ts`)
- `AppWithCommands` interface types the internal `commands` property (not in Obsidian's public API)
- `prettier/plugins/markdown` is bundled by esbuild (~600 KB added to bundle)
