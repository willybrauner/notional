import { TAbstractFile, TFile, normalizePath } from 'obsidian';
import { Feature } from '../../core/Feature';
import { resolveTokens } from './resolveTokens';
import { scrollOpenViewsToTop } from './scrollOpenViewsToTop';
import { TEMPLATE_BASENAME } from '../../shared/constants';

const TEMPLATE_FILENAME = `${TEMPLATE_BASENAME}.md`;

// A note created empty in a folder starts from the _template.md of that folder
export class NoteTemplateFeature extends Feature {
	onload() {
		// Register inside onLayoutReady: vault.on('create') also fires for every
		// existing file when the vault loads, which would overwrite empty notes.
		this.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on('create', (file: TAbstractFile) => {
					if (file instanceof TFile) {
						void this.onFileCreated(file);
					}
				})
			);
		});
	}

	private async onFileCreated(file: TFile): Promise<void> {
		if (file.extension !== 'md') return;
		if (file.name === TEMPLATE_FILENAME) return;

		const folderPath = file.parent?.path ?? '';
		const templateFile = this.findTemplate(folderPath);

		if (!templateFile) return;

		const content = await this.app.vault.read(file);
		if (content.trim() !== '') return;

		const templateContent = await this.app.vault.read(templateFile);
		const fileNameWithoutExt = file.name.replace(/\.md$/, '');
		await this.app.vault.modify(file, resolveTokens(templateContent, fileNameWithoutExt));
		// Open editors are updated synchronously by modify()
		scrollOpenViewsToTop(this.app, file);

		const newFileName = this.calculateFileName(templateFile.name, folderPath);
		if (newFileName !== null && newFileName !== fileNameWithoutExt) {
			const newPath = normalizePath(`${folderPath}/${newFileName}.md`);
			await this.app.vault.rename(file, newPath);
		}
	}

	private findTemplate(folderPath: string): TFile | null {
		const files = this.app.vault.getFiles();

		for (const f of files) {
			if (f.parent?.path !== folderPath) continue;
			if (!f.name.startsWith(TEMPLATE_BASENAME)) continue;
			if (f.extension !== 'md') continue;
			return f;
		}
		return null;
	}

	// Name given by the template (`_template {{YYYY-MM-DD}}.md` → `2026-10-15`),
	// or null for a plain `_template.md`: the note keeps its own name
	private calculateFileName(templateName: string, folderPath: string): string | null {
		const nameWithoutExt = templateName.replace(/\.md$/, '');

		if (nameWithoutExt === TEMPLATE_BASENAME) {
			return null;
		}

		const baseName = nameWithoutExt.slice(TEMPLATE_BASENAME.length).trimStart();
		const calculatedName = resolveTokens(baseName, '');

		return this.resolveNameConflict(calculatedName, folderPath);
	}

	private resolveNameConflict(baseName: string, folderPath: string): string {
		let finalName = baseName;
		let counter = 1;

		while (this.fileExists(finalName, folderPath)) {
			finalName = `${baseName} ${counter}`;
			counter++;
		}

		return finalName;
	}

	private fileExists(fileName: string, folderPath: string): boolean {
		const searchPath = normalizePath(`${folderPath}/${fileName}.md`);
		return this.app.vault.getAbstractFileByPath(searchPath) instanceof TFile;
	}
}
