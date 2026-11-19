import { BasesView, Keymap, Notice, parsePropertyId } from 'obsidian';
import { toMoment } from './dates/toMoment';
import type { BasesPropertyId, BasesSortConfig, HoverPopover, HoverParent, QueryController, TFile } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import {
	CLASSES, DEFAULT_TIMED_MINUTES, DEFAULT_ZOOM, EDGE_EXTEND_THRESHOLD, MAX_RANGE_DAYS, MINUTE_STEP, OPTION_KEYS, ORDER_PROPERTY, ORDER_PROPERTY_ID, RANGE_PADDING_DAYS,
	SIDEBAR_CSS_VAR, SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE, MOBILE_WIDTH, VIEW_ID, ZOOMS,
} from './constants';
import type { Zoom } from './constants';
import { addDays } from './dates/addDays';
import { addMinutes } from './dates/addMinutes';
import { dayDiff } from './dates/dayDiff';
import { startOfDay } from './dates/startOfDay';
import { buildRows } from './layout/buildRows';
import { clampSidebarWidth } from './layout/clampSidebarWidth';
import { computeRange } from './layout/computeRange';
import { computeOrderValues } from './layout/computeOrderValues';
import { findReorderRun } from './layout/findReorderRun';
import { insertOrderSort } from './layout/insertOrderSort';
import type { ReorderRun } from './layout/findReorderRun';
import { sharesStartDay } from './layout/sharesStartDay';
import { dateToX } from './layout/dateToX';
import { fitAllScale } from './layout/fitAllScale';
import { isHourScale } from './layout/isHourScale';
import { timedEnd } from './layout/timedEnd';
import { timeToX } from './layout/timeToX';
import { xToDate } from './layout/xToDate';
import { xToTime } from './layout/xToTime';
import type { EntryRow, Range, Row } from './layout/types';
import { guessDateProperties } from './options/guessDateProperties';
import { readVaultDateProperties } from './options/readVaultDateProperties';
import { renderBar } from './render/renderBar';
import { renderGrid } from './render/renderGrid';
import { renderHeader } from './render/renderHeader';
import { renderSidebarCell } from './render/renderSidebarCell';
import { renderToolbar } from './render/renderToolbar';
import { renderEmpty } from './render/renderEmpty';
import { fitStickyLabels } from './render/fitStickyLabels';
import { renderSelectChip } from '../../shared/entries/render/renderSelectChip';
import { attachMarquee } from '../../shared/entries/selection/attachMarquee';
import { applySelection } from './selection/applySelection';
import { trashEntries } from '../../shared/entries/trashEntries';
import { ConfirmDeleteModal } from '../../shared/entries/ConfirmDeleteModal';
import { renameEntryTitle } from '../../shared/entries/renameEntryTitle';
import { showEntryMenu } from '../../shared/entries/showEntryMenu';
import { attachBarDrag } from './interactions/attachBarDrag';
import { attachRowPlacement } from './interactions/attachRowPlacement';
import { attachSidebarResize } from './interactions/attachSidebarResize';
import { createRowReorder } from './interactions/createRowReorder';
import type { RowReorder } from './interactions/createRowReorder';
import { clearBodyDragState } from './interactions/clearBodyDragState';
import { ensureDatetimeTypes } from './write/ensureDatetimeTypes';
import { writeEntryDates } from './write/writeEntryDates';
import { writeEntryOrder } from './write/writeEntryOrder';
import { saveViewSort } from './write/saveViewSort';
import { formatForProperty } from './dates/formatForProperty';

type DatedRow = EntryRow & { start: Date; end: Date };

// One date change to write
interface DateChange {
	row: EntryRow;
	start: Date;
	end: Date;
	// Write datetimes even when the note's value had no time (placed in the hour zoom)
	withTime?: boolean;
}

export interface TimelineDeps {
	getColorMap: () => Record<string, string>;
	iconStore: IconStore;
	// Opens the select/status picker (select-property feature); onChange fires before the write
	openSelectPicker: (anchor: HTMLElement, fmKey: string, file: TFile, onChange: (value: string) => void) => void;
}

// Where to put a date in the visible track width (0 = left edge, 1 = right edge)
interface Anchor {
	date: Date;
	fraction: number;
}

/**
 * Notion-like timeline view for Bases. Holds view state (zoom, range, scroll,
 * drag) and re-renders the whole DOM on each data update; rendering and
 * interactions live in single-purpose modules.
 */
