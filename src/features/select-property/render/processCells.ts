import { ATTRS, CLASSES, EXCLUDED_PROPERTY_TYPES, SELECTORS } from '../constants';
import { getColor } from '../../../services/colors/getColor';
import { updateChip } from '../colors/updateChip';
import { normalizeKey } from '../../../services/select-picker/seeds/normalizeKey';
import { processRenderedValues } from './processRenderedValues';
import type { App } from 'obsidian';

/**
 * Marks .bases-td cells as select cells and injects value chips.
 * Also processes list/card view rendered values.
 */
export function processCells(
	container: HTMLElement,
	app: App,
	colorMap: Record<string, string>,
	currentBaseSeeds: Record<string, string[]>,
	globalSeeds: Record<string, string[]>,
): void {
	container.querySelectorAll<HTMLElement>(`.${CLASSES.basesTd}[${ATTRS.property}]`).forEach(td => {
		const prop = td.getAttribute(ATTRS.property) ?? '';
		if (prop.startsWith('file.')) {
			td.classList.remove(CLASSES.selectCell);
			td.removeAttribute(ATTRS.notionColor);
			td.querySelector(`.${CLASSES.chip}`)?.remove();
			return;
		}
		// Resolve data-source-path from the file.name cell when not already set
		// (Obsidian Bases doesn't add it natively)
		if (!td.hasAttribute(ATTRS.sourcePath)) {
			const row = td.closest<HTMLElement>(`.${CLASSES.basesTr}`);
			const link = row?.querySelector<HTMLElement>(`[${ATTRS.property}^="file."] ${SELECTORS.internalLinkWithHref}`);
			const sourcePath = link?.getAttribute(ATTRS.href) ?? '';
			if (sourcePath) td.setAttribute(ATTRS.sourcePath, sourcePath);
		}
		const type = td.getAttribute(ATTRS.propertyType) ?? '';
		const isSelect = !EXCLUDED_PROPERTY_TYPES.has(type) && !!td.querySelector(SELECTORS.contentEditable);
		td.classList.toggle(CLASSES.selectCell, isSelect);
		if (isSelect) {
			const ce = td.querySelector<HTMLElement>(SELECTORS.contentEditable);
			const value = ce?.textContent?.trim() ?? '';
			updateChip(ce, value, colorMap);
			const tdColor = value ? getColor(colorMap, value) : null;
			if (tdColor) td.setAttribute(ATTRS.notionColor, tdColor);
			else td.removeAttribute(ATTRS.notionColor);
			td.dataset.notionalProp = normalizeKey(prop);
		} else {
			td.removeAttribute(ATTRS.notionColor);
			td.querySelector(`.${CLASSES.chip}`)?.remove();
			delete td.dataset.notionalProp;
		}
	});
	processRenderedValues(container, app, colorMap, currentBaseSeeds, globalSeeds);
}
