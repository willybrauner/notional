# TagColorsFeature

**Files**: `src/features/tag-colors/tag-colors.ts`, `styles/tag-colors.scss`

## Purpose
Gives tags a Notion color, from the map shared with the select chips and board columns (`services/colors/ColorStore`, keys lowercased, tags without `#`).

## Behavior
- Right-click (long press on mobile) on a tag → **Change color** opens the shared palette on it
- Command **Set tag color** → fuzzy list of the vault tags, then the palette anchored where the modal was (`notional-tag-palette-anchor`, removed on close)

## Implementation
- Every window, main and popouts: the ones open at load (`iterateAllLeaves`), then `window-open`; `window-close` drops a window's state. Per window (`attach`):
  - tag links (`a.tag`) and tag property pills get `data-notion-color` (`decorateTags.ts`): once, then on each batch of added nodes (`MutationObserver` on its `body`), and again on every color change
  - editor hashtags are re-rendered too often to decorate: a constructed stylesheet in its `adoptedStyleSheets` (no `<style>`) holds one rule per colored tag (`buildTagStylesheet.ts`). Built by that window's `CSSStyleSheet`: a stylesheet can't be adopted by another document
  - a capture `contextmenu` listener
- Node checks use `instanceOf()`, not `instanceof`: popout nodes come from another window's classes
- The palette opens in its anchor's window (`openColorPalette` uses `anchor.doc`)
- Extends `Feature`: `onunload` detaches every window (observer, stylesheet, `data-notion-color`), so tags get their native look back, and removes the palette anchor
