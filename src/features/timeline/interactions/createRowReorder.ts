import { CLASSES, ROW_HEIGHT } from '../constants';

// Vertical shift of a row while reordering (read by the stylesheet)
const SHIFT_VAR = '--notional-timeline-reorder-y';

export interface RowReorder {
	// Vertical offset of the pointer since the press
	move: (dy: number) => void;
	// Position of the dragged row in the run once dropped
	targetIndex: () => number;
	reset: () => void;
}

/**
 * Live preview of a vertical reorder among same-height rows: the dragged row
 * follows the pointer (kept within the run), the rows it passes slide by one
 * row to make room.
 */
export function createRowReorder(rowEls: HTMLElement[], fromIndex: number): RowReorder {
	const dragged = rowEls[fromIndex];
	const body = dragged?.parentElement;
	let target = fromIndex;

	dragged?.addClass(CLASSES.isReordering);
	body?.addClass(CLASSES.isReordering);

	return {
		move: (dy) => {
			const offset = Math.max(-fromIndex * ROW_HEIGHT, Math.min(dy, (rowEls.length - 1 - fromIndex) * ROW_HEIGHT));
			target = fromIndex + Math.round(offset / ROW_HEIGHT);
			rowEls.forEach((el, i) => {
				const shift = i === fromIndex ? offset
					: i > fromIndex && i <= target ? -ROW_HEIGHT
						: i < fromIndex && i >= target ? ROW_HEIGHT
							: 0;
				el.style.setProperty(SHIFT_VAR, `${shift}px`);
			});
		},
		targetIndex: () => target,
		reset: () => {
			rowEls.forEach(el => el.style.removeProperty(SHIFT_VAR));
			dragged?.removeClass(CLASSES.isReordering);
			body?.removeClass(CLASSES.isReordering);
		},
	};
}
