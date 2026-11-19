import type { App, TFile } from 'obsidian';

/** Renames a note in place (same folder, same extension), links updated by Obsidian. */
export async function renameNote(app: App, file: TFile, name: string): Promise<void> {
	const dir = file.parent && !file.parent.isRoot() ? `${file.parent.path}/` : '';
	await app.fileManager.renameFile(file, `${dir}${name}.${file.extension}`);
}
