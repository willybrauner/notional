import { CLASSES } from '../constants';
import { autoScroll } from '../../../shared/entries/autoScroll';
import { createGhost } from './createGhost';
import type { Ghost } from './createGhost';
import { trackPointerDrag } from './trackPointerDrag';

export interface ColumnDragOptions {
	column: HTMLElement;
	header: HTMLElement;
	// Horizontal scroller, and the content inside it (scrolls with the columns)
	root: HTMLElement;
	canvas: HTMLElement;
	onDragState: (dragging: boolean) => void;
	// Position among the other value columns ("no value" excluded)
	onDrop: (index: number) => void;
}

// Value columns the dragged one can be placed between
function otherColumns(root: HTMLElement, dragged: HTMLElement): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(`.${CLASSES.column}:not(.${CLASSES.isNone})`))
		.filter(column => column !== dragged);
}

/** Reorders columns by dragging their header; a vertical line shows where it lands. */
export function attachColumnDrag(options: ColumnDragOptions): void {
	const { column, header, root, canvas } = options;
	let ghost: Ghost | null = null;
	let indicator: HTMLElement | null = null;
	let index = 0;
	let pointer = { x: 0, y: 0 };
	let stopScroll: (() => void) | null = null;

	const update = () => {
		ghost?.moveTo(pointer.x, pointer.y);
		const others = otherColumns(root, column);
		index = others.filter(other => {
			const rect = other.getBoundingClientRect();
			return rect.left + rect.width / 2 < pointer.x;
		}).length;
		if (!indicator) return;
		const canvasRect = canvas.getBoundingClientRect();
		const ref = others[index] ?? others[others.length - 1];
		if (!ref) return;
		const rect = ref.getBoundingClientRect();
		const gap = parseFloat(getComputedStyle(canvas).columnGap) || 0;
		const edge = others[index] ? rect.left - gap / 2 : rect.right + gap / 2;
		indicator.style.left = `${edge - canvasRect.left}px`;
	};

	trackPointerDrag(header, {
		canStart: evt => !(evt.target as HTMLElement).closest('.clickable-icon'),
		onStart: evt => {
			pointer = { x: evt.clientX, y: evt.clientY };
			ghost = createGhost(header, evt.clientX, evt.clientY);
			indicator = canvas.createDiv({ cls: CLASSES.dropIndicator });
			column.addClass(CLASSES.isDragging);
			activeDocument.body.addClass(CLASSES.bodyDragging);
			stopScroll = autoScroll(root, 0, () => pointer.x, update);
			options.onDragState(true);
			update();
		},
		onMove: evt => {
			pointer = { x: evt.clientX, y: evt.clientY };
			update();
		},
		onEnd: evt => {
			stopScroll?.();
			ghost?.remove();
			ghost = null;
			indicator?.remove();
			indicator = null;
			column.removeClass(CLASSES.isDragging);
			activeDocument.body.removeClass(CLASSES.bodyDragging);
			options.onDragState(false);
			if (evt) options.onDrop(index);
		},
	});
}
