import { App, TFile, normalizePath } from 'obsidian';
import { ensureInOwnFolder } from '../../utils/folder-management';

/**
 * Daily notes use Obsidian's own attachment folder setting (and its
 * built-in dedup) instead of the `_assets/` convention, since daily notes
 * aren't reorganized into their own folder.
 */
export async function resolveAssetPath(
	app: App,
	currentFile: TFile,
	filename: string,
	isDaily: boolean
): Promise<string> {
	if (isDaily) {
		return app.fileManager.getAvailablePathForAttachment(filename, currentFile.path);
	}

	const parentPath = await ensureInOwnFolder(app, currentFile);
	const assetsFolder = normalizePath(parentPath ? `${parentPath}/_assets` : '_assets');

	if (!app.vault.getAbstractFileByPath(assetsFolder)) {
		await app.vault.createFolder(assetsFolder);
	}

	const dotIndex = filename.lastIndexOf('.');
	const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
	const ext = dotIndex > 0 ? filename.slice(dotIndex) : '';

	let candidate = normalizePath(`${assetsFolder}/${filename}`);
	let i = 1;
	while (app.vault.getAbstractFileByPath(candidate)) {
		candidate = normalizePath(`${assetsFolder}/${base}-${i}${ext}`);
		i++;
	}
	return candidate;
}
