# NoteTemplateFeature

**File**: `src/features/note-template/note-template.ts`

## Purpose
A markdown note created empty in a folder starts from the template of that folder.

## Behavior
- Template: the first `_template*.md` file directly in the note's folder (not in parent folders). None → nothing happens.
- Only empty notes (content blank once trimmed), never the template itself.
- Tokens (`resolveTokens.ts`): `{{date}}` (YYYY-MM-DD), `{{filename}}` (note name without `.md`), and any token made of `YYYY` / `MM` / `DD` (`{{DD/MM/YYYY}}`). Unknown tokens are kept as written.
- Note name: a plain `_template.md` keeps the note's name. `_template <pattern>.md` renames the note to the resolved pattern, tokens in braces (`_template {{YYYY-MM-DD}}.md` → `2026-10-15.md`), with ` 1`, ` 2`… on a name conflict.
- Editors already showing the note (e.g. created from a base "New" button, shown in the side peek) are scrolled back to the top: `vault.modify` moves their cursor to the end (`scrollOpenViewsToTop.ts`).

## Implementation
`Feature` subclass. The vault `create` listener is registered in `this.onLayoutReady`: `create` also fires for every existing file while the vault loads, which would fill existing empty notes. Turned off before the layout is ready, nothing is registered. Turning the feature off removes the listener (e2e: `plugin.e2e.ts`).

## Tests
- Unit: token replacement (`resolveTokens`)
- E2E: `folder-notes.e2e.ts` (template applied to `Notes/Meeting.md`, from `test/e2e/vault/Notes/_template.md`), `plugin.e2e.ts` (toggle)
