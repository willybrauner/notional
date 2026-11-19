import { BasesView, Keymap, Notice, parsePropertyId } from 'obsidian';
import type { BasesEntry, HoverParent, HoverPopover, QueryController, TFile } from 'obsidian';
import type { ColorStore } from '../../services/colors/ColorStore';
import { openColorPalette } from '../../services/colors/palette/openColorPalette';
import { ConfirmDeleteModal } from '../../shared/entries/ConfirmDeleteModal';
import { showEntryMenu } from '../../shared/entries/showEntryMenu';
import { renameEntryTitle } from '../../shared/entries/renameEntryTitle';
import { attachMarquee } from '../../shared/entries/selection/attachMarquee';
import { trashEntries } from '../../shared/entries/trashEntries';
import type { IconStore } from '../../services/icons/IconStore';
import { normalizeKey } from '../../services/select-picker/seeds/normalizeKey';
import { renderSelectChip } from '../../shared/entries/render/renderSelectChip';
import {
	CLASSES, COLUMN_WIDTH_VAR, DEFAULT_COLUMN_WIDTH, DEFAULT_IMAGE_ASPECT_RATIO, IMAGE_RATIO_VAR, NONE_KEY, OPTION_KEYS, VIEW_ID,
} from './constants';
import { attachCardDrag } from './interactions/attachCardDrag';
import { attachColumnDrag } from './interactions/attachColumnDrag';
import { applyCardOrder } from './layout/applyCardOrder';
import { buildColumns } from './layout/buildColumns';
import { isListProperty } from './layout/isListProperty';
import { orderColumns } from './layout/orderColumns';
import { readCardOrder } from './layout/readCardOrder';
import type { Column } from './layout/types';
import { migrateLegacyKeys } from './options/migrateLegacyKeys';
import { resolveColumnProperty } from './options/resolveColumnProperty';
import type { ColumnSource } from './options/resolveColumnProperty';
import { renderCard } from './render/renderCard';
import { renderColumn } from './render/renderColumn';
import { renderHiddenColumns } from './render/renderHiddenColumns';
import { showColumnMenu } from './render/showColumnMenu';
import { showHiddenColumnMenu } from './render/showHiddenColumnMenu';
import { moveEntryValue } from './write/moveEntryValue';
import { nextCardOrder } from './write/nextCardOrder';
import { renameInCardOrder } from './write/renameInCardOrder';

export interface BoardDeps {
	colors: ColorStore;
	iconStore: IconStore;
	// Opens the select/status picker (select-property feature); onChange fires before the write
	openSelectPicker: (anchor: HTMLElement, fmKey: string, file: TFile, onChange: (value: string) => void) => void;
	// select.options declared for a property in the bases (empty columns)
	getOptions: (propName: string) => string[];
	// Calls back once they are read (again), maybe after the board was drawn. Returns the unsubscribe function
	onOptionsRead: (listener: () => void) => () => void;
}

// Context of the current render, shared by the column and card handlers
interface BoardContext {
	source: ColumnSource;
	propName: string;
	propertyLabel: string;
	editable: boolean;
	isList: boolean;
	isTag: boolean;
	// Manual card order applies (no Bases sort)
	canOrder: boolean;
	columns: Column[];
}

// Presses on these keep their own meaning (no rectangle selection)
const MARQUEE_IGNORED = [CLASSES.card, CLASSES.columnHeader, CLASSES.newCard, CLASSES.hidden].map(c => `.${c}`).join(', ');

/**
 * Notion-like board for Bases: one column per value of the grouped property,
 * a note with several values (tags, lists) shows in each of their columns.
 * Columns take the color of their value; cards can be ordered by hand per
 * column, selected with a rectangle and deleted. Re-renders the whole DOM on
 * each data or color update; rendering and interactions live in their modules.
 */
export class BoardView extends BasesView implements HoverParent {
	type = VIEW_ID;
	hoverPopover: HoverPopover | null = null;

	private containerEl: HTMLElement;
	private deps: BoardDeps;
	private root: HTMLElement | null = null;
	private unsubscribes: (() => void)[] = [];
	// A drag in progress delays re-renders until the drop
	private dragging = false;
	private pendingRender = false;
	// Selected note paths (kept across re-renders), and the selection before the current rectangle
	private selection = new Set<string>();
	private marqueeBase: string[] = [];

	constructor(controller: QueryController, containerEl: HTMLElement, deps: BoardDeps) {
		super(controller);
		this.containerEl = containerEl;
		this.deps = deps;
	}

