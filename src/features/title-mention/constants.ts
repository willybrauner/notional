import { SHARED_CLASSES } from '../../shared/constants';

// Frontmatter property holding the notes mentioned in the title: ["[[Super page]]"]
export const PROPERTY = 'mentions';

// Written before the target name in the file name: "Review of @Super page"
export const MENTION_PREFIX = '@';

// Files a title can mention: notes, bases and canvases
export const TARGET_EXTENSIONS = ['md', 'base', 'canvas'];

// Max suggestions listed by the "@" popover
export const SUGGEST_LIMIT = 20;

// "@query" typed at the end of the title
export const MENTION_QUERY_REGEX = /@([^@]*)$/;

// All class names (own and Obsidian's) — no leading dot. Use `.${CLASSES.x}` for selectors.
export const CLASSES = {
	// Own
	mention: 'notional-mention',
	mentionIcon: 'notional-mention-icon',
	mentionArrow: 'notional-mention-arrow',
	mentionText: 'notional-mention-text',
	titleOverlay: 'notional-title-mention',
	titleHasMention: 'notional-title-has-mention',
	suggest: 'notional-mention-suggest',
	suggestionPath: 'notional-suggestion-path',
	openButton: SHARED_CLASSES.mentionOpenButton,
	openButtonIcon: 'notional-mention-open-icon',
	// Obsidian-owned
	inlineTitle: 'inline-title',
	// inline-note-rename's input over a base cell
	renameInput: SHARED_CLASSES.renameInput,
	basesView: 'bases-view',
	basesTableCell: 'bases-table-cell',
	internalLink: 'internal-link',
	internalLinkText: 'internal-link-text',
	suggestionContent: 'suggestion-content',
	suggestionTitle: 'suggestion-title',
} as const;

export const ATTRS = {
	href: 'data-href',
	mentionPath: 'data-notional-mention-path',
	mentionKey: 'data-notional-mention-key',
	openPath: 'data-notional-open-path',
} as const;
