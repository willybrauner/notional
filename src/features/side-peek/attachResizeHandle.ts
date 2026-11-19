import { CLASSES } from './constants';

// Drag handle on the panel's left border. The panel is anchored to the right
// edge of the window, so its width is the distance from the pointer to that edge.
// `onResize` runs on each move, `onResizeEnd` once on release.
// Returns the function removing the handle.
export function attachResizeHandle(
	panelEl: HTMLElement,
	onResize: (width: number) => void,
	onResizeEnd: (width: number) => void,
): () => void {
	const handleEl = panelEl.createDiv(CLASSES.resizeHandle);
	const doc = panelEl.ownerDocument;
	let width = 0;

	// Bounds from the panel's CSS min-width / max-width (styles/side-peek.scss),
	// resolved in px for the current window. Max wins over min.
	const clamp = (value: number) => {
		const style = getComputedStyle(panelEl);
		const min = parseFloat(style.minWidth) || 0;
		const max = parseFloat(style.maxWidth) || value;
		return Math.round(Math.min(Math.max(min, value), max));
	};

	// Listened on the document while dragging: the pointer quickly leaves the thin handle
	const onMove = (evt: PointerEvent) => {
		width = clamp((doc.defaultView?.innerWidth ?? 0) - evt.clientX);
		onResize(width);
	};
	const stop = () => {
		doc.removeEventListener('pointermove', onMove);
		doc.removeEventListener('pointerup', onUp);
		doc.removeEventListener('pointercancel', onUp);
		doc.body.removeClass(CLASSES.isResizing);
	};
	const onUp = () => {
		stop();
		if (width) onResizeEnd(width);
		width = 0;
	};

	handleEl.addEventListener('pointerdown', (evt: PointerEvent) => {
		if (evt.button !== 0) return;
		evt.preventDefault();
		doc.body.addClass(CLASSES.isResizing);
		doc.addEventListener('pointermove', onMove);
		doc.addEventListener('pointerup', onUp);
		doc.addEventListener('pointercancel', onUp);
	});

	return () => {
		stop();
		handleEl.remove();
	};
}
