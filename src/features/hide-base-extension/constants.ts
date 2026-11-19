// All class names (own and Obsidian's) — no leading dot. Use `.${CLASSES.x}` for selectors.
export const CLASSES = {
	// Own
	internalLinkBase: 'internal-link--base',
	// Obsidian-owned
	viewContent: 'view-content',
	internalLink: 'internal-link',
} as const;

export const FILE_EXT = {
	base: '.base',
} as const;

// Set on every link already looked at, so the observer doesn't process it twice
export const PROCESSED_ATTR = 'data-notional-processed';
