import type { BasesEntry, BasesPropertyId } from 'obsidian';
import { NONE_KEY } from '../constants';
import type { Column } from './types';
import { valueToLabels } from './valueToLabels';

/**
 * Splits the entries into one column per value: an entry with several values
 * (tags, lists) appears in each of their columns. Entries without a value go
 * to the "no value" column. Keeps the Bases sort order inside each column.
 * Values are matched case-insensitively; the first spelling met is the label.
 */
export function buildColumns(entries: BasesEntry[], property: BasesPropertyId): Column[] {
	const columns = new Map<string, Column>();
	const add = (key: string, label: string, entry: BasesEntry) => {
		let column = columns.get(key);
		if (!column) {
			column = { key, label, entries: [] };
			columns.set(key, column);
		}
		if (column.entries[column.entries.length - 1] !== entry) column.entries.push(entry);
	};

	for (const entry of entries) {
		const labels = valueToLabels(entry.getValue(property));
		if (!labels.length) add(NONE_KEY, '', entry);
		for (const label of labels) add(label.toLowerCase(), label, entry);
	}
	return [...columns.values()];
}
