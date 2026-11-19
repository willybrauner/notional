import { CLASSES as COLOR_CLASSES } from '../../services/colors/constants';

// All class names — own (notional-*) and Obsidian's — no leading dot.
// Use `.${CLASSES.x}` for querySelector/closest. For compound selectors use SELECTORS.
export const CLASSES = {
	// Own: cells & markers
	selectCell: 'notional-select-cell',
	selectNoteProp: 'notional-select-note-property',
	// Own: value chip (owned by services/colors)
	chip: COLOR_CLASSES.chip,
	tag: COLOR_CLASSES.tag,
	// State modifiers
	isEditing: 'is-editing',
	// Obsidian-owned (Bases views)
	basesTd: 'bases-td',
	basesTr: 'bases-tr',
	basesRenderedValue: 'bases-rendered-value',
	basesCardsProperty: 'bases-cards-property',
	basesListProperty: 'bases-list-property',
	basesListItem: 'bases-list-item',
	// Obsidian-owned (Note panel)
	metadataProperty: 'metadata-property',
	metadataPropertyValue: 'metadata-property-value',
	multiSelectContainer: 'multi-select-container',
	// Obsidian-owned (misc)
	internalLink: 'internal-link',
	longtextColorButton: 'longtext-color-button',
	prompt: 'prompt',
	viewContent: 'view-content',
} as const;

// Compound selectors only — not expressible as `.${CLASSES.x}`
export const SELECTORS = {
	internalLinkWithHref: '.internal-link[data-href]',
	contentEditable: '[contenteditable]',
	metadataPropertyValueCe: '.metadata-property-value [contenteditable]',
} as const;

// data-* attribute names
export const ATTRS = {
	notionColor: 'data-notion-color',
	property: 'data-property',
	propertyType: 'data-property-type',
	propertyKey: 'data-property-key',
	sourcePath: 'data-source-path',
	href: 'data-href',
	propertyLongtextValue: 'data-property-longtext-value',
} as const;

// Property types excluded from chip treatment
export const EXCLUDED_PROPERTY_TYPES = new Set([
	'tags', 'number', 'date', 'datetime', 'checkbox', 'multitext', 'aliases',
]);

export const TIMINGS = {
	doubleClickMs: 350,
	doubleTapMs: 350,
	dropdownDelayMs: 250,
} as const;

