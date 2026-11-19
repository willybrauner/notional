import type { CardOrder } from '../layout/applyCardOrder';

export interface CardMove {
	path: string;
	fromKey: string;
	toKey: string;
	// Position in the target column, among its other cards
	index: number;
	// Card also kept in its column (copy between lists)
	copy: boolean;
}

/**
 * New manual order after a card drop. The columns' current card paths (in
 * displayed order) become their saved order; paths no longer in the view are
 * dropped along the way.
 */
export function nextCardOrder(order: CardOrder, columns: Map<string, string[]>, move: CardMove): CardOrder {
	const next: CardOrder = {};
	const visible = new Set([...columns.values()].flat());
	// Keep the saved orders of the other columns, purged of notes that left the view
	for (const [key, paths] of Object.entries(order)) {
		const kept = paths.filter(path => visible.has(path));
		if (kept.length) next[key] = kept;
	}

	const target = (columns.get(move.toKey) ?? []).filter(path => path !== move.path);
	target.splice(Math.max(0, Math.min(move.index, target.length)), 0, move.path);
	next[move.toKey] = target;

	if (move.fromKey !== move.toKey && !move.copy) {
		const source = (columns.get(move.fromKey) ?? []).filter(path => path !== move.path);
		if (source.length) next[move.fromKey] = source;
		else delete next[move.fromKey];
	}
	return next;
}
