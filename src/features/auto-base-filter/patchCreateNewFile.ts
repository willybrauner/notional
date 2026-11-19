import type { App, TFile, TFolder } from 'obsidian';
import { buildNewBaseContent } from './buildNewBaseContent';

type CreateNewFile = (parent: TFolder | undefined, name: string | undefined, extension: string | undefined, content?: string) => Promise<TFile>;

// Obsidian creates a new base empty, then opens it right away with its default
// "View" view. Filling the file afterwards (vault `create` event) races with that
// opening: the leaf keeps `viewName: "View"`, which no longer exists ("View not
// found"). Giving the initial content to the creation itself avoids the race.
// Returns the restore function.
export function patchCreateNewFile(app: App): () => void {
	const fileManager = app.fileManager as unknown as { createNewFile: CreateNewFile };
	const original = fileManager.createNewFile;
	fileManager.createNewFile = function (this: unknown, parent, name, extension, content) {
		if (extension === 'base' && !content) {
			const folderPath = (parent ?? app.vault.getRoot()).path;
			content = buildNewBaseContent(folderPath);
		}
		return original.call(this, parent, name, extension, content);
	};
	return () => { fileManager.createNewFile = original; };
}
