import { toMoment } from '../dates/toMoment';
import type { Moment } from '../dates/toMoment';
import { addDays } from '../dates/addDays';
import type { Range } from './types';

export interface Segment {
	date: Date;
	// Index of the first day of the segment in the range
	index: number;
	days: number;
}

/** Splits the range into consecutive segments sharing the same key (month, year, week…). */
export function segments(range: Range, keyOf: (d: Moment) => string): Segment[] {
	const out: Segment[] = [];
	let currentKey = '';
	for (let i = 0; i < range.days; i++) {
		const date = addDays(range.start, i);
		const key = keyOf(toMoment(date));
		const last = out[out.length - 1];
		if (last && key === currentKey) {
			last.days++;
		} else {
			out.push({ date, index: i, days: 1 });
			currentKey = key;
		}
	}
	return out;
}
