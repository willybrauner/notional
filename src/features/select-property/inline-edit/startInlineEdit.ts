import { CLASSES } from '../constants';

/**
 * Edits the value of a cell or property as text in its [contenteditable],
 * selected, until Enter, Escape or blur (then onBlur). Returns the function
 * ending the edit without onBlur (feature turned off).
 */
export function startInlineEdit(td: HTMLElement, ce: HTMLElement, onBlur: () => void): () => void {
	td.classList.add(CLASSES.isEditing);
	const chip = td.querySelector<HTMLElement>(`.${CLASSES.chip}`);
	if (chip && !ce.textContent?.trim()) {
		ce.textContent = chip.textContent ?? '';
	}
	ce.focus();
	const sel = window.getSelection();
	const range = activeDocument.createRange();
	range.selectNodeContents(ce);
	sel?.removeAllRanges();
	sel?.addRange(range);

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' || e.key === 'Enter') {
			e.preventDefault();
			ce.blur();
		}
	};
	const end = () => {
		td.classList.remove(CLASSES.isEditing);
		ce.removeEventListener('blur', onBlurred);
		ce.removeEventListener('keydown', onKeyDown);
	};
	const onBlurred = () => {
		end();
		onBlur();
	};
	ce.addEventListener('blur', onBlurred);
	ce.addEventListener('keydown', onKeyDown);
	return end;
}
