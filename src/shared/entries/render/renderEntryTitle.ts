import type { App, TFile } from 'obsidian';
import { createIconEl } from '../../../features/icons/render';
import type { IconStore } from '../../../services/icons/IconStore';
import { renderTitleSegments } from '../../../features/title-mention/renderTitleSegments';

/**
 * Note title with its resolved notional icon (custom, favicon or default page
 * icon, same as the file explorer). As an inline icon carrying the note path,
 * clicking it opens the icon picker like in every other view. Notes mentioned
 * in the title are rendered as chips.
 */
export function renderEntryTitle(app: App, parent: HTMLElement, file: TFile, iconStore: IconStore, cls: string): HTMLElement {
	const el = parent.createSpan({ cls });
	if (iconStore.shown) {
		const icon = createIconEl(iconStore.resolve(file.path), 'inline');
		icon.dataset.notionalPath = file.path;
		el.appendChild(icon);
	}
	renderTitleSegments(el.createSpan(), app, file, iconStore);
	return el;
}
