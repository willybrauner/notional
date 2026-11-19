import { TFile, normalizePath } from 'obsidian';
import type { App } from 'obsidian';

/** The note of a folder, `X/X.md`, or else its base, `X/X.base`. */
export function findFolderNote(app: App, folderPath: string): TFile | null {
	const folderName = folderPath.split('/').pop();
	if (!folderName) return null;
	for (const ext of ['md', 'base']) {
		const file = app.vault.getAbstractFileByPath(normalizePath(`${folderPath}/${folderName}.${ext}`));
		if (file instanceof TFile) return file;
	}
	return null;
}
