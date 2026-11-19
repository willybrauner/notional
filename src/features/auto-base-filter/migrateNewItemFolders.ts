import { App } from 'obsidian';
import { withNewItemFolder } from '../../utils/withNewItemFolder';

// Sets `newItemFolder` to its own folder on every existing `.base` file.
// Returns the number of files updated.
export async function migrateNewItemFolders(app: App): Promise<number> {
	let updated = 0;
	for (const file of app.vault.getFiles()) {
		if (file.extension !== 'base') continue;
		const content = await app.vault.read(file);
		const next = withNewItemFolder(content, file.parent?.path ?? '');
		if (next === content) continue;
		await app.vault.modify(file, next);
		updated++;
	}
	return updated;
}
