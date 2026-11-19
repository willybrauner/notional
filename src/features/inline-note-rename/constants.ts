import { SHARED_CLASSES } from '../../shared/constants';

// All class names (own and Obsidian's) — no leading dot. Use `.${CLASSES.x}` for selectors.
export const CLASSES = {
	// Own
	input: SHARED_CLASSES.renameInput,
	// Element covered by the input (positioned) and name hidden under it
	inputContainer: 'inline-rename-container',
	hiddenName: 'inline-rename-hidden',
	// Title mention "Open" button, inside the cell but not a rename target
	mentionOpenButton: SHARED_CLASSES.mentionOpenButton,
	// Obsidian-owned
	internalLink: 'internal-link',
	basesTableCell: 'bases-table-cell',
	basesListItem: 'bases-list-item',
} as const;

export const ATTRS = {
	href: 'data-href',
} as const;
