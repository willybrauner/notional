import { MIN_ALL_DAY_WIDTH } from '../constants';

/** Day width (px) that fits the whole range into the available width ("All" zoom). */
export function fitAllScale(days: number, availableWidth: number): number {
	return Math.max(MIN_ALL_DAY_WIDTH, availableWidth / Math.max(days, 1));
}
