import { ATTRS, CLASSES, SELECTORS, TIMINGS } from '../constants';
import { isMobile } from '../../../utils/isMobile';
import { isInColorPalette } from '../../../services/colors/palette/isInColorPalette';
import { isValidSelectNoteProp } from '../render/isValidSelectNoteProp';
import { fmKey as toFmKey } from '../../../services/select-picker/seeds/fmKey';
import type { InteractionDeps } from '../types';

/**
 * Mobile: a tap on a select cell or note property opens the bottom sheet, a
 * double tap starts the inline edit, a tap elsewhere dismisses the picker.
 */
export function handleTouchEnd(e: TouchEvent, deps: InteractionDeps): void {
	const { app, picker, ui, state, enterInlineEdit } = deps;
	if (!isMobile()) return;

	const target = e.target as HTMLElement;

	// Taps inside active pickers: let them through
	if (ui.activeModal?.contains(target) || isInColorPalette(target)) return;

	const td = state.touchStartEl;
	const wasMoved = state.touchMoved;
	state.touchStartEl = null;
	state.touchMoved = false;

	if (wasMoved) return;

	if (!td) {
		if (ui.modalTimer !== null) { window.clearTimeout(ui.modalTimer); ui.modalTimer = null; }
		picker.dismiss();
		return;
	}

	const now = Date.now();
	const isDoubleTap = td === state.lastClickTd && (now - state.lastClickTime) < TIMINGS.doubleTapMs;
	state.lastClickTime = now;
	state.lastClickTd = td;

	const isSelectCell = td.classList.contains(CLASSES.selectCell);

	if (isSelectCell) {
		const rawProp = td.getAttribute(ATTRS.property) ?? '';
		const fmKeyStr = toFmKey(rawProp);
		const sourcePath = td.getAttribute(ATTRS.sourcePath) ?? '';

		const wasSameTd = td === ui.activeTd;
		picker.dismiss();

		if (isDoubleTap) {
			e.preventDefault();
			state.preventNextClick = true;
			enterInlineEdit(td);
			return;
		}

		if (wasSameTd || !rawProp || !sourcePath) return;

		e.preventDefault();
		td.querySelector<HTMLElement>(SELECTORS.contentEditable)?.blur();
		ui.activeTd = td;

		if (ui.modalTimer !== null) window.clearTimeout(ui.modalTimer);
		ui.modalTimer = window.setTimeout(() => {
			ui.modalTimer = null;
			if (!td.classList.contains(CLASSES.isEditing)) {
				picker.show(td, fmKeyStr, sourcePath, 'base');
			}
		}, TIMINGS.dropdownDelayMs);
		return;
	}

	const noteProp = td.classList.contains(CLASSES.selectNoteProp) ? td : null;
	if (noteProp) {
		if (!isValidSelectNoteProp(app, noteProp)) {
			picker.dismiss();
			return;
		}

		const wasSameTd = noteProp === ui.activeTd;
		picker.dismiss();
		if (!target.closest(`.${CLASSES.metadataPropertyValue}`)) return;

		const isDoubleClick = noteProp === state.lastClickTd && (now - state.lastClickTime) < TIMINGS.doubleTapMs;
		state.lastClickTime = now;
		state.lastClickTd = noteProp;

		const propKey = noteProp.getAttribute(ATTRS.propertyKey) ?? '';
		if (!propKey) return;

		e.preventDefault();

		if (isDoubleClick) {
			state.preventNextClick = true;
			enterInlineEdit(noteProp);
			return;
		}

		if (wasSameTd) return;

		noteProp.querySelector<HTMLElement>(SELECTORS.contentEditable)?.blur();
		ui.activeTd = noteProp;

		const activeFile = app.workspace.getActiveFile();
		if (!activeFile) return;
		picker.show(noteProp, propKey, activeFile.path, 'note');
		return;
	}

	picker.dismiss();
}
