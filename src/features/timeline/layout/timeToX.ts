import { dayDiff } from '../dates/dayDiff';

/** X offset (px) of an exact time, relative to the range start (DST-safe: counts calendar days, then the time of day). */
export function timeToX(date: Date, rangeStart: Date, dayWidth: number): number {
	const minutes = date.getHours() * 60 + date.getMinutes();
	return (dayDiff(rangeStart, date) + minutes / 1440) * dayWidth;
}
