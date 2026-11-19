import type { IconStore } from '../../services/icons/IconStore';
import { createIconEl } from './render';
import { CLASSES } from './constants';

// Shared by the suggestion lists showing notes on two lines (title, folder)
const WITH_ICON_CLASS = 'notional-suggestion-with-icon';

/**
 * Note icon at the start of a suggestion item, centered on its title + folder
 * lines. Without a note (new or unresolved name, heading…), an empty slot keeps
 * the titles aligned.
 */
export function prependSuggestionIcon(item: HTMLElement, store: IconStore, path: string | null): void {
	if (!store.shown) return;
	item.addClass(WITH_ICON_CLASS);
	let icon: HTMLElement;
	if (path) {
		icon = createIconEl(store.resolve(path), 'suggestion');
	} else {
		icon = createSpan();
		icon.className = `${CLASSES.icon} ${CLASSES.icon}-suggestion`;
	}
	item.prepend(icon);
}