export class TimelineView extends BasesView implements HoverParent {
	type = VIEW_ID;
	hoverPopover: HoverPopover | null = null;

	private containerEl: HTMLElement;
	private deps: TimelineDeps;
	private scroller: HTMLElement | null = null;
	private range: Range | null = null;
	private dayWidth = 24;
	private sidebarWidth = 0;
	private busy = false;
	private pendingRender = false;
	private pendingAnchor: Anchor | null = null;
	private pendingShiftDays = 0;
	// Days to add on each side at the next render (infinite scroll)
	private extendDays = { left: 0, right: 0 };
	private lastWidth = 0;
	private resizeObserver: ResizeObserver | null = null;
	private unsubscribeIcons: (() => void) | null = null;
	// Selection before the current rectangle (additive marquee)
	private marqueeBase: string[] = [];
	// Selected note paths (kept across re-renders)
	private selection = new Set<string>();
	private root: HTMLElement | null = null;
	// Dated, movable rows of the current render, by note path (group moves)
	private movableRows = new Map<string, DatedRow>();
	// Rows of the current render, in display order (manual reorder)
	private rows: Row[] = [];
	// Run of the reorder in progress, with the dragged row's position in it, and
	// the sort to save on drop when the manual order isn't part of it yet
	private activeReorder: (ReorderRun & { from: number; newSort: BasesSortConfig[] | null }) | null = null;

	constructor(controller: QueryController, containerEl: HTMLElement, deps: TimelineDeps) {
		super(controller);
		this.containerEl = containerEl;
		this.deps = deps;
	}

	onload(): void {
		this.resizeObserver = new ResizeObserver(() => {
			const width = this.containerEl.clientWidth;
			if (width === this.lastWidth) return;
			this.lastWidth = width;
			if (this.zoom === 'all') this.render();
		});
		this.resizeObserver.observe(this.containerEl);
		// Icon picked/removed (from here or elsewhere) → refresh titles
		this.unsubscribeIcons = this.deps.iconStore.onChange(() => this.onDataUpdated());

		// The container (not re-rendered) holds focus so keyboard shortcuts survive re-renders
		this.containerEl.addClass(CLASSES.host);
		this.containerEl.tabIndex = -1;
		this.registerDomEvent(this.containerEl, 'pointerdown', () => this.containerEl.focus({ preventScroll: true }));
		this.registerDomEvent(this.containerEl, 'keydown', evt => this.onKeyDown(evt));
	}

	onunload(): void {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.unsubscribeIcons?.();
		this.unsubscribeIcons = null;
		clearBodyDragState();
		this.containerEl.removeClass(CLASSES.host);
		this.containerEl.removeAttribute('tabindex');
		this.containerEl.empty();
	}

	onDataUpdated(): void {
		if (this.busy) { this.pendingRender = true; return; }
		this.render();
	}

	// ─── Config accessors ─────────────────────────────────────────────────────

	private get zoom(): Zoom {
		const z = this.config.get(OPTION_KEYS.zoom);
		return ZOOMS.some(o => o.id === z) ? z as Zoom : DEFAULT_ZOOM;
	}

	private get startProp(): BasesPropertyId | null {
		return this.config.getAsPropertyId(OPTION_KEYS.startProperty) ?? this.guessProperties().start;
	}

	private get endProp(): BasesPropertyId | null {
		return this.config.getAsPropertyId(OPTION_KEYS.endProperty);
	}

	// Hour zoom: hours labelled, timed items placed at their time
	private get hours(): boolean {
		return isHourScale(this.dayWidth);
	}

	private guessProperties() {
		return guessDateProperties(this.allProperties, readVaultDateProperties(this.app));
	}

	/**
	 * A view without a start property gets the guessed pair written to its config,
	 * so the options menu shows what it uses. Once: a start set means the user chose.
	 */
	private saveGuessedProperties(): void {
		if (this.config.get(OPTION_KEYS.startProperty) != null) return;
		const { start, end } = this.guessProperties();
		if (!start) return;
		this.config.set(OPTION_KEYS.startProperty, start);
		if (end && this.config.get(OPTION_KEYS.endProperty) == null) this.config.set(OPTION_KEYS.endProperty, end);
	}

	private get showSidebar(): boolean {
		return this.config.get(OPTION_KEYS.showSidebar) !== false;
	}