	onload(): void {
		this.containerEl.addClass(CLASSES.host);
		this.unsubscribes.push(
			this.deps.colors.onChange(() => this.render()),
			this.deps.iconStore.onChange(() => this.render()),
			// Drawn before they were read: the columns follow the select.options order then
			// (once the view has its data: the seeds may be read before)
			this.deps.onOptionsRead(() => { if (this.data) this.render(); }),
		);
		// The container (not re-rendered) holds focus so keyboard shortcuts survive re-renders
		this.containerEl.tabIndex = -1;
		this.registerDomEvent(this.containerEl, 'pointerdown', () => this.containerEl.focus({ preventScroll: true }));
		this.registerDomEvent(this.containerEl, 'keydown', evt => this.onKeyDown(evt));
		this.registerEvent(this.app.vault.on('rename', (file, oldPath) => this.onRename(file.path, oldPath)));
	}

	onunload(): void {
		this.unsubscribes.forEach(unsubscribe => unsubscribe());
		this.unsubscribes = [];
		activeDocument.body.removeClass(CLASSES.bodyDragging);
		this.containerEl.removeClass(CLASSES.host);
		this.containerEl.removeAttribute('tabindex');
		this.containerEl.empty();
	}

	onDataUpdated(): void {
		migrateLegacyKeys(this.config);
		this.render();
	}

	// ─── Render ───────────────────────────────────────────────────────────────

	private render(): void {
		if (this.dragging) {
			this.pendingRender = true;
			return;
		}
		const scrollLeft = this.root?.scrollLeft ?? 0;
		this.containerEl.empty();
		const root = this.root = this.containerEl.createDiv({ cls: CLASSES.root });
		root.style.setProperty(COLUMN_WIDTH_VAR, `${this.columnWidth}px`);
		root.style.setProperty(IMAGE_RATIO_VAR, String(this.imageAspectRatio));
		const canvas = root.createDiv({ cls: CLASSES.canvas });

		const source = resolveColumnProperty(this.config);
		if (!source) {
			canvas.createDiv({ cls: CLASSES.empty, text: 'Choose a property in the group by setting to build the columns.' });
			return;
		}
		const { type, name } = parsePropertyId(source.property);
		const entries = this.data.data;
		const editable = type === 'note';
		const columns = orderColumns(
			buildColumns(entries, source.property),
			this.savedOrder,
			editable ? this.deps.getOptions(name) : [],
			source.direction,
		);
		const canOrder = this.config.getSort().length === 0;
		if (canOrder) applyCardOrder(columns, this.cardOrder);

		const propertyLabel = this.config.getDisplayName(source.property);
		const ctx: BoardContext = {
			source, propName: name, propertyLabel, editable, canOrder, columns,
			isList: isListProperty(entries, source.property),
			isTag: name === 'tags',
		};
		root.toggleClass(CLASSES.isReadonly, !editable);
		root.toggleClass(CLASSES.isContain, this.config.get(OPTION_KEYS.imageFit) === 'contain');

		const hidden = this.hiddenColumns;
		const isHidden = (column: Column) => hidden.has(this.columnLabel(column, ctx).toLowerCase());
		for (const column of columns) if (!isHidden(column)) this.renderColumn(root, canvas, column, ctx);
		renderHiddenColumns(
			canvas,
			columns.filter(isHidden).map(column => ({ column, label: this.columnLabel(column, ctx), color: this.columnColor(column) })),
			normalizeKey(source.property),
			ctx.isTag,
			(item, evt) => showHiddenColumnMenu(evt, () => this.setHidden(item.label, false)),
		);

		// Forget selected notes that left the view (deleted, filtered out)
		const paths = new Set(entries.map(entry => entry.file.path));
		this.selection.forEach(path => { if (!paths.has(path)) this.selection.delete(path); });
		this.applySelection();
		attachMarquee({
			scroller: root,
			canvas,
			leftInset: 0,
			ignoreSelector: MARQUEE_IGNORED,
			itemSelector: `.${CLASSES.card}[data-path]`,
			onStart: () => { this.dragging = true; },
			onSelect: (hits, additive) => this.setSelection(additive ? [...this.marqueeBase, ...hits] : hits),
			onEnd: () => {
				this.marqueeBase = [...this.selection];
				this.setDragging(false);
			},
			onEmptyClick: () => this.setSelection([]),
		});
		this.marqueeBase = [...this.selection];
		root.scrollLeft = scrollLeft;
	}

