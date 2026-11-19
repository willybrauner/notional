import type { App, TFile, TFolder } from 'obsidian';

// Renames in progress: database-header and auto-rename-parent-folder both call
// this for the same base, the folder is renamed once
const pending = new Map<TFolder, Promise<void>>();

/**
 * Renames the folder of a folder note (`from/from.md`, `from/from.base`) to `to`,
 * when the note's folder is named `from`. Links are updated by Obsidian.
 */
export function renameNoteFolder(app: App, file: TFile, from: string, to: string): Promise<void> {
	const folder = file.parent;
	if (!folder || folder.isRoot()) return Promise.resolve();
	const running = pending.get(folder);
	if (running) return running;
	if (folder.name !== from || from === to) return Promise.resolve();
	const dir = folder.parent && !folder.parent.isRoot() ? `${folder.parent.path}/` : '';
	const rename = app.fileManager.renameFile(folder, `${dir}${to}`).finally(() => pending.delete(folder));
	pending.set(folder, rename);
	return rename;
}
