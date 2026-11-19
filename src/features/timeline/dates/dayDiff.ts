import { DAY_MS } from '../constants';
import { startOfDay } from './startOfDay';

/** Number of calendar days from a to b (b - a), ignoring time of day. */
export function dayDiff(a: Date, b: Date): number {
	return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}
