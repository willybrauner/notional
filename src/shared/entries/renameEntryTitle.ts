import type { App, TFile } from 'obsidian';
import { mountRenameInput } from '../../features/inline-note-rename/mountRenameInput';

/**
 * Renames a note from its title in a view (board card, timeline entry): an input
 * over the title rendered by `renderEntryTitle` (its text hidden underneath).
 */
export function renameEntryTitle(app: App, titleEl: HTMLElement | null, file: TFile): void {
	const text = titleEl?.lastElementChild;
	if (!titleEl || !text?.instanceOf(HTMLElement)) return;
	mountRenameInput({ app, file, container: titleEl, hidden: text });
}