	private get sidebarCollapsed(): boolean {
		return this.config.get(OPTION_KEYS.sidebarCollapsed) === true;
	}

	// List width set by dragging its edge (desktop width), default otherwise
	private get savedSidebarWidth(): number {
		const width = this.config.get(OPTION_KEYS.sidebarWidth);
		return typeof width === 'number' ? width : SIDEBAR_WIDTH;
	}

	// ─── Rendering ────────────────────────────────────────────────────────────

	private render(): void {
		const prevScroll = this.scroller ? { left: this.scroller.scrollLeft, top: this.scroller.scrollTop } : null;
		const prevGeometry = this.range ? { start: this.range.start.getTime(), dayWidth: this.dayWidth } : null;
		const prevCenter = this.visibleCenterDate();
		const isFirstRender = !this.scroller;

		clearBodyDragState();
		this.containerEl.empty();
		const root = this.containerEl.createDiv({ cls: CLASSES.root });
		this.root = root;
		this.scroller = null;

		this.saveGuessedProperties();
		const startProp = this.startProp;
		const endProp = this.endProp;
		if (!startProp) {
			renderEmpty(root, 'Select a start date property in the view options to display the timeline.');
			return;
		}

		const zoom = this.zoom;
		const containerWidth = this.containerEl.clientWidth || 800;
		this.lastWidth = containerWidth;
		const isCompact = containerWidth < MOBILE_WIDTH;
		const fullSidebar = isCompact ? SIDEBAR_WIDTH_MOBILE : clampSidebarWidth(this.savedSidebarWidth, containerWidth);
		this.sidebarWidth = this.showSidebar && !this.sidebarCollapsed ? fullSidebar : 0;
		root.style.setProperty(SIDEBAR_CSS_VAR, `${this.sidebarWidth}px`);

		const rows = buildRows(this.app, this.data.groupedData, startProp, endProp);
		this.rows = rows;
		this.movableRows.clear();
		const computed = computeRange(rows, zoom, zoom === 'all' ? null : this.range);
		// Edge extension is applied here, not in onScroll, so the previous geometry
		// read above stays accurate and the scroll position is simply shifted
		const { left, right } = this.extendDays;
		this.extendDays = { left: 0, right: 0 };
		this.range = { start: addDays(computed.start, -left), days: computed.days + left + right };
		this.pendingShiftDays = left;
		this.dayWidth = zoom === 'all'
			? fitAllScale(this.range.days, containerWidth - this.sidebarWidth - 2)
			: ZOOMS.find(z => z.id === zoom)?.dayWidth ?? 24;

		renderToolbar(root, {
			zoom,
			showSidebar: this.showSidebar,
			sidebarCollapsed: this.sidebarCollapsed,
			onZoom: z => this.setZoom(z),
			onToday: () => this.scrollToDate(new Date(), 0.3, true),
			onStep: dir => this.scroller?.scrollBy({ left: dir * this.visibleWidth() * 0.8, behavior: 'smooth' }),
			onToggleSidebar: () => this.toggleSidebar(),
		});

		const scroller = root.createDiv({ cls: CLASSES.scroller });
		this.scroller = scroller;
		const timelineWidth = this.range.days * this.dayWidth;
		const canvas = scroller.createDiv({ cls: CLASSES.canvas });
		// Follows the list width live while it's resized
		canvas.style.width = `calc(var(${SIDEBAR_CSS_VAR}) + ${timelineWidth}px)`;
		canvas.toggleClass(CLASSES.hasSidebar, this.sidebarWidth > 0);

		const entryCount = rows.filter(r => r.kind === 'entry').length;
		renderHeader(canvas, this.range, this.dayWidth, corner => {
			if (this.sidebarWidth === 0) return;
			corner.createSpan({ cls: CLASSES.sidebarCount, text: `${entryCount} ${entryCount === 1 ? 'item' : 'items'}` });
			const collapse = corner.createDiv({ cls: `${CLASSES.collapseBtn} clickable-icon`, attr: { 'aria-label': 'Hide list' } });
			collapse.setText('«');
			collapse.addEventListener('click', () => this.toggleSidebar());
		});

		const body = canvas.createDiv({ cls: CLASSES.body });
		renderGrid(body, this.range, this.dayWidth);

		for (const row of rows) this.renderRow(body, row, startProp, endProp, timelineWidth);
		fitStickyLabels(body);

		// Forget selected notes that left the view (deleted, filtered out)
		const paths = new Set(rows.flatMap(r => r.kind === 'entry' ? [r.file.path] : []));
		this.selection.forEach(p => { if (!paths.has(p)) this.selection.delete(p); });
		applySelection(root, this.selection);

		attachMarquee({
			scroller,
			canvas,
			leftInset: this.sidebarWidth,
			// Bars, list column and header keep their own meaning
			ignoreSelector: [CLASSES.bar, CLASSES.sidebarCell, CLASSES.header].map(c => `.${c}`).join(', '),
			itemSelector: `.${CLASSES.bar}[data-path]`,
			onStart: () => { this.busy = true; },
			onSelect: (hits, additive) => this.setSelection(additive ? [...this.marqueeBase, ...hits] : hits),
			onEnd: () => { this.marqueeBase = [...this.selection]; this.release(); },
			onEmptyClick: () => this.setSelection([]),
		});
		this.marqueeBase = [...this.selection];
		this.renderNewRow(body, startProp, endProp, timelineWidth);

		// Filler keeps the sticky list column continuous down to the bottom
		const filler = body.createDiv({ cls: `${CLASSES.row} ${CLASSES.rowFiller}` });
		if (this.sidebarWidth > 0) filler.createDiv({ cls: CLASSES.sidebarCell });
		if (this.sidebarWidth > 0 && !isCompact) this.attachSidebarResize(root);

		// Restore scroll, honoring a pending anchor (zoom change) or range shift (edge extension)
		if (this.pendingAnchor) {
			const { date, fraction } = this.pendingAnchor;
			this.pendingAnchor = null;
			this.scrollToDate(date, fraction, false);
			if (prevScroll) scroller.scrollTop = prevScroll.top;
		} else if (prevScroll && prevCenter && this.geometryChanged(prevGeometry)) {
			// Scale or origin changed (zoom edited from the config, resize in "All"): keep the same date centered
			this.scrollToDate(prevCenter, 0.5, false);
			scroller.scrollTop = prevScroll.top;
		} else if (prevScroll) {
			scroller.scrollLeft = prevScroll.left + this.pendingShiftDays * this.dayWidth;
			scroller.scrollTop = prevScroll.top;
		} else if (isFirstRender) {
			this.scrollToDate(new Date(), 0.3, false);
		}
		this.pendingShiftDays = 0;

		scroller.addEventListener('scroll', () => this.onScroll(), { passive: true });
	}

