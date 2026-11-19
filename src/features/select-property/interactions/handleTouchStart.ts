import { CLASSES } from '../constants';
import { isMobile } from '../../../utils/isMobile';
import { isValidSelectNoteProp } from '../render/isValidSelectNoteProp';
import type { InteractionDeps } from '../types';

/**
 * Mobile: remembers the select cell or note property a touch starts on. The tap
 * itself is handled on touchend (preventDefault here would stop iOS focusing
 * the [contenteditable] first).
 */
export function handleTouchStart(e: TouchEvent, deps: InteractionDeps): void {
	const { app, ui, state } = deps;
	if (!isMobile()) return;
	const target = e.target as HTMLElement;
	const touch = e.touches[0];

	// Backdrop tap: prevent scroll bleed-through, touchend will dismiss
	if (ui.activeModal && !ui.activeModal.contains(target)) {
		e.preventDefault();
		state.touchStartEl = null;
		return;
	}

	const selectCell = target.closest<HTMLElement>(`.${CLASSES.selectCell}`);
	if (selectCell && !selectCell.classList.contains(CLASSES.isEditing)) {
		state.touchStartEl = selectCell;
		state.touchStartX = touch?.clientX ?? 0;
		state.touchStartY = touch?.clientY ?? 0;
		state.touchMoved = false;
		return;
	}

	const noteProp = target.closest<HTMLElement>(`.${CLASSES.selectNoteProp}`);
	if (noteProp && !noteProp.classList.contains(CLASSES.isEditing) && target.closest(`.${CLASSES.metadataPropertyValue}`) && isValidSelectNoteProp(app, noteProp)) {
		state.touchStartEl = noteProp;
		state.touchStartX = touch?.clientX ?? 0;
		state.touchStartY = touch?.clientY ?? 0;
		state.touchMoved = false;
		return;
	}

	state.touchStartEl = null;
}
