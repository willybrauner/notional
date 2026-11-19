import { AbstractInputSuggest, prepareFuzzySearch, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import { prependSuggestionIcon } from '../icons/prependSuggestionIcon';
import { CLASSES, MENTION_QUERY_REGEX, SUGGEST_LIMIT, TARGET_EXTENSIONS } from './constants';
import { mentionToken } from './mentionToken';

/**
 * "Link to page" popover of a note title (inline title or base rename input):
 * typing "@query" lists the notes (and bases, canvases); picking one replaces "@query" by "@name",
 * then `onPick` links it (each title saves its new value its own way).
 */
export class MentionSuggest extends AbstractInputSuggest<TFile> {
	// AbstractInputSuggest can't detach from its element: disabled on plugin unload instead
	disposed = false;

	constructor(
		app: App,
		textEl: HTMLInputElement | HTMLDivElement,
		private iconStore: IconStore,
		private getHost: () => TFile | null,
		private onPick: (host: TFile, target: TFile, title: string) => void,
	) {
		super(app, textEl);
		this.limit = SUGGEST_LIMIT;
	}

	protected getSuggestions(value: string): TFile[] {
		if (this.disposed) return [];
		const match = MENTION_QUERY_REGEX.exec(value);
		if (!match) return [];
		const query = match[1]?.trim() ?? '';
		const host = this.getHost();
		const files = this.app.vault.getFiles().filter(f => f !== host && TARGET_EXTENSIONS.includes(f.extension));

		if (!query) {
			const recent = this.app.workspace.getLastOpenFiles()
				.map(path => this.app.vault.getFileByPath(path))
				.filter((f): f is TFile => !!f && TARGET_EXTENSIONS.includes(f.extension) && f !== host);
			return recent.length ? recent.slice(0, SUGGEST_LIMIT) : files.slice(0, SUGGEST_LIMIT);
		}

		const search = prepareFuzzySearch(query);
		return files
			.map(file => ({ file, result: search(file.basename) }))
			.filter((m): m is { file: TFile; result: NonNullable<typeof m.result> } => !!m.result)
			.sort((a, b) => b.result.score - a.result.score)
			.slice(0, SUGGEST_LIMIT)
			.map(m => m.file);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.addClass(CLASSES.suggest);
		prependSuggestionIcon(el, this.iconStore, file.path);
		const content = el.createDiv({ cls: CLASSES.suggestionContent });
		content.createDiv({ cls: CLASSES.suggestionTitle, text: file.basename });
		const folder = file.parent && !file.parent.isRoot() ? file.parent.path.split('/').join(' / ') : '';
		if (folder) content.createDiv({ cls: CLASSES.suggestionPath, text: folder });
	}

	selectSuggestion(target: TFile): void {
		const host = this.getHost();
		const title = this.getValue().replace(MENTION_QUERY_REGEX, mentionToken(target.basename)).trim();
		this.setValue(title);
		this.close();
		if (host) this.onPick(host, target, title);
	}
}
