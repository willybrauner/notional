import { ATTRS, CLASSES, SELECTORS, TIMINGS } from '../constants';
import { isMobile } from '../../../utils/isMobile';
import { isInColorPalette } from '../../../services/colors/palette/isInColorPalette';
import { isValidSelectNoteProp } from '../render/isValidSelectNoteProp';
import { fmKey as toFmKey } from '../../../services/select-picker/seeds/fmKey';
import type { InteractionDeps } from '../types';

/**
 * Desktop: a click on a select cell or note property opens the dropdown (after
 * a delay that lets a double-click start the inline edit instead); a click
 * elsewhere dismisses the picker.
 */
export function handleMouseDown(e: MouseEvent, deps: InteractionDeps): void {
	const { app, picker, ui, state, enterInlineEdit } = deps;
	if (isMobile()) return;
	if (ui.activeDropdown?.contains(e.target as Node)) return;
	if (ui.activeModal?.contains(e.target as Node)) return;
	if (isInColorPalette(e.target as Node)) return;

	const target = e.target as HTMLElement;

	if (target.closest(`.${CLASSES.longtextColorButton}`)) {
		picker.dismissDropdown();
		return;
	}

	const td = target.closest<HTMLElement>(`.${CLASSES.selectCell}`);
	if (td) {
		if (td.classList.contains(CLASSES.isEditing)) return;

		const now = Date.now();
		const isDoubleClick = td === state.lastClickTd && (now - state.lastClickTime) < TIMINGS.doubleClickMs;
		state.lastClickTime = now;
		state.lastClickTd = td;

		const rawProp = td.getAttribute(ATTRS.property) ?? '';
		const fmKeyStr = toFmKey(rawProp);
		const sourcePath = td.getAttribute(ATTRS.sourcePath) ??
			td.closest(`[${ATTRS.sourcePath}]`)?.getAttribute(ATTRS.sourcePath) ?? '';

		const wasSameTd = td === ui.activeTd;
		picker.dismiss();

		if (isDoubleClick) {
			e.preventDefault();
			e.stopImmediatePropagation();
			state.preventNextClick = true;
			enterInlineEdit(td);
			return;
		}

		if (wasSameTd || !rawProp || !sourcePath) return;

		e.preventDefault();
		e.stopImmediatePropagation();
		td.querySelector<HTMLElement>(SELECTORS.contentEditable)?.blur();

		ui.dropdownTimer = window.setTimeout(() => {
			ui.dropdownTimer = null;
			if (!td.classList.contains(CLASSES.isEditing)) {
				ui.activeTd = td;
				picker.show(td, fmKeyStr, sourcePath, 'base');
			}
		}, TIMINGS.dropdownDelayMs);
		return;
	}

	const noteProp = target.closest<HTMLElement>(`.${CLASSES.selectNoteProp}`);
	if (noteProp) {
		if (!isValidSelectNoteProp(app, noteProp)) {
			picker.dismiss();
			return;
		}
		if (target.closest(`.${CLASSES.internalLink}, a[href]`)) {
			picker.dismiss();
			return;
		}
		const wasSameTd = noteProp === ui.activeTd;
		picker.dismiss();
		if (!target.closest(`.${CLASSES.metadataPropertyValue}`)) return;

		const now = Date.now();
		const isDoubleClick = noteProp === state.lastClickTd && (now - state.lastClickTime) < TIMINGS.doubleClickMs;
		state.lastClickTime = now;
		state.lastClickTd = noteProp;

		const propKey = noteProp.getAttribute(ATTRS.propertyKey) ?? '';
		if (!propKey) return;

		e.preventDefault();
		e.stopImmediatePropagation();

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
