import type { BasesSortConfig } from 'obsidian';
import { ORDER_PROPERTY_ID } from '../constants';
import type { EntryRow, Row } from './types';

export interface ReorderRun {
	run: EntryRow[];
	// The manual order is sorted descending: values are written in reverse
	descending: boolean;
}

/**
 * Rows a note can be reordered among: the contiguous entries of its group tied
 * with it on every sort criterion placed before the manual order. Null when the
 * manual order isn't part of the view sort, or when the note is alone.
 */
export function findReorderRun(rows: Row[], path: string, sort: BasesSortConfig[]): ReorderRun | null {
	const orderIndex = sort.findIndex(s => s.property === ORDER_PROPERTY_ID);
	const index = rows.findIndex(r => r.kind === 'entry' && r.file.path === path);
	const self = rows[index];
	if (orderIndex < 0 || !self || self.kind !== 'entry') return null;

	const before = sort.slice(0, orderIndex).map(s => s.property);
	const keyOf = (row: EntryRow) => before.map(p => row.entry.getValue(p)?.toString() ?? '').join('\u0000');
	const key = keyOf(self);
	const isTied = (row: Row | undefined): row is EntryRow => row?.kind === 'entry' && keyOf(row) === key;

	let first = index;
	let last = index;
	while (isTied(rows[first - 1])) first--;
	while (isTied(rows[last + 1])) last++;
	if (first === last) return null;

	return {
		run: rows.slice(first, last + 1) as EntryRow[],
		descending: sort[orderIndex]?.direction === 'DESC',
	};
}
