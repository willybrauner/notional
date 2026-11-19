import { toMoment } from '../dates/toMoment';
import { CLASSES } from '../constants';
import { dayDiff } from '../dates/dayDiff';
import { addDays } from '../dates/addDays';
import { isHourScale } from '../layout/isHourScale';
import { segments } from '../layout/segments';
import { timeToX } from '../layout/timeToX';
import type { Range } from '../layout/types';

type Unit = 'hour' | 'day' | 'week' | 'month';

/** Picks the finest tick unit whose labels still fit. */
function unitFor(dayWidth: number): Unit {
	if (isHourScale(dayWidth)) return 'hour';
	if (dayWidth >= 20) return 'day';
	if (dayWidth * 7 >= 28) return 'week';
	return 'month';
}

/**
 * Two-row sticky header: months (or years, or days) on top, days (or hours,
 * weeks, months) below. Today is highlighted with a red pill, like Notion.
 */
export function renderHeader(
	parent: HTMLElement,
	range: Range,
	dayWidth: number,
	corner: (el: HTMLElement) => void,
): HTMLElement {
	const header = parent.createDiv({ cls: CLASSES.header });
	const cornerEl = header.createDiv({ cls: CLASSES.headerCorner });
	corner(cornerEl);

	const strip = header.createDiv({ cls: CLASSES.headerStrip });
	strip.style.width = `${range.days * dayWidth}px`;

	const unit = unitFor(dayWidth);
	const todayIndex = dayDiff(range.start, new Date());

	// Top row: months, or years when ticks are months
	const top = strip.createDiv({ cls: CLASSES.headerMonths });
	const topKey = unit === 'month' ? 'YYYY' : unit === 'hour' ? 'YYYY-MM-DD' : 'YYYY-MM';
	const topLabel = unit === 'month' ? 'YYYY' : unit === 'hour' ? 'dddd, MMMM D' : 'MMMM YYYY';
	const topSegs = segments(range, m => m.format(topKey));
	for (const seg of topSegs) {
		const el = top.createDiv({ cls: CLASSES.headerMonth });
		el.style.left = `${seg.index * dayWidth}px`;
		el.style.width = `${seg.days * dayWidth}px`;
		el.createSpan({ text: toMoment(seg.date).format(topLabel) });
	}

	// Bottom row: ticks
	const bottom = strip.createDiv({ cls: CLASSES.headerDays });
	if (unit === 'hour') {
		renderHours(bottom, range, dayWidth);
		return header;
	}
	const tickSegs = unit === 'day'
		? segments(range, m => m.format('YYYY-MM-DD'))
		: unit === 'week'
			? segments(range, m => m.format('GGGG-WW'))
			: segments(range, m => m.format('YYYY-MM'));
	const dayFormat = dayWidth >= 100 ? 'ddd D' : 'D';

	for (const seg of tickSegs) {
		const el = bottom.createDiv({ cls: CLASSES.headerDay });
		el.style.left = `${seg.index * dayWidth}px`;
		el.style.width = `${seg.days * dayWidth}px`;
		const m = toMoment(seg.date);
		const label = unit === 'day' ? m.format(dayFormat) : unit === 'week' ? m.format('D MMM') : m.format('MMM');
		const isToday = unit === 'day' && seg.index === todayIndex;
		const isWeekend = unit === 'day' && (m.day() === 0 || m.day() === 6);
		el.toggleClass(CLASSES.isWeekend, isWeekend);
		el.toggleClass(CLASSES.isToday, isToday);
		el.createSpan({ text: label, cls: isToday ? CLASSES.isToday : undefined });
	}

	// Coarser units: mark today with a small dot under the ticks
	if (unit !== 'day' && todayIndex >= 0 && todayIndex < range.days) {
		const dot = bottom.createDiv({ cls: CLASSES.todayDot });
		dot.style.left = `${(todayIndex + 0.5) * dayWidth}px`;
	}

	return header;
}

/** One tick per hour ("3 PM", or "15" in a 24-hour locale), and a dot at the current time. */
function renderHours(bottom: HTMLElement, range: Range, dayWidth: number): void {
	const hourWidth = dayWidth / 24;
	for (let i = 0; i < range.days; i++) {
		const day = addDays(range.start, i);
		for (let h = 0; h < 24; h++) {
			const el = bottom.createDiv({ cls: CLASSES.headerDay });
			el.style.left = `${(i * 24 + h) * hourWidth}px`;
			el.style.width = `${hourWidth}px`;
			const hour = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h);
			el.createSpan({ text: toMoment(hour).format('LT').replace(':00', '') });
		}
	}
	const now = new Date();
	const x = timeToX(now, range.start, dayWidth);
	if (x >= 0 && x < range.days * dayWidth) {
		const dot = bottom.createDiv({ cls: CLASSES.todayDot });
		dot.style.left = `${x}px`;
	}
}
