import { Feature } from '../../core/Feature';
import { CLASSES } from './constants';
import { createIconEl } from '../icons/render';
import { prependSuggestionIcon } from '../icons/prependSuggestionIcon';

export class ReskinSearchFeature extends Feature {
	private readonly store = this.ctx.services.icons;
	private observer: MutationObserver | null = null;

	onload() {
		this.observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (!node.instanceOf(HTMLElement)) continue;
					if (node.classList.contains(CLASSES.obsidianSuggestionItem)) {
						this.processSuggestionItem(node);
					} else {
						node.querySelectorAll<HTMLElement>(`.${CLASSES.obsidianSuggestionItem}`).forEach((item) => {
							this.processSuggestionItem(item);
						});
					}
				}
			}
		});

		this.observer.observe(activeDocument.body, { childList: true, subtree: true });
	}

	// Reskinned items are not restored: suggestion lists are rebuilt on every
	// keystroke, and none is open while the settings tab turns the feature off
	onunload() {
		this.observer?.disconnect();
		this.observer = null;
	}

	private processSuggestionItem(item: HTMLElement) {
		if (item.dataset.notionalSearch) return;
		item.dataset.notionalSearch = '1';

		// Inline link completions ([[…]]) only get the note icon
		if (!item.closest(`.${CLASSES.prompt}`)) {
			if (item.closest(`.${CLASSES.suggestionContainer}`)?.querySelector(`.${CLASSES.promptInstructions}`)) this.addLinkIcon(item);
			return;
		}

		const titleEl = item.querySelector<HTMLElement>(`.${CLASSES.obsidianSuggestionTitle}`);
		const noteEl = item.querySelector<HTMLElement>(`.${CLASSES.obsidianSuggestionNote}`);
		if (!titleEl) return;

		const rawText = titleEl.textContent?.trim() ?? '';
		const lastSlash = rawText.lastIndexOf('/');
		const filename = lastSlash >= 0 ? rawText.slice(lastSlash + 1) : rawText;

		// Command palette items: no .suggestion-note and no path in title — skip
		if (!noteEl && lastSlash < 0) return;

		// Reconstruct full path for icon lookup before we modify the elements
		const noteText = noteEl?.textContent?.trim() ?? '';
		const fullPath = lastSlash >= 0 ? rawText : (noteText ? `${noteText}/${rawText}` : rawText);

		// Strip directory prefix from title if it contains a full path
		if (lastSlash >= 0) {
			const dir = rawText.slice(0, lastSlash);
			titleEl.textContent = filename;
			if (noteEl) {
				noteEl.textContent = dir;
			} else {
				const pathEl = createDiv();
				pathEl.className = `${CLASSES.obsidianSuggestionNote} ${CLASSES.suggestionPath}`;
				pathEl.textContent = dir;
				titleEl.parentElement?.appendChild(pathEl);
			}
		}

		if (noteEl) noteEl.classList.add(CLASSES.suggestionPath);

		item.classList.add(CLASSES.suggestionItem);

		// Resolve actual TFile to get full path with extension (.md is hidden in UI)
		const sourceHint = noteText ? `${noteText}/_` : '';
		const file = this.app.metadataCache.getFirstLinkpathDest(filename, sourceHint);
		const resolvedPath = file?.path ?? fullPath;

		// Inject icon from icon feature (custom, favicon, or default per extension), while it runs
		if (!this.store.shown) return;
		const config = this.store.resolve(resolvedPath);
		const iconEl = createIconEl(config, 'suggestion');
		titleEl.insertBefore(iconEl, titleEl.firstChild);
	}

	// "[[" suggestion: title = note name (extension shown for non-markdown files),
	// note = its folder with a trailing slash. Headings, blocks and unresolved names get an empty slot.
	private addLinkIcon(item: HTMLElement) {
		const name = item.querySelector(`.${CLASSES.obsidianSuggestionTitle}`)?.textContent?.trim() ?? '';
		const folder = item.querySelector(`.${CLASSES.obsidianSuggestionNote}`)?.textContent?.trim() ?? '';
		const file = this.app.vault.getFileByPath(`${folder}${name}.md`) ?? this.app.vault.getFileByPath(`${folder}${name}`);
		prependSuggestionIcon(item, this.store, file?.path ?? null);
	}
}