	private renderRow(body: HTMLElement, row: Row, startProp: BasesPropertyId, endProp: BasesPropertyId | null, width: number): void {
		const rowEl = body.createDiv({ cls: CLASSES.row });
		if (row.kind === 'group') rowEl.addClass(CLASSES.rowGroup);
		else rowEl.dataset.path = row.file.path;

		if (this.sidebarWidth > 0) {
			renderSidebarCell(this.app, rowEl, row, this.deps.iconStore, row.kind === 'entry' ? {
				onOpen: evt => this.onEntryClick(row.file, evt),
				onHover: (evt, el) => this.hoverFile(row.file, evt, el),
				onLocate: () => row.start && this.scrollToDate(row.start, 0.15, true),
				onMenu: (evt, titleEl) => this.showEntryMenu(evt, row.file, titleEl),
			} : null);
		}

		const track = rowEl.createDiv({ cls: CLASSES.track });
		track.style.width = `${width}px`;
		if (row.kind !== 'entry' || !this.range) return;

		if (row.start && row.end) {
			this.renderEntryBar(track, { ...row, start: row.start, end: row.end }, startProp, endProp);
		} else if (row.movable) {
			rowEl.addClass(CLASSES.rowUndated);
			attachRowPlacement({
				track,
				...this.placement(),
				label: 'Set date',
				onPlace: date => void this.commit([this.hours
					? { row, start: date, end: addMinutes(date, DEFAULT_TIMED_MINUTES), withTime: true }
					: { row, start: date, end: date }], startProp, endProp),
			});
		}
	}

