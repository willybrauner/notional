import { CLASSES, FILE_EXT, PROCESSED_ATTR } from './constants';

// Gives the processed links under `root` their `.base` back, when the feature is turned off
export function restoreLinks(root: ParentNode): void {
	root.querySelectorAll<HTMLElement>(`[${PROCESSED_ATTR}]`).forEach((link) => {
		link.removeAttribute(PROCESSED_ATTR);
		if (!link.classList.contains(CLASSES.internalLinkBase)) return;
		link.classList.remove(CLASSES.internalLinkBase);
		link.textContent = `${link.textContent ?? ''}${FILE_EXT.base}`;
	});
}
