// Pointer move (px) before a press becomes a drag or a rectangle selection
export const DRAG_THRESHOLD = 4;

// Class names one feature sets and another one reads
export const SHARED_CLASSES = {
	// title-mention's "Open" button in a base cell, not a rename target for inline-note-rename
	mentionOpenButton: 'notional-mention-open',
	// inline-note-rename's input, given a mention suggest by title-mention
	renameInput: 'inline-rename-input',
} as const;

// Basename of a folder's note template (`_template.md`, `_template {{YYYY-MM-DD}}.md`), left out of the folder's base
export const TEMPLATE_BASENAME = '_template';