	private renderEntryBar(
		track: HTMLElement,
		row: DatedRow,
		startProp: BasesPropertyId,
		endProp: BasesPropertyId | null,
	): void {
		if (!this.range || !this.scroller) return;
		if (row.movable) this.movableRows.set(row.file.path, row);
		const properties = this.config.getOrder().filter(p => p !== 'file.name' && p !== startProp && p !== endProp);
		// Hour zoom: a timed bar sits at its times and moves by 15 minutes, other bars by days.
		// Any bar resizes by 15 minutes there, which gives a date-only note its times.
		const exact = this.hours && row.timed;
		const byMinutes = (d: Date, steps: number) => addMinutes(d, steps * MINUTE_STEP);
		const moveShift = exact ? byMinutes : addDays;
		const resizeShift = this.hours ? byMinutes : addDays;
		const end = exact ? timedEnd(row.start, row.end) : row.end;
		// End edge as a time: the default length of a timed note, the next midnight of a date-only one
		const resizeEnd = !this.hours ? row.end : row.timed ? end : addDays(startOfDay(row.end), 1);
		const bar = renderBar(
			this.app, track, row, this.range, this.dayWidth, exact, properties, this.deps.getColorMap(), this.deps.iconStore,
			// Optimistic update: the chip changes immediately, Bases re-renders once the note is written
			(group, fmKey) => this.deps.openSelectPicker(group, fmKey, row.file, value => {
				renderSelectChip(group, value, this.deps.getColorMap(), CLASSES.editableProp);
			}),
		);
		const title = bar.querySelector<HTMLElement>(`.${CLASSES.barTitle}`);
		title?.addEventListener('mouseover', evt => this.hoverFile(row.file, evt, title));
		bar.addEventListener('contextmenu', evt => this.showEntryMenu(evt, row.file, title));

		attachBarDrag({
			bar,
			scroller: this.scroller,
			moveStepWidth: exact ? this.dayWidth * MINUTE_STEP / 1440 : this.dayWidth,
			resizeStepWidth: this.hours ? this.dayWidth * MINUTE_STEP / 1440 : this.dayWidth,
			span: this.hours
				? Math.max(1, Math.round((resizeEnd.getTime() - row.start.getTime()) / (MINUTE_STEP * 60 * 1000)))
				: dayDiff(row.start, row.end) + 1,
			sidebarWidth: this.sidebarWidth,
			movable: row.movable,
			resizable: row.resizable,
			getGroup: () => this.groupBarsFor(row.file.path),
			describe: (ds, de, size) => size > 1
				? describeShift(exact ? ds * MINUTE_STEP : ds, size, exact)
				: ds === de
					? describeRange(moveShift(row.start, ds), moveShift(end, de), exact)
					: describeRange(resizeShift(row.start, ds), resizeShift(resizeEnd, de), this.hours),
			onDragStart: () => { this.busy = true; },
			onDragEnd: (ds, de) => {
				if (ds === 0 && de === 0) { this.release(); return; }
				// Resize: one note, the edge shown becomes its date (a time in the hour zoom)
				if (ds !== de) {
					const change = { row, start: resizeShift(row.start, ds), end: resizeShift(resizeEnd, de), withTime: this.hours };
					void this.commit([change], startProp, endProp);
					return;
				}
				// Move: a selected bar moves the whole selection by the same number of steps,
				// each note keeping its own end (none stays none)
				const moved = this.selection.has(row.file.path) ? this.groupRowsFor(row.file.path) : [row];
				const changes = moved.map(r => ({ row: r, start: moveShift(r.start, ds), end: moveShift(r.end, ds) }));
				void this.commit(changes, startProp, endProp);
			},
			onClick: evt => this.onEntryClick(row.file, evt),
			reorder: () => this.startReorder(row.file.path),
			onReorderEnd: reorder => void this.endReorder(reorder),
		});
	}

	/** Last row: click anywhere on the track to create a note at that date. */
	private renderNewRow(body: HTMLElement, startProp: BasesPropertyId, endProp: BasesPropertyId | null, width: number): void {
		if (!this.range || parsePropertyId(startProp).type !== 'note') return;
		const rowEl = body.createDiv({ cls: `${CLASSES.row} ${CLASSES.newRow}` });
		if (this.sidebarWidth > 0) {
			const cell = rowEl.createDiv({ cls: CLASSES.sidebarCell });
			const btn = cell.createSpan({ cls: CLASSES.sidebarTitle, text: '+ New' });
			btn.addEventListener('click', () => void this.createAt(startOfDay(new Date()), startProp, endProp));
		}
		const track = rowEl.createDiv({ cls: CLASSES.track });
		track.style.width = `${width}px`;
		attachRowPlacement({
			track,
			...this.placement(),
			label: 'New',
			onPlace: date => void this.createAt(date, startProp, endProp, this.hours),
		});
	}

