import type { App } from 'obsidian';
import { ATTRS, CLASSES, EXCLUDED_PROPERTY_TYPES, SELECTORS } from '../constants';
import { getColor } from '../../../services/colors/getColor';
import { updateChip } from '../colors/updateChip';

/**
 * Scans the note panel for text properties and marks them as select cells.
 * Injects chips and color attributes where applicable.
 */
export function markNoteProperties(
	container: HTMLElement,
	app: App,
	colorMap: Record<string, string>,
): void {
	const activeFile = app.workspace.getActiveFile();
	const fm = activeFile
		? (app.metadataCache.getFileCache(activeFile)?.frontmatter as Record<string, unknown> | undefined)
		: null;

	container.querySelectorAll<HTMLElement>(`.${CLASSES.metadataProperty}[${ATTRS.propertyKey}]`).forEach(prop => {
		const valueEl = prop.querySelector<HTMLElement>(`.${CLASSES.metadataPropertyValue}`);
		const type = valueEl?.getAttribute(ATTRS.propertyType) ?? '';
		const propKey = prop.getAttribute(ATTRS.propertyKey) ?? '';
		// Multi-value widgets render a .multi-select-container — distinctive marker
		// even when data-property-type momentarily lags during type transitions.
		const isMultiWidget = !!valueEl?.querySelector(`.${CLASSES.multiSelectContainer}`);
		const fmValue = fm && propKey ? fm[propKey] : undefined;
		const isLinkValue = typeof fmValue === 'string' && /^(\[\[|https?:\/\/)/.test(fmValue.trimStart());
		const isText =
			!EXCLUDED_PROPERTY_TYPES.has(type) &&
			!isMultiWidget &&
			!Array.isArray(fmValue) &&
			!isLinkValue &&
			!!valueEl?.querySelector(SELECTORS.contentEditable);
		prop.classList.toggle(CLASSES.selectNoteProp, isText);
		if (isText) {
			const ce = prop.querySelector<HTMLElement>(SELECTORS.metadataPropertyValueCe);
			const value = ce?.textContent?.trim() ?? '';
			updateChip(ce, value, colorMap);
			const propColor = value ? getColor(colorMap, value) : null;
			if (propColor) prop.setAttribute(ATTRS.notionColor, propColor);
			else prop.removeAttribute(ATTRS.notionColor);
			prop.dataset.notionalProp = (prop.getAttribute(ATTRS.propertyKey) ?? '').toLowerCase();
		} else {
			prop.removeAttribute(ATTRS.notionColor);
			prop.querySelector(`.${CLASSES.chip}`)?.remove();
			delete prop.dataset.notionalProp;
		}
	});
}
