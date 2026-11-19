import { autoScroll } from '../autoScroll';
import { CLASSES } from '../constants';
import { DRAG_THRESHOLD } from '../../constants';
import { hitTestPaths } from './hitTestPaths';

export interface MarqueeOptions {
	scroller: HTMLElement;
	// Positioned element the rectangle is drawn in (scrolls with the content)
	canvas: HTMLElement;
	// Left part of the scroller hidden under a sticky column (no auto-scroll there)
	leftInset: number;
	// Presses on these keep their own meaning (items, headers…)
	ignoreSelector: string;
	// Selectable elements, carrying data-path
	itemSelector: string;
	onStart: () => void;
	// Live selection while drawing; additive when Shift/Cmd is held
	onSelect: (paths: string[], additive: boolean) => void;
	onEnd: () => void;
	// Plain click on an empty area (no rectangle drawn)
	onEmptyClick: () => void;
}

/**
 * Rubber-band selection on a view background: press on an empty area and drag
 * to draw a rectangle, every item it touches gets selected.
 */
export function attachMarquee(o: MarqueeOptions): void {
	const { scroller, canvas } = o;
	let suppressClickUntil = 0;

	// A drawn rectangle must not also trigger the click (date placement) under the pointer
	scroller.addEventListener('click', evt => {
		if (Date.now() < suppressClickUntil) { evt.stopPropagation(); evt.preventDefault(); }
	}, true);

	scroller.addEventListener('pointerdown', (down: PointerEvent) => {
		if (down.button !== 0 || down.pointerType === 'touch') return;
		if ((down.target as Element).closest(o.ignoreSelector)) return;

		const additive = down.shiftKey || down.metaKey || down.ctrlKey;
		const canvasRect = canvas.getBoundingClientRect();
		// Start point in canvas coordinates (stable while scrolling)
		const startX = down.clientX - canvasRect.left;
		const startY = down.clientY - canvasRect.top;
		let clientX = down.clientX;
		let clientY = down.clientY;
		let box: HTMLElement | null = null;
		let stopAutoScroll: (() => void) | null = null;

		const update = () => {
			if (!box) return;
			const rect = canvas.getBoundingClientRect();
			const x = clientX - rect.left;
			const y = clientY - rect.top;
			const left = Math.min(startX, x);
			const top = Math.min(startY, y);
			box.style.left = `${left}px`;
			box.style.top = `${top}px`;
			box.style.width = `${Math.abs(x - startX)}px`;
			box.style.height = `${Math.abs(y - startY)}px`;
			o.onSelect(hitTestPaths(canvas, o.itemSelector, box.getBoundingClientRect()), additive);
		};

		const onMove = (evt: PointerEvent) => {
			clientX = evt.clientX;
			clientY = evt.clientY;
			if (!box) {
				if (Math.hypot(clientX - down.clientX, clientY - down.clientY) <= DRAG_THRESHOLD) return;
				box = canvas.createDiv({ cls: CLASSES.marquee });
				o.onStart();
				stopAutoScroll = autoScroll(scroller, o.leftInset, () => clientX, update);
			}
			update();
		};

		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			stopAutoScroll?.();
			if (box) {
				box.remove();
				suppressClickUntil = Date.now() + 100;
				o.onEnd();
			} else if (!additive) {
				o.onEmptyClick();
			}
		};

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	});
}
