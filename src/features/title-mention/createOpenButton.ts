import { setIcon } from 'obsidian';
import type { TFile } from 'obsidian';
import { ATTRS, CLASSES } from './constants';

/**
 * Notion "Open" button of a table name cell: the only way to open a note whose
 * title is a mention alone (the whole title is a chip opening the mentioned note).
 */
export function createOpenButton(file: TFile): HTMLElement {
	const button = createEl('button');
	button.addClass(CLASSES.openButton);
	button.setAttribute(ATTRS.openPath, file.path);
	button.setAttribute('aria-label', `Open ${file.basename}`);
	setIcon(button.createSpan({ cls: CLASSES.openButtonIcon }), 'panel-right');
	button.createSpan({ text: 'Open' });
	return button;
}
