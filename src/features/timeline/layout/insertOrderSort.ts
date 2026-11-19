import type { BasesPropertyId, BasesSortConfig } from 'obsidian';
import { ORDER_PROPERTY_ID } from '../constants';

/**
 * View sort with the manual order added right after the start date criterion,
 * so it only breaks ties between notes of the same day. Null when the view
 * isn't sorted by the start date.
 */
export function insertOrderSort(sort: BasesSortConfig[], startProp: BasesPropertyId | null): BasesSortConfig[] | null {
	const startIndex = sort.findIndex(s => s.property === startProp);
	if (startIndex < 0) return null;
	const next = [...sort];
	next.splice(startIndex + 1, 0, { property: ORDER_PROPERTY_ID, direction: 'ASC' });
	return next;
}
