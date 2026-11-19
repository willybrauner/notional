import { addDays } from '../dates/addDays';

/** Time under an X offset (px) relative to the range start, floored to a step in minutes. */
export function xToTime(x: number, rangeStart: Date, dayWidth: number, stepMinutes: number): Date {
	const day = Math.floor(x / dayWidth);
	const minutes = Math.floor(((x - day * dayWidth) / dayWidth) * 1440 / stepMinutes) * stepMinutes;
	const date = addDays(rangeStart, day);
	date.setHours(0, minutes, 0, 0);
	return date;
}
