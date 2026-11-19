import { parsePropertyId } from 'obsidian';
import type { App, BasesPropertyId } from 'obsidian';
import { formatForProperty } from '../dates/formatForProperty';
import { hasTime } from '../dates/hasTime';
import { ensureDatetimeTypes } from './ensureDatetimeTypes';
import type { EntryRow } from '../layout/types';

/**
 * Writes new start/end dates into the note frontmatter, keeping the original
 * format. End is only written when the view has a note end property and the
 * entry already had an end, or the new range spans more than one day.
 * withTime writes datetimes even for a value without a time (hour zoom).
 * Writing a time gives both properties the "Date & time" type.
 */
export async function writeEntryDates(
	app: App,
	row: EntryRow,
	startProp: BasesPropertyId,
	endProp: BasesPropertyId | null,
	start: Date,
	end: Date,
	withTime = false,
): Promise<void> {
	const startName = parsePropertyId(startProp).name;
	const endName = endProp && parsePropertyId(endProp).type === 'note' ? parsePropertyId(endProp).name : null;
	const writesEnd = !!endName && (row.hasEnd || end.getTime() !== start.getTime());
	const startValue = formatForProperty(start, row.startRaw, withTime);
	const endValue = formatForProperty(end, row.endRaw, withTime);

	if (hasTime(startValue) || (writesEnd && hasTime(endValue))) {
		ensureDatetimeTypes(app, endName ? [startName, endName] : [startName]);
	}
	await app.fileManager.processFrontMatter(row.file, (fm: Record<string, unknown>) => {
		fm[startName] = startValue;
		if (endName && writesEnd) fm[endName] = endValue;
	});
}
