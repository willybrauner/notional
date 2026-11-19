import { CLASSES } from './constants';

// Builds the editable title header. `getName` is read on each edit since the
// view may switch to another base; `onRename` gets the trimmed new name.
export function createHeader(getName: () => string, onRename: (name: string) => Promise<void>): HTMLElement {
	const headerEl = createDiv();
	headerEl.className = CLASSES.header;

	const titleEl = headerEl.createSpan({ cls: CLASSES.title, text: getName() });
	titleEl.contentEditable = 'true';
	titleEl.spellcheck = false;

	titleEl.addEventListener('blur', () => {
		const name = titleEl.textContent?.trim() ?? '';
		if (!name || name === getName()) {
			titleEl.textContent = getName();
			return;
		}
		void onRename(name).catch(() => { titleEl.textContent = getName(); });
	});
	titleEl.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			titleEl.blur();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			titleEl.textContent = getName();
			titleEl.blur();
		}
	});

	return headerEl;
}
