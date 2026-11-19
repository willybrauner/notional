import { CLASSES } from '../constants';

/** Column under a horizontal position (the whole height counts, gaps excluded). */
export function columnAtX(root: HTMLElement, x: number): HTMLElement | null {
	for (const column of Array.from(root.querySelectorAll<HTMLElement>(`.${CLASSES.column}`))) {
		const rect = column.getBoundingClientRect();
		if (x >= rect.left && x <= rect.right) return column;
	}
	return null;
}
