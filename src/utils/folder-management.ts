import { App, TFile, Notice } from 'obsidian';

/**
 * Reorganizes a markdown file into its own folder.
 * Transforms: `parent/note.md` → `parent/note/note.md`
 *
 * If the file is already in its own folder (parent folder name matches file basename),
 * returns the existing parent directory path.
 *
 * @param app - Obsidian App instance
 * @param currentFile - The file to reorganize
 * @returns The path to the folder containing the reorganized file
 * @throws Error if the target path already exists or if the rename fails
 *
 * @example
 * // File: "Projects/MyNote.md" → "Projects/MyNote/MyNote.md"
 * const folderPath = await ensureInOwnFolder(app, file);
 * // folderPath = "Projects/MyNote"
 */
export async function ensureInOwnFolder(app: App, currentFile: TFile): Promise<string> {
	const noteBasename = currentFile.basename;

	const parts = currentFile.path.split('/');
	const parentDir = parts.slice(0, -1).join('/');
	const parentName = parts.length >= 2 ? parts[parts.length - 2] : '';

	if (parentName === noteBasename) {
		return parentDir;
	}

	const newFolderPath = parentDir ? `${parentDir}/${noteBasename}` : noteBasename;
	const newFilePath = `${newFolderPath}/${noteBasename}.md`;

	const conflict = app.vault.getAbstractFileByPath(newFilePath);
	if (conflict instanceof TFile) {
		throw new Error(`Cannot move "${noteBasename}.md": "${newFilePath}" already exists.`);
	}

	if (!app.vault.getAbstractFileByPath(newFolderPath)) {
		await app.vault.createFolder(newFolderPath);
	}

	await app.fileManager.renameFile(currentFile, newFilePath);
	new Notice(`Moved "${noteBasename}.md" → ${newFolderPath}/`);

	return newFolderPath;
}
