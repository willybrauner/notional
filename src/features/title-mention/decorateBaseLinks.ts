import type { App } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import { ATTRS, CLASSES } from './constants';
import { createOpenButton } from './createOpenButton';
import { getSoleMentionTarget } from './getSoleMentionTarget';
import { mentionKey } from './mentionKey';
import { readMentionTargets } from './readMentionTargets';
import { renderTitleSegments } from './renderTitleSegments';

/**
 * Renders mention chips in base views (table, list, cards): every internal link
 * showing the name of a note with mentions. Skipped when already up to date.
 * A table cell whose title is a mention alone also gets the "Open" button.
 */
export function decorateBaseLinks(app: App, iconStore: IconStore): void {
	activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.basesView} .${CLASSES.internalLink}[${ATTRS.href}]`).forEach(link => {
		const file = app.metadataCache.getFirstLinkpathDest(link.getAttribute(ATTRS.href) ?? '', '');
		if (!file) return;
		// The icons feature may have wrapped the text in .internal-link-text
		const textEl = link.querySelector<HTMLElement>(`:scope > .${CLASSES.internalLinkText}`) ?? link;
		// Once decorated, the text no longer matches the name (chips drop the "@")
		const decorated = link.hasAttribute(ATTRS.mentionKey);
		if (!decorated && textEl.textContent?.trim() !== file.basename) return;

		if (!decorated && !readMentionTargets(app, file).length) return;
		const key = mentionKey(app, file, iconStore);
		if (link.getAttribute(ATTRS.mentionKey) === key) return;
		link.setAttribute(ATTRS.mentionKey, key);

		// Keep the icon the icons feature put directly in the link
		const icons = textEl === link ? Array.from(link.querySelectorAll(':scope > .notional-icon')) : [];
		textEl.empty();
		icons.forEach(icon => textEl.appendChild(icon));
		renderTitleSegments(textEl, app, file, iconStore);

		const cell = link.closest<HTMLElement>(`.${CLASSES.basesTableCell}`);
		cell?.querySelector(`:scope > .${CLASSES.openButton}`)?.remove();
		if (cell && getSoleMentionTarget(app, file)) cell.appendChild(createOpenButton(file));
	});
}
