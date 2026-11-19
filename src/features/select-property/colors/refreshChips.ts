import { ATTRS, CLASSES } from '../constants';
import { chipClass } from '../../../services/colors/constants';

/** Applies a value's new color to every visible chip showing that value. */
export function refreshChips(value: string, color: string | null): void {
	const cls = chipClass(color);
	activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.chip}`).forEach(chip => {
		if (chip.textContent?.trim().toLowerCase() !== value.toLowerCase()) return;
		chip.className = cls;
		const cell = chip.closest<HTMLElement>(`.${CLASSES.selectCell}, .${CLASSES.selectNoteProp}`);
		if (color) cell?.setAttribute(ATTRS.notionColor, color);
		else cell?.removeAttribute(ATTRS.notionColor);
	});
}
