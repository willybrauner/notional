import { TFile, normalizePath } from 'obsidian';
import type { App } from 'obsidian';
import { ATTRS, CLASSES, EXCLUDED_PROPERTY_TYPES, SELECTORS } from '../constants';
import { getColor } from '../../../services/colors/getColor';
import { updateChip } from '../colors/updateChip';
import { normalizeKey } from '../../../services/select-picker/seeds/normalizeKey';
import { clearRenderedValueCell } from './clearRenderedValueCell';

/**
 * Processes .bases-rendered-value elements (list/card views).
 * These have no data-property attribute so property resolution goes via metadataCache.
 */
export function processRenderedValues(
	container: HTMLElement,
	app: App,
	colorMap: Record<string, string>,
	currentBaseSeeds: Record<string, string[]>,
	globalSeeds: Record<string, string[]>,
): void {
	container.querySelectorAll<HTMLElement>(`.${CLASSES.basesRenderedValue}[${ATTRS.propertyType}]`).forEach(el => {
		if (EXCLUDED_PROPERTY_TYPES.has(el.getAttribute(ATTRS.propertyType) ?? '')) return;

		const value = el.getAttribute(ATTRS.propertyLongtextValue) ?? el.textContent?.trim() ?? '';

		// Card view: .bases-cards-property parent carries data-property directly.
		const cardProp = el.closest<HTMLElement>(`.${CLASSES.basesCardsProperty}`);
		if (cardProp) {
			const rawProp = cardProp.getAttribute(ATTRS.property) ?? '';
			if (rawProp.startsWith('file.')) return;
			if (!value) { clearRenderedValueCell(cardProp); return; }
			cardProp.classList.add(CLASSES.selectCell);
			const cardColor = getColor(colorMap, value);
			if (cardColor) cardProp.setAttribute(ATTRS.notionColor, cardColor);
			else cardProp.removeAttribute(ATTRS.notionColor);
			cardProp.dataset.notionalProp = normalizeKey(rawProp);
			updateChip(el, value, colorMap);
			return;
		}

		// List view: resolve property via frontmatter + .internal-link[data-href].
		const listProp = el.closest<HTMLElement>(`.${CLASSES.basesListProperty}`);
		if (!value) { clearRenderedValueCell(listProp); return; }

		const listItem = el.closest(`.${CLASSES.basesListItem}`);
		const link = listItem?.querySelector<HTMLElement>(SELECTORS.internalLinkWithHref);
		const sourcePath = link?.getAttribute(ATTRS.href) ?? '';
		if (!sourcePath) return;

		const resolvedPath = normalizePath(decodeURIComponent(sourcePath));
		const file = app.vault.getAbstractFileByPath(resolvedPath)
			?? app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) return;

		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) return;

		// Match displayed value to a FM key. Prefer seed-backed (known select); fall back to first match.
		let matchedKey: string | null = null;
		for (const [fmKey, fmVal] of Object.entries(fm)) {
			if (typeof fmVal !== 'string' || fmVal !== value) continue;
			const nk = fmKey.toLowerCase();
			if (globalSeeds[nk] !== undefined || currentBaseSeeds[nk] !== undefined) {
				matchedKey = nk;
				break;
			}
			if (!matchedKey) matchedKey = nk;
		}

		if (!matchedKey || !listProp) { clearRenderedValueCell(listProp); return; }

		listProp.classList.add(CLASSES.selectCell);
		const listColor = getColor(colorMap, value);
		if (listColor) listProp.setAttribute(ATTRS.notionColor, listColor);
		else listProp.removeAttribute(ATTRS.notionColor);
		listProp.dataset.notionalProp = matchedKey;
		updateChip(el, value, colorMap);
	});
}
