# Bases keep their own context

A base open in a tab always filters on itself (`this`), whatever tab has the focus.

## How to use

- Natively, a base's `this` is the active note: focusing a note in a split makes a base filtered on `this.file.folder` show that note's folder. With this feature, a base in a tab of the main area (or a popout window) keeps itself as `this`.
- Bases in the sidebars keep Obsidian's behavior: `this` follows the active note, that is what they are for.

## Settings

*Settings → Notionalize → Bases*, off by default.

## Limits

- Relies on Obsidian internals (the base controller and its `updateCurrentFile`), which can change with an Obsidian release.

## What it writes

Nothing.

## Network

None.
