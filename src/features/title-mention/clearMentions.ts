import type { App } from 'obsidian';
import { ATTRS, CLASSES } from './constants';

/**
 * Gives titles and base links their plain name back (feature turned off):
 * removes the title overlays, the hiding class, the chips of base links and
 * the "Open" buttons.
 */
export function clearMentions(app: App): void {
	activeDocument.querySelectorAll(`.${CLASSES.titleOverlay}, .${CLASSES.openButton}`).forEach(el => el.remove());
	activeDocument.querySelectorAll(`.${CLASSES.titleHasMention}`).forEach(el => el.removeClass(CLASSES.titleHasMention));
	activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.internalLink}[${ATTRS.mentionKey}]`).forEach(link => {
		link.removeAttribute(ATTRS.mentionKey);
		const file = app.metadataCache.getFirstLinkpathDest(link.getAttribute(ATTRS.href) ?? '', '');
		const textEl = link.querySelector<HTMLElement>(`:scope > .${CLASSES.internalLinkText}`) ?? link;
		// Only the chips go: an icon put directly in the link by the icons feature stays
		textEl.querySelectorAll(`:scope > .${CLASSES.mention}`).forEach(chip => chip.remove());
		textEl.normalize();
		const text = Array.from(textEl.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
		text.forEach(node => node.remove());
		textEl.appendText(file?.basename ?? '');
	});
}
