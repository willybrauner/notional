# Format on save

Each time you save a note (Cmd/Ctrl+S), it is formatted with [Prettier](https://prettier.io).

![Format on save](../images/prettier.webp)

## How to use

- Press Cmd/Ctrl+S: list markers, headings, blank lines, rules and trailing spaces are normalized, then the note is saved.
- Paragraphs are never rewrapped (`proseWrap: preserve`). The cursor and the scroll position stay where they were.

## Settings

*Settings → Notionalize → Editor*, off by default.

## Limits

- Only the save command formats the note: Obsidian's automatic saves don't.
- When formatting fails, the note is saved as it is.

## What it writes

The formatted note.

## Network

None.
