import { CLASSES } from '../constants';

/** Removes select-cell markers and chip from a list/card property element. */
export function clearRenderedValueCell(listProp: HTMLElement | null): void {
	if (!listProp) return;
	listProp.classList.remove(CLASSES.selectCell);
	listProp.removeAttribute('data-notion-color');
	delete listProp.dataset.notionalProp;
	listProp.querySelector(`.${CLASSES.chip}`)?.remove();
}
