import { ListValue, parsePropertyId } from 'obsidian';
import type { BasesEntry, BasesPropertyId } from 'obsidian';

/** True when the property holds lists (tags, multitext): moves edit the list instead of replacing the value. */
export function isListProperty(entries: BasesEntry[], property: BasesPropertyId): boolean {
	const { name } = parsePropertyId(property);
	if (name === 'tags' || name === 'aliases') return true;
	return entries.some(entry => entry.getValue(property) instanceof ListValue);
}
