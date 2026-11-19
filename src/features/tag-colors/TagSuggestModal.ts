import { FuzzySuggestModal } from 'obsidian';
import type { App, FuzzyMatch } from 'obsidian';
import { chipClass } from '../../services/colors/constants';
import type { ColorStore } from '../../services/colors/ColorStore';

/** Lists the vault tags (shown with their color) to pick one to color. */
export class TagSuggestModal extends FuzzySuggestModal<string> {
	private colors: ColorStore;
	private onPick: (tag: string) => void;

	constructor(app: App, colors: ColorStore, onPick: (tag: string) => void) {
		super(app);
		this.colors = colors;
		this.onPick = onPick;
		this.setPlaceholder('Choose a tag to color');
	}

	getItems(): string[] {
		// getTags() is not in the public typings: "#tag" → count
		const cache = this.app.metadataCache as unknown as { getTags: () => Record<string, number> };
		return Object.keys(cache.getTags()).map(tag => tag.replace(/^#/, '')).sort((a, b) => a.localeCompare(b));
	}

	getItemText(tag: string): string {
		return tag;
	}

	renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement): void {
		el.createSpan({ cls: chipClass(this.colors.get(match.item)), text: match.item });
	}

	onChooseItem(tag: string): void {
		this.onPick(tag);
	}
}
