import { CLASSES, NOTION_COLORS, swatchClass } from '../constants';

/**
 * Appends the "no color" swatch and one swatch per Notion color to the
 * container. The only swatch UI of the plugin: used in the floating palette
 * and inline in the mobile bottom sheet. Mouse and touch both pick on press
 * release without stealing focus or scrolling.
 */
export function renderSwatches(
	container: HTMLElement,
	current: string | null,
	onPick: (color: string | null) => void,
): void {
	const add = (cls: string, color: string | null) => {
		const swatch = container.createSpan({ cls });
		if (color === current) swatch.addClass(CLASSES.isActive);
		swatch.setAttribute('aria-label', color ?? 'No color');
		const pick = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			onPick(color);
		};
		swatch.addEventListener('mousedown', pick);
		swatch.addEventListener('touchend', pick);
	};

	add(`${CLASSES.swatch} ${CLASSES.swatchNone}`, null);
	for (const color of NOTION_COLORS) add(swatchClass(color), color);
}
