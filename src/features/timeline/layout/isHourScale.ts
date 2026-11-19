import { HOUR_SCALE_MIN_WIDTH } from '../constants';

/** True when hours are wide enough to be labelled and timed items placed at their time. */
export function isHourScale(dayWidth: number): boolean {
	return dayWidth / 24 >= HOUR_SCALE_MIN_WIDTH;
}
