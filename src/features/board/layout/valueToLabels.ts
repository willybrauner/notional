import { ListValue } from 'obsidian';
import type { Value } from 'obsidian';

/**
 * Values of a property as column labels: one per list item (tags lose their
 * '#'), a single one for a scalar, none when empty.
 */
export function valueToLabels(value: Value | null): string[] {
	if (!value) return [];
	const items: Value[] = [];
	if (value instanceof ListValue) {
		for (let i = 0; i < value.length(); i++) items.push(value.get(i));
	} else {
		items.push(value);
	}
	return items
		.filter(item => item.isTruthy())
		.map(item => item.toString().replace(/^#/, '').trim())
		.filter(Boolean);
}
