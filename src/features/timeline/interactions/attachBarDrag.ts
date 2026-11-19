import { CLASSES } from '../constants';
import { DRAG_THRESHOLD } from '../../../shared/constants';
import { autoScroll } from '../../../shared/entries/autoScroll';
import { clearBodyDragState } from './clearBodyDragState';
import type { RowReorder } from './createRowReorder';

type Mode = 'move' | 'start' | 'end' | 'reorder';

const LONG_PRESS_MS = 350;

export interface BarDragOptions {
	bar: HTMLElement;
	scroller: HTMLElement;
	// Snap step of a move (px): a day, or 15 minutes for a timed bar in the hour zoom
	moveStepWidth: number;
	// Snap step of a resize (px): a day, or 15 minutes for any bar in the hour zoom
	resizeStepWidth: number;
	// Number of resize steps covered by the bar
	span: number;
	sidebarWidth: number;
	movable: boolean;
	resizable: boolean;
	// Other bars moved along with this one (selection), queried when a move starts
	getGroup: () => HTMLElement[];
	// Deltas are in move steps for a move (deltaStart === deltaEnd), in resize steps otherwise
	// Live feedback text (e.g. "Aug 27 → Sep 3") for a candidate delta
	describe: (deltaStart: number, deltaEnd: number, groupSize: number) => string;
	onDragStart: () => void;
	// Called once the pointer is released; deltas are 0 when nothing changed
	onDragEnd: (deltaStart: number, deltaEnd: number) => void;
	onClick: (evt: PointerEvent) => void;
	// Vertical drag: preview of a reorder among the note's run, null when not possible
	reorder: () => RowReorder | null;
	// Vertical drag released; the preview is left to the callback
	onReorderEnd: (reorder: RowReorder) => void;
}

/**
 * Pointer interactions on a bar: drag the body to move, drag a handle to
 * resize, or click to open. Snaps to steps, previews live with a date tooltip,
 * auto-scrolls near edges. A mostly vertical drag reorders the note instead. Touch requires a long press so the timeline can
 * still be scrolled by panning.
 */