	/** Snap of an empty track: 15 minutes and a timed ghost in the hour zoom, days otherwise. */
	private placement(): { stepWidth: number; ghostWidth: number; xToDate: (x: number) => Date } {
		const start = this.range?.start ?? startOfDay(new Date());
		const dayWidth = this.dayWidth;
		if (!this.hours) return { stepWidth: dayWidth, ghostWidth: dayWidth, xToDate: x => xToDate(x, start, dayWidth) };
		return {
			stepWidth: dayWidth * MINUTE_STEP / 1440,
			ghostWidth: dayWidth * DEFAULT_TIMED_MINUTES / 1440,
			xToDate: x => xToTime(x, start, dayWidth, MINUTE_STEP),
		};
	}

	// ─── Actions ──────────────────────────────────────────────────────────────

	/** Ends a busy phase (drag, write) and flushes a deferred render. */
	private release(): void {
		this.busy = false;
		if (this.pendingRender) {
			this.pendingRender = false;
			this.render();
		}
	}

	private async commit(changes: DateChange[], startProp: BasesPropertyId, endProp: BasesPropertyId | null): Promise<void> {
		// Keep the preview on screen until Bases pushes the updated data
		this.busy = true;
		this.pendingRender = false;
		try {
			await Promise.all(changes.map(c => writeEntryDates(this.app, c.row, startProp, endProp, c.start, c.end, c.withTime)));
		} finally {
			this.release();
		}
	}

	/**
	 * Vertical drag on a bar: preview a move among the rows tied with it on the
	 * sort criteria before the manual order. Without that order in the sort, it
	 * is added right after the start date (saved on drop).
	 */
	private startReorder(path: string): RowReorder | null {
		const sort = this.config.getSort();
		const isOrderSorted = sort.some(s => s.property === ORDER_PROPERTY_ID);
		const newSort = isOrderSorted ? null : insertOrderSort(sort, this.startProp);
		if (!isOrderSorted && !newSort) {
			if (this.startProp && sharesStartDay(this.rows, path)) {
				new Notice(`Sort the view by "${this.config.getDisplayName(this.startProp)}" to reorder notes manually.`);
			}
			return null;
		}
		const found = findReorderRun(this.rows, path, newSort ?? sort);
		if (!found) return null;
		const rowEls = found.run.flatMap(r => {
			const el = this.root?.querySelector<HTMLElement>(`.${CLASSES.row}[data-path="${CSS.escape(r.file.path)}"]`);
			return el ? [el] : [];
		});
		if (rowEls.length !== found.run.length) return null;
		const from = found.run.findIndex(r => r.file.path === path);
		this.activeReorder = { ...found, from, newSort };
		return createRowReorder(rowEls, from);
	}

	/** Writes the new manual order, touching as few notes as possible (see computeOrderValues). */
	private async endReorder(reorder: RowReorder): Promise<void> {
		const active = this.activeReorder;
		this.activeReorder = null;
		const target = reorder.targetIndex();
		if (!active || target === active.from) {
			reorder.reset();
			this.release();
			return;
		}
		const readOrder = (file: TFile): unknown => this.app.metadataCache.getFileCache(file)?.frontmatter?.[ORDER_PROPERTY];
		const files = active.run.map(r => r.file);
		const values = computeOrderValues(files.map(readOrder), active.from, target, active.descending);
		const [moved] = files.splice(active.from, 1);
		if (moved) files.splice(target, 0, moved);

		// Keep the preview on screen until Bases pushes the re-sorted data
		this.busy = true;
		this.pendingRender = false;
		if (active.newSort) {
			saveViewSort(this.config, active.newSort);
			new Notice(`Sorted by "${ORDER_PROPERTY}" after "${this.startProp ? this.config.getDisplayName(this.startProp) : 'start'}". Remove it from the sort to go back.`);
		}
		try {
			await Promise.all(files.flatMap((file, i) => {
				const value = values[i] ?? null;
				return value === null || value === readOrder(file) ? [] : [writeEntryOrder(this.app, file, value)];
			}));
		} finally {
			this.release();
		}
	}

