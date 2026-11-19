// Notion's palette, for values (select options, tags, board columns): styles/_notion-colors.scss
export type NotionColor = 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export const NOTION_COLORS: NotionColor[] = [
	'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red',
];

// Key of the value → color map in the plugin data.json
export const STORAGE_KEY = 'selectColors';

// All class names, no leading dot
export const CLASSES = {
	// Value chip
	chip: 'notional-value-chip',
	tag: 'notional-tag',
	// Palette
	palette: 'notional-color-palette-popup',
	swatch: 'notional-color-swatch',
	swatchNone: 'notional-color-swatch--none',
	isActive: 'is-active',
} as const;

export const ATTRS = {
	notionColor: 'data-notion-color',
} as const;

// Space between the anchor and the palette, and the palette and the viewport edges (px)
export const PALETTE_GAP = 6;
export const PALETTE_MARGIN = 8;

/** Class string for a value chip (with optional color). */
export function chipClass(color: string | null | undefined): string {
	return color
		? `${CLASSES.chip} ${CLASSES.tag} ${CLASSES.tag}--${color}`
		: `${CLASSES.chip} ${CLASSES.tag}`;
}

/** Class string for an inline tag (no chip prefix, used inside option rows). */
export function tagColorClass(color: string | null | undefined): string {
	return color ? `${CLASSES.tag} ${CLASSES.tag}--${color}` : CLASSES.tag;
}

/** Class string for a color swatch. */
export function swatchClass(color: string): string {
	return `${CLASSES.swatch} notional-swatch--${color}`;
}
