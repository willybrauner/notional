import { addDays } from '../dates/addDays';

/** Day under an X offset (px) relative to the range start. */
export function xToDate(x: number, rangeStart: Date, dayWidth: number): Date {
	return addDays(rangeStart, Math.floor(x / dayWidth));
}
