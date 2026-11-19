export const VIEW_ID = 'notional-board';
export const VIEW_NAME = 'Board';
export const VIEW_ICON = 'square-kanban';

// Key of the column holding entries without a value
export const NONE_KEY = '';

// Keys stored in the view config of the .base file. Shared settings use the
// native kanban keys, so switching the view type keeps them. The board's own
// keys are prefixed so a future native key can't collide with them.
export const OPTION_KEYS = {
	columnProperty: 'notionalColumnProperty',
	columnOrder: 'notionalColumnOrder',
	// { <column key>: [note paths in manual order] }
	cardOrder: 'notionalCardOrder',
	// Column values not shown (the "no value" column is stored as its label, e.g. "No tags")
	hiddenColumns: 'notionalHiddenColumns',
	// Shared with the native kanban
	columnWidth: 'columnWidth',
	imageProperty: 'image',
	imageFit: 'imageFit',
	imageAspectRatio: 'imageAspectRatio',
} as const;

// Unprefixed keys written by earlier versions → current key (migrated on load)
export const LEGACY_OPTION_KEYS: Record<string, string> = {
	columnProperty: OPTION_KEYS.columnProperty,
	columnOrder: OPTION_KEYS.columnOrder,
	cardOrder: OPTION_KEYS.cardOrder,
	hiddenColumns: OPTION_KEYS.hiddenColumns,
};

export type ImageFit = 'cover' | 'contain';

export const DEFAULT_COLUMN_WIDTH = 260;
export const MIN_COLUMN_WIDTH = 200;
export const MAX_COLUMN_WIDTH = 480;
export const DEFAULT_IMAGE_ASPECT_RATIO = 0.5;

// Column width, set on the root: columns and cards follow it
export const COLUMN_WIDTH_VAR = '--notional-board-column-width';
export const IMAGE_RATIO_VAR = '--notional-board-image-ratio';

export const CLASSES = {
	host: 'notional-board-host',
	root: 'notional-board',
	canvas: 'notional-board-canvas',
	column: 'notional-board-column',
	columnHeader: 'notional-board-column-header',
	columnChip: 'notional-board-column-chip',
	// Tag look (rounded pill, text in the color), owned by styles/tag-colors.scss
	tagChip: 'notional-tag-chip',
	columnCount: 'notional-board-column-count',
	columnActions: 'notional-board-column-actions',
	columnAction: 'notional-board-column-action',
	columnCards: 'notional-board-column-cards',
	newCard: 'notional-board-new-card',
	card: 'notional-board-card',
	cardCover: 'notional-board-card-cover',
	cardBody: 'notional-board-card-body',
	cardTitle: 'notional-board-card-title',
	cardProps: 'notional-board-card-props',
	cardProp: 'notional-board-card-prop',
	cardPropGroup: 'notional-board-card-prop-group',
	editableProp: 'notional-board-prop-editable',
	ghost: 'notional-board-ghost',
	dropIndicator: 'notional-board-drop-indicator',
	dropLine: 'notional-board-drop-line',
	hidden: 'notional-board-hidden',
	hiddenTitle: 'notional-board-hidden-title',
	hiddenItem: 'notional-board-hidden-item',
	empty: 'notional-board-empty',
	// State modifiers
	isNone: 'is-none',
	isDragging: 'is-dragging',
	isCopy: 'is-copy',
	isSelected: 'is-selected',
	isDropTarget: 'is-drop-target',
	isReadonly: 'is-readonly',
	isContain: 'is-contain',
	bodyDragging: 'notional-board-dragging',
} as const;

// Touch: press duration before a card or column can be dragged (shorter presses scroll)
export const LONG_PRESS_MS = 350;
