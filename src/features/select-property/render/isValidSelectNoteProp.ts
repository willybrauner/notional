import type { App } from 'obsidian';
import { ATTRS, CLASSES, EXCLUDED_PROPERTY_TYPES } from '../constants';

/**
 * Re-checks at click/touch time whether an element still qualifies as a select property.
 * Removes the class and returns false if the property type has changed since the last scan.
 */
export function isValidSelectNoteProp(app: App, prop: HTMLElement): boolean {
	const valueEl = prop.querySelector<HTMLElement>(`.${CLASSES.metadataPropertyValue}`);
	const type = valueEl?.getAttribute(ATTRS.propertyType) ?? '';
	if (EXCLUDED_PROPERTY_TYPES.has(type)) {
		prop.classList.remove(CLASSES.selectNoteProp);
		return false;
	}
	if (valueEl?.querySelector(`.${CLASSES.multiSelectContainer}`)) {
		prop.classList.remove(CLASSES.selectNoteProp);
		return false;
	}
	const propKey = prop.getAttribute('data-property-key') ?? '';
	const activeFile = app.workspace.getActiveFile();
	const fm = activeFile
		? (app.metadataCache.getFileCache(activeFile)?.frontmatter as Record<string, unknown> | undefined)
		: null;
	const fmValue = fm && propKey ? fm[propKey] : undefined;
	if (Array.isArray(fmValue)) {
		prop.classList.remove(CLASSES.selectNoteProp);
		return false;
	}
	if (typeof fmValue === 'string' && /^(\[\[|https?:\/\/)/.test(fmValue.trimStart())) {
		prop.classList.remove(CLASSES.selectNoteProp);
		return false;
	}
	return true;
}
