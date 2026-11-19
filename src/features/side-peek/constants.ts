import type { Modifier } from 'obsidian';

// All class names (own and Obsidian's) — no leading dot. Use `.${CLASSES.x}` for selectors.
export const CLASSES = {
	// Own
	panel: 'notional-side-peek',
	overlay: 'notional-side-peek-overlay',
	hiddenNative: 'notional-side-peek-hidden-native',
	resizeHandle: 'notional-side-peek-resize-handle',
	headerButtons: 'notional-side-peek-header-buttons',
	isResizing: 'notional-side-peek-is-resizing',
	isClosing: 'is-closing',
	isRestored: 'is-restored',
	// Obsidian-owned
	basesView: 'bases-view',
	tableContainer: 'bases-table-container',
	tableActiveCell: 'bases-table-active-cell',
	tableCell: 'bases-td',
	internalLink: 'internal-link',
	hoverPopover: 'hover-popover',
	newItemPopover: 'bases-new-item-popover',
	newItemMenu: 'bases-toolbar-new-item-menu',
	hasActiveMenu: 'has-active-menu',
	viewHeaderLeft: 'view-header-left',
	clickableIcon: 'clickable-icon',
} as const;

export const ATTRS = {
	href: 'data-href',
} as const;

// Top left of the panel, like Notion
export const HEADER_BUTTONS = {
	close: { icon: 'chevrons-right', title: 'Close (Escape)' },
	expand: { icon: 'maximize-2', title: 'Open as full page (Mod+Enter)' },
} as const;

export const HOTKEYS: Record<'close' | 'expand', { modifiers: Modifier[]; key: string }> = {
	close: { modifiers: [], key: 'Escape' },
	expand: { modifiers: ['Mod'], key: 'Enter' },
};

// Panel width chosen by drag, shared by every side peek (vault localStorage)
export const WIDTH = {
	storageKey: 'notional-side-peek-width',
	cssVar: '--notional-side-peek-width',
} as const;

// Id of the leaf of the open side peek (vault localStorage), cleared on close:
// still set at startup means the peek was open when Obsidian quit or reloaded
export const OPEN_LEAF_STORAGE_KEY = 'notional-side-peek-leaf';
