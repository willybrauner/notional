import type { Column } from './types';

export type CardOrder = Record<string, string[]>;

/**
 * Puts the cards of each column in their manual order: the notes saved for
 * the column first, in that order, then the others in the Bases order.
 */
export function applyCardOrder(columns: Column[], order: CardOrder): void {
	for (const column of columns) {
		const saved = order[column.key];
		if (!saved?.length) continue;
		const rank = new Map(saved.map((path, i) => [path, i]));
		const position = (path: string) => rank.get(path) ?? Number.MAX_SAFE_INTEGER;
		// Array.prototype.sort is stable: unsaved notes keep the Bases order
		column.entries.sort((a, b) => position(a.file.path) - position(b.file.path));
	}
}
