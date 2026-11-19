// All class names of the picker, no leading dot
export const CLASSES = {
	// Dropdown (desktop)
	dropdown: 'notional-select-dropdown',
	input: 'notional-select-input',
	list: 'notional-select-list',
	option: 'notional-select-option',
	// Bottom sheet (mobile)
	backdrop: 'notional-modal-backdrop',
	bottomSheet: 'notional-select-bottom-sheet',
	dragHandle: 'notional-bottom-sheet-handle',
	pill: 'notional-bottom-sheet-pill',
	noTransition: 'no-transition',
	isExpanded: 'is-expanded',
	// Color button of an option row
	colorBtn: 'notional-color-btn',
	// Option rows
	optionMainRow: 'notional-option-main-row',
	optionRight: 'notional-option-right',
	check: 'notional-check',
	inlineSwatchRow: 'notional-inline-swatch-row',
	// State modifiers
	isSelected: 'is-selected',
	isClear: 'is-clear',
	isCreate: 'is-create',
	isVisible: 'is-visible',
} as const;

// Compound selectors only, not expressible as `.${CLASSES.x}`
export const SELECTORS = {
	metadataPropertyValueCe: '.metadata-property-value [contenteditable]',
} as const;

// data-* attribute names
export const ATTRS = {
	// Set by Obsidian on a Bases value, and by the chips of board and timeline
	propertyLongtextValue: 'data-property-longtext-value',
} as const;

// Common statuses (also the select.options of a /todo base)
export const DEFAULT_STATUSES = ['Not started', 'Selected for work', 'In progress', 'In review', 'Waiting', 'Done'] as const;

// Options always offered for a property (normalized key), in every base.
// Values created in a base are added after them.
export const DEFAULT_OPTIONS: Record<string, readonly string[]> = {
	status: DEFAULT_STATUSES,
};

/** Class string for a color-swatch button. */
export function colorBtnClass(color: string | null | undefined): string {
	return color
		? `${CLASSES.colorBtn} notional-swatch--${color}`
		: CLASSES.colorBtn;
}
