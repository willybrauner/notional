import type { CardOrder } from '../layout/applyCardOrder';

/** The order with a renamed note's path replaced, or null when it isn't in it. */
export function renameInCardOrder(order: CardOrder, oldPath: string, newPath: string): CardOrder | null {
	let changed = false;
	const next: CardOrder = {};
	for (const [key, paths] of Object.entries(order)) {
		next[key] = paths.map(path => {
			if (path !== oldPath) return path;
			changed = true;
			return newPath;
		});
	}
	return changed ? next : null;
}
