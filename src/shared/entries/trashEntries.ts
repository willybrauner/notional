import type { App, TFile } from 'obsidian';

/** Moves the notes to the trash (respects the user's "Deleted files" setting). */
export async function trashEntries(app: App, files: TFile[]): Promise<void> {
	for (const file of files) await app.fileManager.trashFile(file);
}