	private renderColumn(root: HTMLElement, canvas: HTMLElement, column: Column, ctx: BoardContext): void {
		const color = this.columnColor(column);
		const els = renderColumn(canvas, column, {
			color,
			propertyKey: normalizeKey(ctx.source.property),
			label: this.columnLabel(column, ctx),
			editable: ctx.editable,
			isTag: ctx.isTag,
		});

		const pickColor = column.key === NONE_KEY ? null : () => {
			openColorPalette(els.chip, color, picked => void this.deps.colors.set(column.label, picked));
		};
		if (pickColor) {
			els.chip.addEventListener('click', evt => {
				evt.stopPropagation();
				pickColor();
			});
		}
		els.menuBtn.addEventListener('click', evt => {
			evt.stopPropagation();
			showColumnMenu(els.menuBtn, { onChangeColor: pickColor, onHide: () => this.setHidden(this.columnLabel(column, ctx), true) });
		});
		els.addBtn?.addEventListener('click', () => void this.createIn(column, ctx));
		els.newBtn?.addEventListener('click', () => void this.createIn(column, ctx));
		if (ctx.editable && column.key !== NONE_KEY) {
			attachColumnDrag({
				column: els.el,
				header: els.header,
				root,
				canvas,
				onDragState: dragging => this.setDragging(dragging),
				onDrop: index => this.saveColumnOrder(ctx.columns, column, index),
			});
		}

		const properties = this.config.getOrder().filter(p => p !== 'file.name' && p !== ctx.source.property);
		const imageProperty = this.config.getAsPropertyId(OPTION_KEYS.imageProperty);
		for (const entry of column.entries) {
			const card = renderCard(els.cards, entry, {
				app: this.app,
				iconStore: this.deps.iconStore,
				colorMap: this.deps.colors.map,
				properties,
				imageProperty,
				// Optimistic update: the chip changes immediately, Bases re-renders once the note is written
				onEditSelect: (group, fmKey) => this.deps.openSelectPicker(group, fmKey, entry.file, value => {
					renderSelectChip(group, value, this.deps.colors.map, CLASSES.editableProp);
				}),
			});
			this.bindCard(card, entry, column, ctx, root);
		}
	}

