// All class names (own and Obsidian's) — no leading dot. Use `.${CLASSES.x}` for selectors.
export const CLASSES = {
	// Own
	suggestionItem: 'notional-suggestion-item',
	suggestionPath: 'notional-suggestion-path',
	// Obsidian-owned
	obsidianSuggestionItem: 'suggestion-item',
	obsidianSuggestionTitle: 'suggestion-title',
	obsidianSuggestionNote: 'suggestion-note',
	prompt: 'prompt',
	suggestionContainer: 'suggestion-container',
	// Footer of the "[[" link suggest ("Type # to link heading")
	promptInstructions: 'prompt-instructions',
} as const;
