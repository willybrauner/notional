import { DEFAULT_TIMED_MINUTES } from '../constants';
import { addMinutes } from '../dates/addMinutes';

/** End shown for a timed item: its own end, or a default length when it has none (or ends at its start). */
export function timedEnd(start: Date, end: Date): Date {
	return end > start ? end : addMinutes(start, DEFAULT_TIMED_MINUTES);
}
