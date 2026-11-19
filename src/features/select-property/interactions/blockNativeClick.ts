import { CLASSES } from '../constants';
import { isValidSelectNoteProp } from '../render/isValidSelectNoteProp';
import type { InteractionDeps } from '../types';

/** Blocks Obsidian's native click handler on the cells and properties handled here. */
export function blockNativeClick(e: MouseEvent, deps: InteractionDeps): void {
	const { app, state } = deps;
	const target = e.target as HTMLElement;

	// Always let the color palette button through
	if (target.closest(`.${CLASSES.longtextColorButton}`)) return;

	// Block the click event that follows a double-click→inline-edit transition.
	// Only applies to our managed elements — never block clicks on tags, dates,
	// or any unrelated property to avoid side-effects.
	if (state.preventNextClick) {
		state.preventNextClick = false;
		const isOnSelect =
			!!(target.closest(`.${CLASSES.selectCell}`) || target.closest(`.${CLASSES.selectNoteProp}`));
		if (isOnSelect) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
		return;
	}

	const selectCell = target.closest<HTMLElement>(`.${CLASSES.selectCell}`);
	if (selectCell && !selectCell.classList.contains(CLASSES.isEditing)) {
		e.preventDefault();
		e.stopImmediatePropagation();
		return;
	}
	const noteProp = target.closest<HTMLElement>(`.${CLASSES.selectNoteProp}`);
	if (noteProp && !noteProp.classList.contains(CLASSES.isEditing) && isValidSelectNoteProp(app, noteProp)) {
		if (target.closest(`.${CLASSES.internalLink}, a[href]`)) return;
		e.preventDefault();
		e.stopImmediatePropagation();
	}
}
