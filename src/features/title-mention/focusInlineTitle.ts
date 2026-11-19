import { CLASSES } from './constants';
import { overlayByTitle } from './titleOverlays';

/** Shows the editable inline title (hidden behind the mention overlay), focused with the caret at the end. */
export function focusInlineTitle(titleEl: HTMLElement): void {
	titleEl.removeClass(CLASSES.titleHasMention);
	overlayByTitle.get(titleEl)?.remove();
	overlayByTitle.delete(titleEl);
	titleEl.focus();
	const range = activeDocument.createRange();
	range.selectNodeContents(titleEl);
	range.collapse(false);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}
