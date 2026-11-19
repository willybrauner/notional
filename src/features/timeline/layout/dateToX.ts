import { dayDiff } from '../dates/dayDiff';

/** X offset (px) of the start of a day, relative to the range start. */
export function dateToX(date: Date, rangeStart: Date, dayWidth: number): number {
	return dayDiff(rangeStart, date) * dayWidth;
}
