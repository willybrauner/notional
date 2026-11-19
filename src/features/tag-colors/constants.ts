// Tag elements colored by the decorator (data-notion-color), no leading dot
export const CLASSES = {
	tag: 'tag',
	pill: 'multi-select-pill',
	pillContent: 'multi-select-pill-content',
	hashtag: 'cm-hashtag',
	// Transient anchor of the palette opened from the command
	paletteAnchor: 'notional-tag-palette-anchor',
} as const;

// Pills of the tags property in the properties panel
export const TAG_PILL_SELECTOR = '.metadata-property[data-property-key="tags"] .multi-select-pill';
// Every element the decorator colors
export const DECORATED_SELECTOR = `a.tag, ${TAG_PILL_SELECTOR}`;
