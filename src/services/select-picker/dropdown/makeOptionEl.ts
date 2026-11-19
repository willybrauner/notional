import { CLASSES, colorBtnClass } from '../constants';
import { tagColorClass } from '../../colors/constants';
import { openColorPalette } from '../../colors/palette/openColorPalette';

interface MakeOptionElCallbacks {
	onPickColor: (label: string, color: string | null) => void;
}

/**
 * Builds a dropdown option row with optional color chip and color picker button.
 * onClick is invoked when the option is selected (mousedown).
 */
export function makeOptionEl(
	label: string,
	isSelected: boolean,
	onClick: () => Promise<void> | void,
	color: string | null | undefined,
	callbacks: MakeOptionElCallbacks,
): HTMLElement {
	const item = createDiv();
	item.className = CLASSES.option;
	if (isSelected) item.classList.add(CLASSES.isSelected);

	if (color !== undefined) {
		const chip = createSpan();
		chip.className = tagColorClass(color);
		chip.textContent = label;
		item.appendChild(chip);

		const right = createSpan();
		right.className = CLASSES.optionRight;

		const colorBtn = createSpan();
		colorBtn.className = colorBtnClass(color);
		let current = color ?? null;
		colorBtn.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			openColorPalette(colorBtn, current, picked => {
				current = picked;
				chip.className = tagColorClass(picked);
				colorBtn.className = colorBtnClass(picked);
				callbacks.onPickColor(label, picked);
			});
		});

		if (isSelected) {
			const check = createSpan();
			check.className = CLASSES.check;
			check.textContent = '✓';
			right.appendChild(check);
		}
		right.appendChild(colorBtn);
		item.appendChild(right);
	} else {
		item.textContent = label;
	}

	item.addEventListener('mousedown', (e) => {
		e.preventDefault();
		e.stopPropagation();
		void onClick();
	});
	return item;
}
