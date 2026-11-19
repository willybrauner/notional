import { parsePropertyId } from 'obsidian';
import type { App, BasesEntryGroup, BasesPropertyId } from 'obsidian';
import { readEntryDate } from '../dates/readEntryDate';
import type { EntryRow, Row } from './types';

/**
 * Flattens Bases grouped data into timeline rows (one row per entry, plus a
 * header row per group when the view is grouped). Keeps the Bases sort order.
 */
export function buildRows(
	app: App,
	groups: BasesEntryGroup[],
	startProp: BasesPropertyId | null,
	endProp: BasesPropertyId | null,
): Row[] {
	const rows: Row[] = [];
	const isGrouped = groups.length > 1 || groups.some(g => g.hasKey());
	const endIsNote = !!endProp && parsePropertyId(endProp).type === 'note';

	for (const group of groups) {
		if (isGrouped) {
			rows.push({
				kind: 'group',
				label: group.hasKey() ? group.key?.toString() ?? '' : 'No value',
				count: group.entries.length,
			});
		}
		for (const entry of group.entries) {
			const startRead = readEntryDate(app, entry, startProp);
			const endRead = readEntryDate(app, entry, endProp);
			// Only an end: the item sits on that day (a write adds the start)
			const start = startRead ?? endRead;
			// End falls back to start (single-day item) and never precedes it
			const end = startRead && endRead && endRead.date >= startRead.date ? endRead.date : start?.date ?? null;
			const row: EntryRow = {
				kind: 'entry',
				entry,
				file: entry.file,
				title: entry.file.basename,
				start: start?.date ?? null,
				end,
				startRaw: start?.raw ?? null,
				endRaw: endRead?.raw ?? start?.raw ?? null,
				hasEnd: !!endRead,
				timed: !!start?.timed || !!endRead?.timed,
				movable: !!startProp && parsePropertyId(startProp).type === 'note' && (start?.editable ?? true),
				resizable: endIsNote && (start?.editable ?? false),
			};
			rows.push(row);
		}
	}
	return rows;
}
