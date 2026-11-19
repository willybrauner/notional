import { TFile, TAbstractFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import { renameNoteFolder } from '../../utils/renameNoteFolder';

// Automatically renames a parent folder when a file is renamed,
// if the parent folder has the same name as the file's original name
export class AutoRenameParentFolderFeature extends Feature {
	onload() {
		this.registerEvent(
			this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
				void this.onFileRenamed(file, oldPath);
			})
		);
	}

	private async onFileRenamed(file: TAbstractFile, oldPath: string) {
		// Only process files, not folders
		if (!(file instanceof TFile)) return;
		const oldFilename = oldPath.split('/').pop() ?? '';
		if (!oldFilename) return;
		const oldBasename = oldFilename.split('.').slice(0, -1).join('.');
		try {
			await renameNoteFolder(this.app, file, oldBasename, file.basename);
		} catch {
			// Silently fail if parent folder rename fails
		}
	}
}
