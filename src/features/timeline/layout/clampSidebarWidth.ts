import { SIDEBAR_MIN_TRACK, SIDEBAR_MIN_WIDTH } from '../constants';

/** List column width kept between its minimum and the container width minus some visible timeline. */
export function clampSidebarWidth(width: number, containerWidth: number): number {
	return Math.round(Math.max(SIDEBAR_MIN_WIDTH, Math.min(width, containerWidth - SIDEBAR_MIN_TRACK)));
}
