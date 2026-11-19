# TitleMentionFeature

**Files**: `src/features/title-mention/`, `styles/title-mention.scss`

## Purpose
Notion-like mention of a note in a note title: typing `@super` in the inline title and picking **Super page** turns the title into `Review of [chip Super page]`. The chip (target icon + ↗ arrow, underlined name) opens the mentioned note; the rest of the title opens/edits the note itself.

## Storage
A file name can't hold `[[ ]]`, so the title stays plain text and the link lives in the frontmatter:
- File: `Review of @Super page.md` (`mentionToken.ts`: `@` + target name)
- Frontmatter: `mentions: ["[[Super page]]"]` (`PROPERTY`), written by the plugin and hidden in the Properties panel (CSS)

Being a real link, it shows in backlinks/graph and Obsidian updates it when the target is renamed. A chip (without the `@`) is rendered where `@target` is found in the title (`splitTitle.ts`, left to right).

**Why the `@` in the file name**: a title made of the mention alone would otherwise give the host the target's exact name. Two notes with the same name make every short link `[[Super page]]` ambiguous, and Obsidian then rewrites all of them across the vault with the full path ("N links updated").

The migration to this format (one note, done by hand) showed the other side of it: while both notes shared the name, the short links of other notes resolved to the alias (shorter path), so renaming the alias to `@…` carried those links along (restored by hand). The `@` prevents the collision in the first place.

## Behavior
- **Create** (`MentionSuggest.ts`): an `AbstractInputSuggest` on each `.inline-title` (contenteditable). `@query` at the end of the title → "Link to page" popover (fuzzy on file names, recent files when empty). Targets: notes, bases and canvases (`TARGET_EXTENSIONS`; a base like `Roadmap.base` is linked as `[[Roadmap.base]]`). Picking a note replaces `@query` by `@name`, renames the note (`applyMention`: the inline title doesn't save a value set by code) then adds the link (`addMention.ts`). **Rename first**: writing the frontmatter right before a rename left the open editor with the old content.
- **Create from a base** (`attachRenameInputSuggest`): the rename input of a note (`mountRenameInput`, `.inline-rename-input`: double-click on a table cell, **Rename** in the right-click menu of a board card or timeline entry) gets the same popover on `focusin`, its note read from the input's `data-notional-path`. Picking keeps the input focused (the suggestion `mousedown` is prevented); the input saves (renames) on Enter/blur as usual. The picked targets wait in `pending` (by note path, with the input's latest value) and are linked on the `vault.rename` that gives the note that title: a cancelled rename (Escape) writes nothing. inline-note-rename ignores keys already handled by the popover (`defaultPrevented`: Enter/Escape while it is open).
- **Display** (`renderTitleSegments.ts` → `createMentionChip.ts`). The chip is `display: inline` (not inline-flex): a long name wraps with the title, and is cut by the ellipsis of one-line cells, instead of moving as a single block:
  - Inline title (`renderInlineTitles.ts`): while not focused, the title is hidden (`notional-title-has-mention`) behind an overlay `div.notional-title-mention` kept right after it. Obsidian moves the title element when switching source/live preview/reading, so the overlay is tied to its title in `titleOverlays.ts` (WeakMaps, not siblings), moved back after it, and overlays left behind are removed. Clicking its text shows the editable title with the caret at the end (`focusInlineTitle.ts`): editing is plain text. `focusout` re-renders the overlay.
  - Bases table/list/cards (`decorateBaseLinks.ts`): internal links whose text is the note name (or already decorated: chips drop the `@`, so the text no longer matches) get their text replaced by the segments (inside `.internal-link-text` when the icons feature wrapped it). Cache key `data-notional-mention-key` (`mentionKey.ts`: name + targets + their icons).
  - Board cards and timeline (sidebar + bars): through `renderEntryTitle` (takes `app`).
- **Click** (capture on `document`): a chip → `openLinkText(target)` (in a base, the side peek takes it); `stopPropagation` keeps the card/row handlers from opening the host. Timeline bars open on `pointerup`, so their chips are visual only (`pointer-events: none`). The chip icon uses the `mention` variant: no icon picker.
- **"Open" button** (`createOpenButton.ts`): a title made of the mention alone is a chip only, so every click opens the mentioned note. Its table name cell gets a Notion "Open" button (shown on row hover, absolute on the right of the cell) opening the note itself (side peek in a base). Ignored by the inline rename double-click.
- **Enter in a base** (`getSoleMentionTarget.ts`, used by side-peek): when the title is the mention alone (`[chip 2020-03 - RDV CIC]`), Enter on the keyboard-selected note opens the mentioned note instead. Clicks are unchanged, and so is a title with other text.
- **Sync** (`vault.rename`):
  - `followTargetRename.ts`: a mentioned note renamed → the notes mentioning it are renamed (`@old name` replaced by `@new name`).
  - `pruneMentions.ts`: a host whose title no longer contains `@target` loses that mention. Unresolved links are kept (link update race, deleted target → plain text).
- **Startup** (`pruneAllMentions.ts`, on layout ready): drops the mentions missing from their title (titles edited while the plugin was off). A title that still has an `@name` matching none of its mentions is skipped: the target was likely renamed while the plugin was off, and dropping its mention lost it. Never renames notes: renaming a note moves every link resolving to it, which went wrong once (see below).

## Implementation
- Renders debounced on a 30 ms timeout (not rAF: Obsidian is often in the background) from `file-open`, `layout-change`, `metadataCache.changed`, `vault.rename`, `focusout` on an inline title, and a `MutationObserver` on `document.body` filtered to `.bases-view` / `.inline-title`.
- `AbstractInputSuggest` can't detach from its element: suggests are kept in a map, `disposed` (returns no suggestion) when their title leaves the DOM or on unload.
- Extends `Feature`. Turning it off stops the observer and a pending render, then `clearMentions.ts` removes the overlays, the hiding class and the "Open" buttons, and gives the base links their plain name back (chips and `data-notional-mention-key` removed, an icon of the icons feature kept).
- Chips show the target icon only while the icons feature runs (`IconStore.shown`, part of `mentionKey`); its changes re-render.

## Limits
- Mentions can't be created from the file explorer.
- The chip only renders when `@target` is literally in the title (renaming the host by hand to something else drops the mention).
- Explorer, tabs and breadcrumb show the plain file name.
