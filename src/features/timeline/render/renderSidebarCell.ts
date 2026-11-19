import { setIcon } from 'obsidian';
import type { App } from 'obsidian';
import type { IconStore } from '../../../services/icons/IconStore';
import { CLASSES } from '../constants';
import type { Row } from '../layout/types';
import { renderEntryTitle } from '../../../shared/entries/render/renderEntryTitle';

export interface SidebarCellHandlers {
	onOpen: (evt: MouseEvent) => void;
	onHover: (evt: MouseEvent, targetEl: HTMLElement) => void;
	onLocate: () => void;
	onMenu: (evt: MouseEvent, titleEl: HTMLElement) => void;
}

/**
 * Sticky left cell of a row: group label + count, or note title with a
 * "scroll to" button shown on hover.
 */
export function renderSidebarCell(
	app: App,
	rowEl: HTMLElement,
	row: Row,
	iconStore: IconStore,
	handlers: SidebarCellHandlers | null,
): HTMLElement {
	const cell = rowEl.createDiv({ cls: CLASSES.sidebarCell });

	if (row.kind === 'group') {
		cell.createSpan({ cls: CLASSES.sidebarTitle, text: row.label || 'No value' });
		cell.createSpan({ cls: CLASSES.sidebarCount, text: String(row.count) });
		return cell;
	}

	const title = renderEntryTitle(app, cell, row.file, iconStore, CLASSES.sidebarTitle);
	if (!handlers) return cell;

	title.addEventListener('click', handlers.onOpen);
	title.addEventListener('mouseover', evt => handlers.onHover(evt, title));
	title.addEventListener('contextmenu', evt => handlers.onMenu(evt, title));
	if (row.start) {
		const locate = cell.createDiv({ cls: CLASSES.locate, attr: { 'aria-label': 'Scroll to item' } });
		setIcon(locate, 'arrow-right');
		locate.addEventListener('click', handlers.onLocate);
	}
	return cell;
}
