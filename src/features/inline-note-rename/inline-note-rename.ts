import { TFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import { ATTRS, CLASSES } from './constants';
import { mountRenameInput } from './mountRenameInput';

// Allows renaming notes by double-clicking on a bases table cell (outside the link)
export class InlineNoteRenameFeature extends Feature {
	onload() {
		this.registerDomEvent(activeDocument, 'dblclick', (evt: MouseEvent) => {
			this.handleDoubleClick(evt);
		}, true);
	}

	private handleDoubleClick(evt: MouseEvent) {
		const target = evt.target as HTMLElement;

		// Must be inside a bases cell but NOT on the link itself
		const cell = target.closest(`.${CLASSES.basesTableCell}, .${CLASSES.basesListItem}`) as HTMLElement;
		if (!cell) return;
		if (target.closest(`.${CLASSES.internalLink}, .${CLASSES.mentionOpenButton}`)) return;

		const link = cell.querySelector(`.${CLASSES.internalLink}`) as HTMLElement;
		if (!link) return;

		const dataHref = link.getAttribute(ATTRS.href);
		if (!dataHref) return;

		const file = this.app.metadataCache.getFirstLinkpathDest(dataHref, '');
		if (!(file instanceof TFile)) return;

		evt.preventDefault();

		mountRenameInput({ app: this.app, file, container: cell, hidden: link });
	}
}
