import { ATTRS, CLASSES } from '../constants';

/** Gives the cells and note properties marked by the feature their native look back (feature turned off). */
export function clearSelectMarkers(root: ParentNode): void {
	root.querySelectorAll<HTMLElement>(`.${CLASSES.selectCell}, .${CLASSES.selectNoteProp}`).forEach(el => {
		el.classList.remove(CLASSES.selectCell, CLASSES.selectNoteProp, CLASSES.isEditing);
		el.removeAttribute(ATTRS.notionColor);
		delete el.dataset.notionalProp;
		el.querySelectorAll(`.${CLASSES.chip}`).forEach(chip => chip.remove());
	});
	// Set by processCells on every table cell, Bases doesn't use it
	root.querySelectorAll(`.${CLASSES.basesTd}[${ATTRS.sourcePath}]`).forEach(td => td.removeAttribute(ATTRS.sourcePath));
}
