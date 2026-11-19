import { NONE_KEY } from '../constants';
import type { Column } from './types';

/**
 * Column order: "no value" first (only when it has entries), then the manual
 * order saved from header drags, then the property options (select.options of
 * the bases, shown even when empty), then the other values alphabetically.
 */
export function orderColumns(
	columns: Column[],
	savedOrder: string[],
	options: string[],
	direction: 'ASC' | 'DESC',
): Column[] {
	const byKey = new Map(columns.map(column => [column.key, column]));
	for (const option of options) {
		const key = option.toLowerCase();
		if (key && !byKey.has(key)) byKey.set(key, { key, label: option, entries: [] });
	}

	const ordered: Column[] = [];
	const take = (key: string) => {
		const column = byKey.get(key);
		if (!column) return;
		ordered.push(column);
		byKey.delete(key);
	};

	const none = byKey.get(NONE_KEY);
	byKey.delete(NONE_KEY);
	savedOrder.forEach(key => take(key.toLowerCase()));
	options.forEach(option => take(option.toLowerCase()));

	const sign = direction === 'DESC' ? -1 : 1;
	const rest = [...byKey.values()].sort((a, b) => sign * a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));

	return [...(none?.entries.length ? [none] : []), ...ordered, ...rest];
}
