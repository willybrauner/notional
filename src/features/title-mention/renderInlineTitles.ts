import { MarkdownView } from 'obsidian';
import type { App } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import { ATTRS, CLASSES } from './constants';
import { mentionKey } from './mentionKey';
import { readMentionTargets } from './readMentionTargets';
import { renderTitleSegments } from './renderTitleSegments';
import { overlayByTitle, titleByOverlay } from './titleOverlays';

/**
 * Inline titles of notes with mentions: while not focused, the editable title is
 * hidden behind an overlay rendering the chips, kept right after it. Without
 * mentions, the overlay goes. Overlays left behind by a moved title are removed.
 */
export function renderInlineTitles(app: App, iconStore: IconStore): void {
	app.workspace.iterateAllLeaves(leaf => {
		const view = leaf.view;
		if (!(view instanceof MarkdownView) || !view.file) return;
		const file = view.file;
		const kept = new Set<HTMLElement>();

		view.containerEl.querySelectorAll<HTMLElement>(`.${CLASSES.inlineTitle}`).forEach(titleEl => {
			if (titleEl === activeDocument.activeElement || !readMentionTargets(app, file).length) {
				titleEl.removeClass(CLASSES.titleHasMention);
				return;
			}

			titleEl.addClass(CLASSES.titleHasMention);
			const key = mentionKey(app, file, iconStore);
			let overlay = overlayByTitle.get(titleEl);
			if (overlay?.getAttribute(ATTRS.mentionKey) !== key) {
				overlay = createDiv();
				overlay.addClass(CLASSES.titleOverlay);
				overlay.setAttribute(ATTRS.mentionKey, key);
				renderTitleSegments(overlay, app, file, iconStore);
				overlayByTitle.set(titleEl, overlay);
				titleByOverlay.set(overlay, titleEl);
			}
			if (titleEl.nextElementSibling !== overlay) titleEl.after(overlay);
			kept.add(overlay);
		});

		view.containerEl.querySelectorAll<HTMLElement>(`.${CLASSES.titleOverlay}`).forEach(overlay => {
			if (!kept.has(overlay)) overlay.remove();
		});
	});
}