	private bindCard(card: HTMLElement, entry: BasesEntry, column: Column, ctx: BoardContext, root: HTMLElement): void {
		card.addEventListener('click', evt => {
			// Shift/Mod-click toggles the note in the selection; a plain click opens it
			if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
				evt.preventDefault();
				evt.stopPropagation();
				this.toggleSelected(entry.file.path);
				return;
			}
			this.openFile(entry.file, evt);
		});
		card.addEventListener('contextmenu', evt => {
			evt.preventDefault();
			evt.stopPropagation();
			const files = this.selection.has(entry.file.path) ? this.selectedFiles() : [entry.file];
			showEntryMenu(evt, {
				app: this.app,
				file: entry.file,
				source: VIEW_ID,
				onRename: () => renameEntryTitle(this.app, card.querySelector<HTMLElement>(`.${CLASSES.cardTitle}`), entry.file),
				deleteCount: files.length,
				onDelete: () => this.confirmDelete(files),
			});
		});
		const title = card.querySelector<HTMLElement>(`.${CLASSES.cardTitle}`);
		title?.addEventListener('mouseover', evt => this.hoverFile(entry.file, evt, title));
		if (!ctx.editable) return;
		attachCardDrag({
			card,
			root,
			fromKey: column.key,
			canOrder: ctx.canOrder,
			onDragState: dragging => this.setDragging(dragging),
			onDrop: (toKey, index, copy) => this.dropCard(entry, column, toKey, index, copy, ctx),
		});
	}

	// ─── Card moves ───────────────────────────────────────────────────────────

	private dropCard(entry: BasesEntry, from: Column, toKey: string, index: number, copy: boolean, ctx: BoardContext): void {
		const to = ctx.columns.find(c => c.key === toKey);
		if (!to) return;
		const changesColumn = to !== from;
		const isCopy = copy && ctx.isList;
		if (changesColumn) {
			void moveEntryValue(this.app, entry.file, ctx.propName, { from: from.label, to: to.label, copy: isCopy, isList: ctx.isList });
		}
		if (!ctx.canOrder) {
			if (!changesColumn) new Notice('Remove the sort to order cards manually.');
			return;
		}
		const columns = new Map(ctx.columns.map(c => [c.key, c.entries.map(e => e.file.path)]));
		this.config.set(OPTION_KEYS.cardOrder, nextCardOrder(this.cardOrder, columns, {
			path: entry.file.path,
			fromKey: from.key,
			toKey,
			index,
			copy: isCopy,
		}));
	}

	private onRename(newPath: string, oldPath: string): void {
		const order = renameInCardOrder(this.cardOrder, oldPath, newPath);
		if (order) this.config.set(OPTION_KEYS.cardOrder, order);
	}

	// ─── Selection ────────────────────────────────────────────────────────────

	private setSelection(paths: string[]): void {
		this.selection = new Set(paths);
		this.applySelection();
	}

	private toggleSelected(path: string): void {
		const next = new Set(this.selection);
		if (next.has(path)) next.delete(path);
		else next.add(path);
		this.selection = next;
		this.marqueeBase = [...next];
		this.applySelection();
	}

	// Every card of a selected note is highlighted, in each of its columns
	private applySelection(): void {
		this.root?.querySelectorAll<HTMLElement>(`.${CLASSES.card}[data-path]`).forEach(card => {
			card.toggleClass(CLASSES.isSelected, this.selection.has(card.dataset.path ?? ''));
		});
	}

	private selectedFiles(): TFile[] {
		return [...this.selection]
			.map(path => this.app.vault.getFileByPath(path))
			.filter((file): file is TFile => !!file);
	}

	private onKeyDown(evt: KeyboardEvent): void {
		if (evt.target !== this.containerEl && (evt.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
		if (evt.key === 'Escape' && this.selection.size) {
			evt.preventDefault();
			this.setSelection([]);
			this.marqueeBase = [];
		} else if ((evt.key === 'Backspace' || evt.key === 'Delete') && this.selection.size) {
			evt.preventDefault();
			this.confirmDelete(this.selectedFiles());
		}
	}

	private confirmDelete(files: TFile[]): void {
		if (!files.length) return;
		new ConfirmDeleteModal(this.app, files, () => {
			files.forEach(file => this.selection.delete(file.path));
			this.marqueeBase = [...this.selection];
			void trashEntries(this.app, files);
		}).open();
	}

	// ─── Columns ──────────────────────────────────────────────────────────────

	// Shown label: the value, or "No <property>" for entries without one
	private columnLabel(column: Column, ctx: BoardContext): string {
		return column.key === NONE_KEY ? `No ${ctx.propertyLabel}` : column.label;
	}

	private columnColor(column: Column): string | null {
		return column.key === NONE_KEY ? null : this.deps.colors.get(column.label);
	}

	private setHidden(label: string, hide: boolean): void {
		const others = this.hiddenList.filter(value => value.toLowerCase() !== label.toLowerCase());
		this.config.set(OPTION_KEYS.hiddenColumns, hide ? [...others, label] : others);
	}

	/** Saves the manual column order with the moved column at its new place. */
	private saveColumnOrder(columns: Column[], moved: Column, index: number): void {
		const order = columns.filter(c => c.key !== NONE_KEY && c !== moved).map(c => c.label);
		order.splice(index, 0, moved.label);
		this.config.set(OPTION_KEYS.columnOrder, order);
	}

	// ─── Actions ──────────────────────────────────────────────────────────────

	private setDragging(dragging: boolean): void {
		this.dragging = dragging;
		if (dragging || !this.pendingRender) return;
		this.pendingRender = false;
		this.render();
	}

	private async createIn(column: Column, ctx: BoardContext): Promise<void> {
		await this.createFileForView(undefined, (fm: Record<string, unknown>) => {
			if (column.key === NONE_KEY) return;
			fm[ctx.propName] = ctx.isList ? [column.label] : column.label;
		});
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

	// ─── Config ───────────────────────────────────────────────────────────────

	private get savedOrder(): string[] {
		const order = this.config.get(OPTION_KEYS.columnOrder);
		return Array.isArray(order) ? order.map(String) : [];
	}

	private get cardOrder() {
		return readCardOrder(this.config.get(OPTION_KEYS.cardOrder));
	}

	private get hiddenList(): string[] {
		const hidden = this.config.get(OPTION_KEYS.hiddenColumns);
		return Array.isArray(hidden) ? hidden.map(String) : [];
	}

	private get hiddenColumns(): Set<string> {
		return new Set(this.hiddenList.map(value => value.toLowerCase()));
	}

	private get columnWidth(): number {
		const width = Number(this.config.get(OPTION_KEYS.columnWidth));
		return Number.isFinite(width) && width > 0 ? width : DEFAULT_COLUMN_WIDTH;
	}

	private get imageAspectRatio(): number {
		const ratio = Number(this.config.get(OPTION_KEYS.imageAspectRatio));
		return Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_IMAGE_ASPECT_RATIO;
	}
}
