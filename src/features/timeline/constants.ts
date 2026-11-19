export const VIEW_ID = 'notional-timeline';
export const VIEW_NAME = 'Timeline';
export const VIEW_ICON = 'gantt-chart';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Keys stored in the view config of the .base file.
export const OPTION_KEYS = {
	startProperty: 'startProperty',
	endProperty: 'endProperty',
	showSidebar: 'showSidebar',
	zoom: 'zoom',
	sidebarCollapsed: 'sidebarCollapsed',
	sidebarWidth: 'sidebarWidth',
} as const;

export type Zoom = 'hour' | 'day' | 'week' | 'month' | 'all';

// Hour zoom: width of one hour (px), and the snap step of timed bars (minutes)
export const HOUR_WIDTH = 56;
export const MINUTE_STEP = 15;
// Length of a timed item without an end, and of one created in the hour zoom (minutes)
export const DEFAULT_TIMED_MINUTES = 60;
// Hour width from which hours are labelled and timed items placed at their time
export const HOUR_SCALE_MIN_WIDTH = 40;

export const ZOOMS: { id: Zoom; label: string; dayWidth: number }[] = [
	{ id: 'hour', label: 'Hour', dayWidth: 24 * HOUR_WIDTH },
	{ id: 'day', label: 'Day', dayWidth: 160 },
	{ id: 'week', label: 'Week', dayWidth: 48 },
	{ id: 'month', label: 'Month', dayWidth: 24 },
	// dayWidth is computed for "all" (fit the whole range in the viewport)
	{ id: 'all', label: 'All', dayWidth: 0 },
];

export const DEFAULT_ZOOM: Zoom = 'month';

// Layout (px)
export const ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 48;
export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_WIDTH_MOBILE = 140;
// Bounds of the list column resized by dragging its right edge (desktop width)
export const SIDEBAR_MIN_WIDTH = 160;
// Timeline width always left visible next to the list
export const SIDEBAR_MIN_TRACK = 200;
// Container width under which the compact sidebar is used
export const MOBILE_WIDTH = 600;
export const MIN_ALL_DAY_WIDTH = 2;

// Range padding around items, in days, per zoom
export const RANGE_PADDING_DAYS: Record<Zoom, number> = {
	hour: 3,
	day: 14,
	week: 45,
	month: 90,
	all: 7,
};

// Extend the range when scrolled closer than this to an edge (px)
export const EDGE_EXTEND_THRESHOLD = 200;
// Upper bound of the rendered range (~10 years)
export const MAX_RANGE_DAYS = 3660;

// Current list column width, set on the root: cells, header corner and grid follow it
export const SIDEBAR_CSS_VAR = '--notional-timeline-sidebar';

// Manual order: a note property, applied only when the user adds it to the view sort
export const ORDER_PROPERTY = 'timeline-order';
export const ORDER_PROPERTY_ID = 'note.timeline-order';

// Date formats written back to the frontmatter
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm';

export const CLASSES = {
	root: 'notional-timeline',
	host: 'notional-timeline-host',
	toolbar: 'notional-timeline-toolbar',
	toolbarSpacer: 'notional-timeline-toolbar-spacer',
	toolbarBtn: 'notional-timeline-toolbar-btn',
	toolbarCount: 'notional-timeline-toolbar-count',
	zoomSelect: 'notional-timeline-zoom',
	scroller: 'notional-timeline-scroller',
	canvas: 'notional-timeline-canvas',
	header: 'notional-timeline-header',
	headerMonths: 'notional-timeline-header-months',
	headerMonth: 'notional-timeline-header-month',
	headerDays: 'notional-timeline-header-days',
	headerDay: 'notional-timeline-header-day',
	headerCorner: 'notional-timeline-header-corner',
	collapseBtn: 'notional-timeline-collapse-btn',
	grid: 'notional-timeline-grid',
	weekend: 'notional-timeline-weekend',
	todayLine: 'notional-timeline-today-line',
	body: 'notional-timeline-body',
	row: 'notional-timeline-row',
	rowGroup: 'notional-timeline-row-group',
	rowUndated: 'notional-timeline-row-undated',
	sidebar: 'notional-timeline-sidebar',
	sidebarCell: 'notional-timeline-sidebar-cell',
	sidebarTitle: 'notional-timeline-sidebar-title',
	sidebarCount: 'notional-timeline-sidebar-count',
	sidebarResize: 'notional-timeline-sidebar-resize',
	locate: 'notional-timeline-locate',
	headerStrip: 'notional-timeline-header-strip',
	todayDot: 'notional-timeline-today-dot',
	tooltip: 'notional-timeline-tooltip',
	newRow: 'notional-timeline-row-new',
	rowFiller: 'notional-timeline-row-filler',
	// Icons feature (owned by features/icons)
	noteIcon: 'notional-icon',
	track: 'notional-timeline-track',
	bar: 'notional-timeline-bar',
	barContent: 'notional-timeline-bar-content',
	barLabel: 'notional-timeline-bar-label',
	barTitle: 'notional-timeline-bar-title',
	barProps: 'notional-timeline-bar-props',
	barProp: 'notional-timeline-bar-prop',
	barPropGroup: 'notional-timeline-bar-prop-group',
	editableProp: 'notional-timeline-prop-editable',
	handle: 'notional-timeline-handle',
	handleStart: 'notional-timeline-handle--start',
	handleEnd: 'notional-timeline-handle--end',
	ghost: 'notional-timeline-ghost',
	empty: 'notional-timeline-empty',
	bodyDragging: 'notional-timeline-dragging',
	selectionHint: 'notional-timeline-selection-hint',
	isSelected: 'is-selected',
	isVisible: 'is-visible',
	// State modifiers
	isToday: 'is-today',
	isWeekend: 'is-weekend',
	isDragging: 'is-dragging',
	isReordering: 'is-reordering',
	isReadonly: 'is-readonly',
	isCollapsed: 'is-collapsed',
	hasSidebar: 'has-sidebar',
} as const;
