// All class names (Obsidian's) — no leading dot. Use `.${CLASSES.x}` for selectors.
export const CLASSES = {
	// Obsidian-owned
	tableContainer: 'bases-table-container',
} as const;

// Clipboard events handled natively by the base table
export const CLIPBOARD_EVENTS = ['copy', 'paste'] as const;
