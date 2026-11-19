import { Notice, TFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import { buildNewBaseContent } from './buildNewBaseContent';
import { patchCreateNewFile } from './patchCreateNewFile';
import { withNewItemFolder } from '../../utils/withNewItemFolder';
import { migrateNewItemFolders } from './migrateNewItemFolders';
import { replaceFolderFilter } from './replaceFolderFilter';

/**
 * Automatically applies a folder filter to all `.base` files to show only
 * files in the same folder and direct subfolders, and sets `newItemFolder`
 * so new items created from the base land in that same folder.
 */
export class AutoBaseFilterFeature extends Feature {
	onload() {
		// Restored when the feature is turned off
		this.register(patchCreateNewFile(this.app));

		// After the layout: Obsidian fires `create` for every file while it loads the vault
		this.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on('create', async (file) => {
					if (file instanceof TFile && file.extension === 'base') {
						await this.fillEmptyBase(file);
					}
				})
			);
		});

		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'base') {
					await this.updateBaseFilterPath(file, oldPath);
				}
			})
		);

		// Scoped plugin: the command is removed with the feature
		this.plugin.addCommand({
			id: 'set-base-new-item-folders',
			name: 'Set new item folder on all bases',
			callback: async () => {
				const updated = await migrateNewItemFolders(this.app);
				new Notice(`New item folder set on ${updated} base(s)`);
			},
		});
	}

	// A base created empty by another path than `createNewFile` gets its initial content.
	// A base that arrives with content (sync, git, copy) is left as it is.
	private async fillEmptyBase(file: TFile): Promise<void> {
		const content = await this.app.vault.read(file);
		if (content.trim() !== '') return;
		await this.app.vault.modify(file, buildNewBaseContent(file.parent?.path || ''));
	}

	private async updateBaseFilterPath(file: TFile, oldPath: string): Promise<void> {
		const oldFolderPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
		const newFolderPath = file.parent?.path || '';
		// Checked before the read: a base renamed in place may already be moving
		// on with its folder (database-header, auto-rename-parent-folder)
		if (oldFolderPath === newFolderPath) return;

		const content = await this.app.vault.read(file);

		const updatedContent = withNewItemFolder(replaceFolderFilter(content, newFolderPath), newFolderPath);

		if (updatedContent !== content) {
			await this.app.vault.modify(file, updatedContent);
		}
	}
}
