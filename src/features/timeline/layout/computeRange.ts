import { RANGE_PADDING_DAYS } from '../constants';
import type { Zoom } from '../constants';
import { addDays } from '../dates/addDays';
import { dayDiff } from '../dates/dayDiff';
import { startOfDay } from '../dates/startOfDay';
import type { Range, Row } from './types';

/**
 * Visible date range: union of all items and today, padded per zoom level.
 * An optional previous range is kept so the timeline never shrinks under the user.
 */
export function computeRange(rows: Row[], zoom: Zoom, previous: Range | null): Range {
	const today = startOfDay(new Date());
	let min = today;
	let max = today;
	for (const row of rows) {
		if (row.kind !== 'entry' || !row.start || !row.end) continue;
		if (row.start < min) min = startOfDay(row.start);
		if (row.end > max) max = startOfDay(row.end);
	}

	const pad = RANGE_PADDING_DAYS[zoom];
	let start = addDays(min, -pad);
	let end = addDays(max, pad);

	if (previous && zoom !== 'all') {
		const prevEnd = addDays(previous.start, previous.days - 1);
		if (previous.start < start) start = previous.start;
		if (prevEnd > end) end = prevEnd;
	}

	return { start, days: dayDiff(start, end) + 1 };
}