	/** Selected movable rows (the dragged one first) when the dragged note is part of the selection. */
	private groupRowsFor(path: string): DatedRow[] {
		const self = this.movableRows.get(path);
		if (!self || !this.selection.has(path)) return self ? [self] : [];
		const others = [...this.selection]
			.filter(p => p !== path)
			.flatMap(p => { const r = this.movableRows.get(p); return r ? [r] : []; });
		return [self, ...others];
	}

	/** Bars of the other selected notes, moved along during a drag. */
	private groupBarsFor(path: string): HTMLElement[] {
		if (!this.root) return [];
		return this.groupRowsFor(path).slice(1).flatMap(r => {
			const bar = this.root?.querySelector<HTMLElement>(`.${CLASSES.bar}[data-path="${CSS.escape(r.file.path)}"]`);
			return bar ? [bar] : [];
		});
	}

	/** New note at a date (a day), or a timed slot of the default length when `timed`. */
	private async createAt(date: Date, startProp: BasesPropertyId, endProp: BasesPropertyId | null, timed = false): Promise<void> {
		const startName = parsePropertyId(startProp).name;
		const endName = endProp && parsePropertyId(endProp).type === 'note' ? parsePropertyId(endProp).name : null;
		const value = formatForProperty(date, null, timed);
		const endValue = timed ? formatForProperty(addMinutes(date, DEFAULT_TIMED_MINUTES), null, true) : value;
		if (timed) ensureDatetimeTypes(this.app, endName ? [startName, endName] : [startName]);
		await this.createFileForView(undefined, (fm: Record<string, unknown>) => {
			fm[startName] = value;
			if (endName) fm[endName] = endValue;
		});
	}

	private setZoom(zoom: Zoom): void {
		if (zoom === this.zoom) return;
		this.pendingAnchor = { date: this.visibleCenterDate() ?? new Date(), fraction: 0.5 };
		this.range = null;
		this.config.set(OPTION_KEYS.zoom, zoom);
		this.render();
	}

	/** Live width through the CSS variable while dragging; saved in the view config and re-rendered on release. */
	private attachSidebarResize(root: HTMLElement): void {
		attachSidebarResize({
			root,
			clamp: width => clampSidebarWidth(width, this.containerEl.clientWidth),
			onStart: () => { this.busy = true; },
			onResize: width => root.style.setProperty(SIDEBAR_CSS_VAR, `${width}px`),
			onEnd: width => {
				if (width !== null && width !== this.sidebarWidth) {
					this.config.set(OPTION_KEYS.sidebarWidth, width);
					this.pendingRender = true;
				}
				this.release();
			},
		});
	}

	private toggleSidebar(): void {
		const center = this.visibleCenterDate();
		this.pendingAnchor = center ? { date: center, fraction: 0.5 } : null;
		this.config.set(OPTION_KEYS.sidebarCollapsed, !this.sidebarCollapsed);
		this.render();
	}

	/** Shift-click toggles the note in the selection; a plain click opens it. */
	private onEntryClick(file: TFile, evt: MouseEvent): void {
		if (!evt.shiftKey) { this.openFile(file, evt); return; }
		const next = new Set(this.selection);
		if (next.has(file.path)) next.delete(file.path);
		else next.add(file.path);
		this.setSelection([...next]);
		this.marqueeBase = [...this.selection];
		this.containerEl.focus({ preventScroll: true });
	}

	private setSelection(paths: string[]): void {
		this.selection = new Set(paths);
		if (this.root) applySelection(this.root, this.selection);
	}

	private onKeyDown(evt: KeyboardEvent): void {
		if (evt.key === 'Escape' && this.selection.size) {
			evt.preventDefault();
			this.setSelection([]);
			this.marqueeBase = [];
		} else if ((evt.key === 'Backspace' || evt.key === 'Delete') && this.selection.size) {
			evt.preventDefault();
			this.requestDelete();
		}
	}

	// Right-click on an entry title or bar: open, rename (input over that title), delete
	private showEntryMenu(evt: MouseEvent, file: TFile, titleEl: HTMLElement | null): void {
		evt.preventDefault();
		evt.stopPropagation();
		const inSelection = this.selection.has(file.path);
		showEntryMenu(evt, {
			app: this.app,
			file,
			source: VIEW_ID,
			onRename: () => renameEntryTitle(this.app, titleEl, file),
			deleteCount: inSelection ? this.selection.size : 1,
			onDelete: () => this.requestDelete(inSelection ? undefined : [file]),
		});
	}

