import { CLASSES } from '../constants';
import { dayDiff } from '../dates/dayDiff';
import { isHourScale } from '../layout/isHourScale';
import { timeToX } from '../layout/timeToX';
import type { Range } from '../layout/types';

/**
 * Background layer behind the rows: weekend shading, day and hour separators
 * drawn with CSS gradients (no DOM per day), plus the vertical "today" line
 * (at the current time in the hour zoom).
 */
export function renderGrid(parent: HTMLElement, range: Range, dayWidth: number): HTMLElement {
	const grid = parent.createDiv({ cls: CLASSES.grid });
	grid.style.width = `${range.days * dayWidth}px`;

	const layers: string[] = [];
	const sizes: string[] = [];
	const positions: string[] = [];

	// Weekend shading: a 2-day block repeated every 7 days, aligned on the first Saturday
	if (dayWidth >= 8) {
		const firstSaturday = (6 - range.start.getDay() + 7) % 7;
		layers.push(`linear-gradient(to right, var(--notional-timeline-weekend) 0 ${2 * dayWidth}px, transparent ${2 * dayWidth}px)`);
		sizes.push(`${7 * dayWidth}px 100%`);
		positions.push(`${(firstSaturday - 7) * dayWidth}px 0`);
	}
	// Day separators when days are wide
	if (dayWidth >= 100) {
		layers.push('linear-gradient(to right, var(--notional-timeline-line) 0 1px, transparent 1px)');
		sizes.push(`${dayWidth}px 100%`);
		positions.push('0 0');
	}
	const hours = isHourScale(dayWidth);
	if (hours) {
		layers.push('linear-gradient(to right, var(--notional-timeline-line) 0 1px, transparent 1px)');
		sizes.push(`${dayWidth / 24}px 100%`);
		positions.push('0 0');
	}
	grid.style.backgroundImage = layers.join(', ');
	grid.style.backgroundSize = sizes.join(', ');
	grid.style.backgroundPosition = positions.join(', ');

	const todayIndex = dayDiff(range.start, new Date());
	if (todayIndex >= 0 && todayIndex < range.days) {
		const line = grid.createDiv({ cls: CLASSES.todayLine });
		line.style.left = `${hours ? timeToX(new Date(), range.start, dayWidth) : (todayIndex + 0.5) * dayWidth}px`;
	}
	return grid;
}
