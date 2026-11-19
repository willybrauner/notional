import type { App } from 'obsidian';
import { getTypeManager } from './getTypeManager';

/**
 * Gives the timeline's date properties the "Date & time" type once a time is
 * written: a "Date" property hides the time. Only "Date" or untyped properties
 * are converted, both together so start and end stay the same type.
 */
export function ensureDatetimeTypes(app: App, names: string[]): void {
	const manager = getTypeManager(app);
	if (!manager) return;
	for (const name of names) {
		const widget = manager.getPropertyInfo(name)?.widget;
		if (widget === undefined || widget === 'date') manager.setType(name, 'datetime');
	}
}
