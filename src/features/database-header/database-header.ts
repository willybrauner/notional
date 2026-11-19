import { FileView, TAbstractFile, TFile, TFolder } from 'obsidian';
import { replaceFolderFilter } from '../auto-base-filter/replaceFolderFilter';
import { Feature } from '../../core/Feature';
import { withNewItemFolder } from '../../utils/withNewItemFolder';
import { BASES_VIEW_TYPE, CLASSES } from './constants';
import { createHeader } from './createHeader';
import { renameNote } from '../../utils/renameNote';
import { renameNoteFolder } from '../../utils/renameNoteFolder';

// Adds an editable header to every open database (.base) view, focused or not,
// that allows renaming the base file and its parent folder (if the folder has
// the same name as the old file name)
export class DatabaseHeaderFeature extends Feature {
	// One observer per view content, re-adding the header if Obsidian removes it
	private observers = new Map<HTMLElement, MutationObserver>();

	onload() {
		this.onLayoutReady(() => this.syncHeaders());
		this.registerEvent(this.app.workspace.on('file-open', () => this.syncHeaders()));
		this.registerEvent(this.app.workspace.on('layout-change', () => this.syncHeaders()));

		this.registerEvent(
			this.app.vault.on('rename', (abstractFile: TAbstractFile) => {
				// Update filter expression when a folder is renamed (by the header, or auto-rename-parent-folder)
				if (abstractFile instanceof TFolder) void this.onFolderRenamed(abstractFile);
				// Refresh titles of renamed bases
				else if (abstractFile instanceof TFile && abstractFile.extension === 'base') this.syncHeaders();
			})
		);
	}

	onunload() {
		this.removeHeaders();
	}

	private syncHeaders() {
		for (const leaf of this.app.workspace.getLeavesOfType(BASES_VIEW_TYPE)) {
			// Deferred (never shown) tabs aren't FileViews yet: synced once loaded
			if (leaf.view instanceof FileView && leaf.view.file) this.ensureHeader(leaf.view);
		}
		// Forget closed views
		for (const [contentEl, observer] of this.observers) {
			if (contentEl.isConnected) continue;
			observer.disconnect();
			this.observers.delete(contentEl);
		}
	}

	private ensureHeader(view: FileView) {
		const contentEl = view.contentEl;
		const header = contentEl.querySelector<HTMLElement>(`:scope > .${CLASSES.header}`);
		const getName = () => view.file?.basename ?? '';

		if (header) {
			// Same view, maybe another base or a renamed one (not while editing it)
			const titleEl = header.querySelector<HTMLElement>(`.${CLASSES.title}`);
			if (titleEl && titleEl !== activeDocument.activeElement && titleEl.textContent !== getName()) {
				titleEl.textContent = getName();
			}
			return;
		}

		contentEl.prepend(createHeader(getName, (name) => this.renameBase(view, name)));

		if (this.observers.has(contentEl)) return;
		const observer = new MutationObserver(() => {
			if (!contentEl.querySelector(`:scope > .${CLASSES.header}`)) this.ensureHeader(view);
		});
		observer.observe(contentEl, { childList: true });
		this.observers.set(contentEl, observer);
	}

	// The base, then its folder when named like it (once, also with
	// auto-rename-parent-folder on). The folder last: the handlers of the base
	// rename read it at its new path. onFolderRenamed (vault rename event)
	// updates the filter expression.
	private async renameBase(view: FileView, name: string): Promise<void> {
		const file = view.file;
		if (!file) return;
		const oldName = file.basename;
		await renameNote(this.app, file, name);
		await renameNoteFolder(this.app, file, oldName, name);
	}

	private async onFolderRenamed(folder: TFolder): Promise<void> {
		const newFolderPath = folder.path;
		// Find all .base files inside the renamed folder and update their filter
		// expressions and new item folder
		for (const file of this.app.vault.getFiles()) {
			if (file.extension !== 'base') continue;
			if (!file.path.startsWith(newFolderPath + '/') && file.path !== newFolderPath) continue;
			const content = await this.app.vault.read(file);
			const folderPath = file.parent?.path ?? '';
			const next = withNewItemFolder(replaceFolderFilter(content, folderPath), folderPath);
			if (next === content) continue;
			await this.app.vault.modify(file, next);
		}
	}

	private removeHeaders() {
		for (const [contentEl, observer] of this.observers) {
			observer.disconnect();
			contentEl.querySelector(`:scope > .${CLASSES.header}`)?.remove();
		}
		this.observers.clear();
	}
}
