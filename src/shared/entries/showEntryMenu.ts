import { Menu } from 'obsidian';
import type { App, TFile } from 'obsidian';

export interface EntryMenuOptions {
	app: App;
	file: TFile;
	// View id given to the `file-menu` event (other plugins' items)
	source: string;
	onRename: () => void;
	// Notes deleted by "Delete": the selection when the note is part of it
	deleteCount: number;
	onDelete: () => void;
}

/**
 * Right-click menu of a note in a view listing notes (board card, timeline
 * entry): open actions, rename, delete (the whole selection when the note is
 * in it), then the items other plugins add to file menus.
 */
export function showEntryMenu(evt: MouseEvent, o: EntryMenuOptions): void {
	const menu = new Menu();
	menu.addItem(item => item
		.setTitle('Open in new tab')
		.setIcon('file-plus')
		.setSection('open')
		.onClick(() => void o.app.workspace.openLinkText(o.file.path, '', 'tab')));
	menu.addItem(item => item
		.setTitle('Open to the right')
		.setIcon('separator-vertical')
		.setSection('open')
		.onClick(() => void o.app.workspace.openLinkText(o.file.path, '', 'split')));
	menu.addItem(item => item
		.setTitle('Rename')
		.setIcon('pencil')
		.setSection('action')
		.onClick(o.onRename));
	menu.addItem(item => item
		.setTitle(o.deleteCount > 1 ? `Delete ${o.deleteCount} notes` : 'Delete')
		.setIcon('trash-2')
		.setSection('danger')
		.setWarning(true)
		.onClick(o.onDelete));
	o.app.workspace.trigger('file-menu', menu, o.file, o.source);
	menu.showAtMouseEvent(evt);
}