	private requestDelete(only?: TFile[]): void {
		const files = only ?? [...this.selection]
			.map(p => this.app.vault.getFileByPath(p))
			.filter((f): f is TFile => !!f);
		if (!files.length) return;
		new ConfirmDeleteModal(this.app, files, () => {
			this.setSelection([]);
			this.marqueeBase = [];
			void trashEntries(this.app, files);
		}).open();
	}

	private openFile(file: TFile, evt: MouseEvent): void {
		void this.app.workspace.openLinkText(file.path, '', Keymap.isModEvent(evt));
	}

	private hoverFile(file: TFile, evt: MouseEvent, targetEl: HTMLElement): void {
		this.app.workspace.trigger('hover-link', {
			event: evt,
			source: VIEW_ID,
			hoverParent: this,
			targetEl,
			linktext: file.path,
		});
	}

	/** True when the day scale or the range origin moved for another reason than an edge extension. */
	private geometryChanged(prev: { start: number; dayWidth: number } | null): boolean {
		if (!prev || !this.range) return false;
		if (prev.dayWidth !== this.dayWidth) return true;
		return prev.start !== addDays(this.range.start, this.pendingShiftDays).getTime();
	}

	// ─── Scroll ───────────────────────────────────────────────────────────────

	private visibleWidth(): number {
		return Math.max(0, (this.scroller?.clientWidth ?? 0) - this.sidebarWidth);
	}

	private visibleCenterDate(): Date | null {
		if (!this.scroller || !this.range) return null;
		const x = this.scroller.scrollLeft + this.visibleWidth() / 2;
		return xToTime(x, this.range.start, this.dayWidth, 1);
	}

	private scrollToDate(date: Date, fraction: number, smooth: boolean): void {
		if (!this.scroller || !this.range) return;
		// Hour zoom: the exact time, otherwise the middle of the day
		const x = this.hours
			? timeToX(date, this.range.start, this.dayWidth)
			: dateToX(startOfDay(date), this.range.start, this.dayWidth) + this.dayWidth / 2;
		const left = Math.max(0, x - fraction * this.visibleWidth());
		this.scroller.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
	}

	/** Grows the range when the user scrolls close to an edge (infinite timeline). */
	private onScroll(): void {
		const s = this.scroller;
		if (!s || !this.range || this.busy || this.zoom === 'all') return;
		// Safety cap: never grow past MAX_RANGE_DAYS (prevents runaway extension)
		if (this.range.days >= MAX_RANGE_DAYS) return;
		const pad = RANGE_PADDING_DAYS[this.zoom];

		if (s.scrollLeft < EDGE_EXTEND_THRESHOLD) {
			this.extendDays.left = pad;
			this.render();
		} else if (s.scrollWidth > s.clientWidth && s.scrollLeft + s.clientWidth > s.scrollWidth - EDGE_EXTEND_THRESHOLD) {
			this.extendDays.right = pad;
			this.render();
		}
	}
}

/** "3 notes · +2 days" (or "+1 h 15 min" for minutes) while moving a selection. */
function describeShift(amount: number, count: number, minutes: boolean): string {
	const sign = amount > 0 ? '+' : amount < 0 ? '−' : '±';
	const abs = Math.abs(amount);
	if (!minutes) return `${count} notes · ${sign}${abs} ${abs === 1 ? 'day' : 'days'}`;
	const h = Math.floor(abs / 60);
	const m = abs % 60;
	const text = [h ? `${h} h` : '', m || !h ? `${m} min` : ''].filter(Boolean).join(' ');
	return `${count} notes · ${sign}${text}`;
}

/** "Aug 27 → Sep 3 · 8 days" (or a single date for one-day items), "Oct 17, 3:00 PM → 10:15 PM" with times. */
function describeRange(start: Date, end: Date, withTime: boolean): string {
	const days = dayDiff(start, end) + 1;
	const fmt = (d: Date) => toMoment(d).format('MMM D');
	if (withTime) {
		const time = (d: Date) => toMoment(d).format('LT');
		return days === 1
			? `${fmt(start)}, ${time(start)} → ${time(end)}`
			: `${fmt(start)}, ${time(start)} → ${fmt(end)}, ${time(end)}`;
	}
	return days === 1 ? fmt(start) : `${fmt(start)} → ${fmt(end)} · ${days} days`;
}
