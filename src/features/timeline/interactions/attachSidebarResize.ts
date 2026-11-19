import { CLASSES } from '../constants';
import { clearBodyDragState } from './clearBodyDragState';

export interface SidebarResizeOptions {
	// The list column starts at its left edge; the handle is added to it
	root: HTMLElement;
	clamp: (width: number) => number;
	onStart: () => void;
	// Live width while dragging
	onResize: (width: number) => void;
	// Called on release; null when the pointer didn't move
	onEnd: (width: number | null) => void;
}

/**
 * Drag handle on the right edge of the list column. Move/up are listened on
 * the window so the drag survives the pointer leaving the thin handle.
 */
export function attachSidebarResize(o: SidebarResizeOptions): void {
	const handle = o.root.createDiv({ cls: CLASSES.sidebarResize });

	handle.addEventListener('pointerdown', (down: PointerEvent) => {
		if (down.button !== 0) return;
		down.preventDefault();
		const left = o.root.getBoundingClientRect().left;
		let width: number | null = null;

		const onMove = (evt: PointerEvent) => {
			width = o.clamp(evt.clientX - left);
			o.onResize(width);
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
			handle.removeClass(CLASSES.isDragging);
			clearBodyDragState();
			o.onEnd(width);
		};

		handle.addClass(CLASSES.isDragging);
		activeDocument.body.addClass(CLASSES.bodyDragging);
		activeDocument.body.dataset.notionalTimelineCursor = 'col-resize';
		o.onStart();
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	});
}
