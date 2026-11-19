import { CLASSES } from '../constants';

// Bar width (px) that must stay visible before the label scrolls away
const MIN_VISIBLE = 32;

/**
 * Lets each sticky bar label overflow the bar end by its own width. Reads all
 * widths first, then writes, to trigger a single layout.
 */
export function fitStickyLabels(root: HTMLElement): void {
	const contents = Array.from(root.querySelectorAll<HTMLElement>(`.${CLASSES.barContent}`));
	const widths = contents.map(c => c.querySelector<HTMLElement>(`.${CLASSES.barLabel}`)?.offsetWidth ?? 0);
	contents.forEach((c, i) => {
		c.style.setProperty('--notional-timeline-label-overflow', `${Math.max(0, (widths[i] ?? 0) + 8 - MIN_VISIBLE)}px`);
	});
}
