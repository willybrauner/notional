import { LONG_PRESS_MS } from '../constants';
import { DRAG_THRESHOLD } from '../../../shared/constants';

export interface PointerDragHandlers {
	// Whether a press on this target may start a drag
	canStart: (evt: PointerEvent) => boolean;
	onStart: (evt: PointerEvent) => void;
	onMove: (evt: PointerEvent) => void;
	// evt is null when the drag was cancelled (Escape, pointercancel)
	onEnd: (evt: PointerEvent | null) => void;
}

/**
 * Turns a press on the element into a drag: after a small move with a mouse or
 * pen, after a long press with touch (so swipes keep scrolling the board).
 * The click that follows a drag is swallowed.
 */
export function trackPointerDrag(el: HTMLElement, handlers: PointerDragHandlers): void {
	el.addEventListener('pointerdown', down => {
		if (down.button !== 0 || !handlers.canStart(down)) return;
		const isTouch = down.pointerType === 'touch';
		let last = down;
		let armed = !isTouch;
		let dragging = false;
		let timer = 0;

		const begin = () => {
			dragging = true;
			handlers.onStart(last);
		};
		const cleanup = () => {
			window.clearTimeout(timer);
			window.removeEventListener('pointermove', onMove, true);
			window.removeEventListener('pointerup', onUp, true);
			window.removeEventListener('pointercancel', onCancel, true);
			window.removeEventListener('touchmove', onTouchMove, true);
			window.removeEventListener('keydown', onKeyDown, true);
		};
		const onMove = (evt: PointerEvent) => {
			if (evt.pointerId !== down.pointerId) return;
			last = evt;
			const moved = Math.hypot(evt.clientX - down.clientX, evt.clientY - down.clientY) > DRAG_THRESHOLD;
			if (!dragging) {
				// Touch moved before the long press: it is a scroll
				if (!armed && moved) cleanup();
				else if (armed && moved) begin();
				return;
			}
			evt.preventDefault();
			handlers.onMove(evt);
		};
		const onUp = (evt: PointerEvent) => {
			if (evt.pointerId !== down.pointerId) return;
			cleanup();
			if (!dragging) return;
			swallowNextClick();
			handlers.onEnd(evt);
		};
		const onCancel = () => {
			cleanup();
			if (dragging) handlers.onEnd(null);
		};
		// Once dragging (or armed by the long press), touch moves must not scroll
		const onTouchMove = (evt: TouchEvent) => {
			if (armed && isTouch) evt.preventDefault();
		};
		const onKeyDown = (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape' || !dragging) return;
			evt.preventDefault();
			evt.stopPropagation();
			onCancel();
		};

		if (isTouch) {
			timer = window.setTimeout(() => {
				armed = true;
				begin();
			}, LONG_PRESS_MS);
		}
		window.addEventListener('pointermove', onMove, true);
		window.addEventListener('pointerup', onUp, true);
		window.addEventListener('pointercancel', onCancel, true);
		window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
		window.addEventListener('keydown', onKeyDown, true);
	});
}

// The click fired right after a drag must not open the note or a picker
function swallowNextClick(): void {
	const swallow = (evt: MouseEvent) => {
		evt.preventDefault();
		evt.stopPropagation();
	};
	window.addEventListener('click', swallow, { capture: true, once: true });
	window.setTimeout(() => window.removeEventListener('click', swallow, true), 0);
}
