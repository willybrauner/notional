import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Notice,
	TFile,
	normalizePath,
} from 'obsidian';
import { Feature } from '../../core/Feature';
import { ensureInOwnFolder } from '../../utils/folder-management';
import { buildBaseFilterSection, buildBaseInitialContent } from '../../constants/base-filter';
import { DEFAULT_STATUSES } from '../../services/select-picker/constants';

interface FolderPageSuggestion {
	title: string;
	slug: string;
}

interface TriggerConfig {
	// The word after the slash, e.g. "page" or "base"
	keyword: string;
	// Label shown in the suggestion dropdown
	label: string;
	// Placeholder hint when no name has been typed yet
	hint: string;
	// File extension for the created file, defaults to "md"
	extension?: string;
	// Initial file content; defaults to empty. Receives folderPath when it's a function.
	initialContent?: string | ((folderPath: string) => string);
}

const TODO_PROPERTIES_SECTION = `properties:\n  note.status:\n    displayName: "Status"\n    select.options:\n${DEFAULT_STATUSES.map(o => `      - ${o}\n`).join('')}`;
const TODO_TABLE_VIEW = 'views:\n  - type: table\n    name: Table\n    order:\n      - file.name\n      - note.status\n    columnSize:\n      file.name: 300\n      note.Status: 148\n';
const buildTodoInitialContent = (folderPath: string) =>
	`${buildBaseFilterSection(folderPath)}\n${TODO_PROPERTIES_SECTION}\n${TODO_TABLE_VIEW}`;

class FolderPageSuggest extends EditorSuggest<FolderPageSuggestion> {
	private feature: FolderPageFeature;
	private config: TriggerConfig;
	private triggerRe: RegExp;

	constructor(app: App, feature: FolderPageFeature, config: TriggerConfig) {
		super(app);
		this.feature = feature;
		this.config = config;
		this.limit = 1;
		this.triggerRe = new RegExp(`\\/${config.keyword}(?:\\s+(.*))?$`);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const lineUpToCursor = editor.getLine(cursor.line).substring(0, cursor.ch);
		const match = lineUpToCursor.match(this.triggerRe);
		if (!match) return null;

		return {
			start: { line: cursor.line, ch: cursor.ch - match[0].length },
			end: cursor,
			query: match[1] ?? '',
		};
	}

	getSuggestions(context: EditorSuggestContext): FolderPageSuggestion[] {
		const title = context.query.trim();
		return [{ title, slug: title ? title : '' }];
	}

	renderSuggestion(value: FolderPageSuggestion, el: HTMLElement): void {
		el.addClass('folder-page-suggestion');
		if (!value.title) {
			el.createSpan({ text: this.config.hint, cls: 'folder-page-hint' });
			return;
		}
		const wrap = el.createDiv({ cls: 'folder-page-item' });
		wrap.createSpan({ text: `${this.config.label} `, cls: 'folder-page-label' });
		wrap.createEl('strong', { text: value.title });
		wrap.createSpan({ text: ` (${value.slug}/)`, cls: 'folder-page-slug' });
	}

	selectSuggestion(value: FolderPageSuggestion, _evt: MouseEvent | KeyboardEvent): void {
		const ctx = this.context;
		if (!ctx || !value.title || !ctx.file) return;
		const { initialContent = '', extension = 'md' } = this.config;
		void (async () => {
			try {
				const folderPath = await this.feature.createFolderPage(
					value.title,
					value.slug,
					extension,
					initialContent,
					ctx.file,
					ctx.editor,
					ctx.start,
					ctx.end
				);
				if (this.config.keyword === 'todo') {
					await this.feature.createTodoTemplate(folderPath);
				}
			} catch (e) {
				new Notice(`Folder page: ${e instanceof Error ? e.message : String(e)}`);
			}
		})();
	}
}

export class FolderPageFeature extends Feature {
	// Scoped plugin: the suggests are removed with the feature
	onload() {
		this.plugin.registerEditorSuggest(
			new FolderPageSuggest(this.app, this, {
				keyword: 'page',
				label: 'Create folder page',
				hint: 'Folder page — type a name…',
			})
		);
		this.plugin.registerEditorSuggest(
			new FolderPageSuggest(this.app, this, {
				keyword: 'base',
				label: 'Create folder base',
				hint: 'Folder base — type a name…',
				extension: 'base',
				initialContent: buildBaseInitialContent,
			})
		);
		this.plugin.registerEditorSuggest(
			new FolderPageSuggest(this.app, this, {
				keyword: 'todo',
				label: 'Create todo base',
				hint: 'Todo base — type a name…',
				extension: 'base',
				initialContent: buildTodoInitialContent,
			})
		);
	}

	async createFolderPage(
		title: string,
		slug: string,
		extension: string,
		initialContent: string | ((folderPath: string) => string),
		currentFile: TFile,
		editor: Editor,
		start: EditorPosition,
		end: EditorPosition,
	): Promise<string> {
		const parentPath = await ensureInOwnFolder(this.app, currentFile);
		const folderPath = normalizePath(parentPath ? `${parentPath}/${slug}` : slug);
		const filePath   = normalizePath(`${folderPath}/${slug}.${extension}`);
		const content    = typeof initialContent === 'function' ? initialContent(folderPath) : (initialContent ?? '');

		let folderPageFile: TFile;
		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (existing instanceof TFile) {
			folderPageFile = existing;
		} else {
			if (!this.app.vault.getAbstractFileByPath(folderPath)) {
				await this.app.vault.createFolder(folderPath);
			}
			folderPageFile = await this.app.vault.create(filePath, content);
		}

		const link = this.app.fileManager.generateMarkdownLink(
			folderPageFile,
			currentFile.path,
			undefined,
			title
		);
		editor.replaceRange(link, start, end);

		await this.app.workspace.getLeaf(false).openFile(folderPageFile);

		return folderPath;
	}

	async createTodoTemplate(folderPath: string): Promise<void> {
		const templatePath = normalizePath(`${folderPath}/First item.md`);
		const templateContent = `---
status: "Not started"
---

`;
		try {
			await this.app.vault.create(templatePath, templateContent);
		} catch {
			// Silently fail if template already exists
		}
	}
}
