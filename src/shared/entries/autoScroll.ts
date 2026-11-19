const EDGE = 48;
const MAX_SPEED = 18;

/**
 * Scrolls the scroller horizontally while the pointer stays near its visible
 * edges (left edge starts after the sticky sidebar). Returns a stop function.
 */
export function autoScroll(
	scroller: HTMLElement,
	leftInset: number,
	getClientX: () => number,
	onScroll: () => void,
): () => void {
	let raf = 0;
	const tick = () => {
		const rect = scroller.getBoundingClientRect();
		const x = getClientX();
		const left = rect.left + leftInset;
		let speed = 0;
		if (x < left + EDGE) speed = -MAX_SPEED * Math.min(1, (left + EDGE - x) / EDGE);
		else if (x > rect.right - EDGE) speed = MAX_SPEED * Math.min(1, (x - (rect.right - EDGE)) / EDGE);
		if (speed !== 0) {
			scroller.scrollLeft += speed;
			onScroll();
		}
		raf = window.requestAnimationFrame(tick);
	};
	raf = window.requestAnimationFrame(tick);
	return () => window.cancelAnimationFrame(raf);
}