export function attachBarDrag(o: BarDragOptions): void {
	const { bar, scroller, span } = o;
	const baseLeft = parseFloat(bar.style.left);
	const baseWidth = parseFloat(bar.style.width);

	let mode: Mode = 'move';
	let pointerId = -1;
	let startX = 0;
	let startY = 0;
	let startScroll = 0;
	let clientX = 0;
	let clientY = 0;
	let reorder: RowReorder | null = null;
	// Reorder is asked once per press (it may show a notice)
	let reorderAsked = false;
	let pressed = false;
	let dragging = false;
	let deltaStart = 0;
	let deltaEnd = 0;
	let longPressTimer = 0;
	let stopAutoScroll: (() => void) | null = null;
	let tooltip: HTMLElement | null = null;
	// Bars moved together with this one, with their original left offsets
	let group: { el: HTMLElement; left: number }[] = [];

	const compute = () => {
		const stepWidth = mode === 'move' ? o.moveStepWidth : o.resizeStepWidth;
		const steps = Math.round((clientX - startX + scroller.scrollLeft - startScroll) / stepWidth);
		if (mode === 'move') { deltaStart = steps; deltaEnd = steps; }
		else if (mode === 'start') { deltaStart = Math.min(steps, span - 1); deltaEnd = 0; }
		else { deltaStart = 0; deltaEnd = Math.max(steps, -(span - 1)); }

		bar.style.left = `${baseLeft + deltaStart * stepWidth}px`;
		bar.style.width = `${baseWidth + (deltaEnd - deltaStart) * stepWidth}px`;
		group.forEach(g => { g.el.style.left = `${g.left + deltaStart * stepWidth}px`; });
		if (tooltip) tooltip.setText(o.describe(deltaStart, deltaEnd, group.length + 1));
	};

	const beginDrag = () => {
		dragging = true;
		group = mode === 'move' ? o.getGroup().map(el => ({ el, left: parseFloat(el.style.left) })) : [];
		bar.addClass(CLASSES.isDragging);
		group.forEach(g => g.el.addClass(CLASSES.isDragging));
		activeDocument.body.addClass(CLASSES.bodyDragging);
		activeDocument.body.dataset.notionalTimelineCursor = mode === 'move' ? 'grabbing' : 'ew-resize';
		tooltip = bar.createDiv({ cls: CLASSES.tooltip });
		o.onDragStart();
		stopAutoScroll = autoScroll(scroller, o.sidebarWidth, () => clientX, compute);
		compute();
	};

	const beginReorder = (r: RowReorder) => {
		dragging = true;
		mode = 'reorder';
		reorder = r;
		activeDocument.body.addClass(CLASSES.bodyDragging);
		activeDocument.body.dataset.notionalTimelineCursor = 'grabbing';
		o.onDragStart();
		r.move(clientY - startY);
	};

	// Capture keeps move/up events on the bar even when the pointer leaves it
	const capture = () => {
		try { bar.setPointerCapture(pointerId); } catch { /* pointer already gone */ }
	};

	const reset = () => {
		window.clearTimeout(longPressTimer);
		stopAutoScroll?.();
		stopAutoScroll = null;
		tooltip?.remove();
		tooltip = null;
		bar.removeClass(CLASSES.isDragging);
		group.forEach(g => g.el.removeClass(CLASSES.isDragging));
		clearBodyDragState();
		if (bar.hasPointerCapture(pointerId)) bar.releasePointerCapture(pointerId);
		pressed = false;
	};

	bar.addEventListener('pointerdown', (evt: PointerEvent) => {
		if (evt.button !== 0 || pressed) return;
		const target = evt.target as HTMLElement;
		// Links inside the label and the note icon (icon picker) keep their own behavior
		if (target.closest('a') && !target.closest(`.${CLASSES.barTitle}`)) return;
		if (target.closest(`.${CLASSES.noteIcon}`)) return;
		// Select/status chips open their picker instead
		if (target.closest(`.${CLASSES.editableProp}`)) return;

		mode = target.hasClass(CLASSES.handleStart) ? 'start' : target.hasClass(CLASSES.handleEnd) ? 'end' : 'move';
		pressed = true;
		dragging = false;
		pointerId = evt.pointerId;
		startX = clientX = evt.clientX;
		startY = clientY = evt.clientY;
		reorder = null;
		reorderAsked = false;
		startScroll = scroller.scrollLeft;
		deltaStart = deltaEnd = 0;

		const canDrag = mode === 'move' ? o.movable : o.resizable;
		if (evt.pointerType === 'touch') {
			if (canDrag) longPressTimer = window.setTimeout(() => { capture(); beginDrag(); }, LONG_PRESS_MS);
		} else {
			evt.preventDefault();
			capture();
		}
	});

	// Ends the press: a drag is applied, a plain press opens the note when it's a real click
	const finish = (evt: PointerEvent, isClick: boolean) => {
		const wasDragging = dragging;
		reset();
		if (!wasDragging) { if (isClick) o.onClick(evt); return; }
		dragging = false;
		if (reorder) { o.onReorderEnd(reorder); return; }
		o.onDragEnd(deltaStart, deltaEnd);
	};

	bar.addEventListener('pointermove', (evt: PointerEvent) => {
		if (!pressed || evt.pointerId !== pointerId) return;
		// Release lost (e.g. outside the window): end the gesture instead of staying stuck
		if (evt.pointerType === 'mouse' && evt.buttons === 0) { finish(evt, false); return; }
		clientX = evt.clientX;
		clientY = evt.clientY;
		if (dragging) {
			if (reorder) reorder.move(clientY - startY);
			else compute();
			return;
		}
		const dx = Math.abs(clientX - startX);
		const dy = Math.abs(clientY - startY);
		if (Math.max(dx, dy) <= DRAG_THRESHOLD) return;
		// Touch moved before the long press: let the browser scroll
		if (evt.pointerType === 'touch') { reset(); return; }
		if (mode === 'move' && dy > dx && !reorderAsked) {
			reorderAsked = true;
			const r = o.reorder();
			if (r) { beginReorder(r); return; }
		}
		if (dx <= DRAG_THRESHOLD) return;
		if (mode === 'move' ? o.movable : o.resizable) beginDrag();
	});

	// While dragging on touch, block native panning
	bar.addEventListener('touchmove', (evt: TouchEvent) => { if (dragging) evt.preventDefault(); }, { passive: false });

	bar.addEventListener('pointerup', (evt: PointerEvent) => {
		if (!pressed || evt.pointerId !== pointerId) return;
		finish(evt, true);
	});

	bar.addEventListener('pointercancel', () => {
		if (!pressed) return;
		const wasDragging = dragging;
		reset();
		dragging = false;
		if (reorder) { reorder.reset(); o.onDragEnd(0, 0); return; }
		bar.style.left = `${baseLeft}px`;
		bar.style.width = `${baseWidth}px`;
		group.forEach(g => { g.el.style.left = `${g.left}px`; });
		if (wasDragging) o.onDragEnd(0, 0);
	});
}
