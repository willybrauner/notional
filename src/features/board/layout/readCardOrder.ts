import type { CardOrder } from './applyCardOrder';

/** The cardOrder option as stored in the .base (ignores malformed values). */
export function readCardOrder(raw: unknown): CardOrder {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const order: CardOrder = {};
	for (const [key, paths] of Object.entries(raw as Record<string, unknown>)) {
		if (Array.isArray(paths)) order[key] = paths.map(String);
	}
	return order;
}
