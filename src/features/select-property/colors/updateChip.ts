import { CLASSES } from '../constants';
import { chipClass } from '../../../services/colors/constants';
import { getColor } from '../../../services/colors/getColor';

/**
 * Injects or updates the value chip before the [contenteditable] element inside a cell.
 * Removes the chip if value is empty.
 */
export function updateChip(
	ce: HTMLElement | null,
	value: string,
	colorMap: Record<string, string>,
): void {
	if (!ce?.parentElement) return;
	const parent = ce.parentElement;
	const chip = parent.querySelector<HTMLElement>(`.${CLASSES.chip}`);
	if (!value) {
		chip?.remove();
		return;
	}
	const color = getColor(colorMap, value);
	const newClass = chipClass(color);
	if (chip) {
		if (chip.className !== newClass) chip.className = newClass;
		if (chip.textContent !== value) chip.textContent = value;
	} else {
		const el = createSpan();
		el.className = newClass;
		el.textContent = value;
		parent.insertBefore(el, ce);
	}
}
