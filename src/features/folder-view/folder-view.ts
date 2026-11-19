import { Feature } from '../../core/Feature';
import { findFolderNote } from '../../utils/findFolderNote';
import { CLASSES } from './constants';

// Clicking a folder in the file explorer opens its folder note
export class FolderViewFeature extends Feature {
	onload() {
		this.registerDomEvent(activeDocument, 'click', (evt: MouseEvent) => {
			this.handleFolderClick(evt);
		}, true);
	}

	private handleFolderClick(evt: MouseEvent) {
		const target = evt.target as HTMLElement;

		// Let chevron clicks pass through to Obsidian's collapse handler
		if (target.closest(`.${CLASSES.collapseIcon}`)) return;

		const folderEl = target.closest(`.${CLASSES.navFolderTitle}`) as HTMLElement;
		if (!folderEl) return;

		const folderPath = folderEl.getAttribute('data-path');
		if (!folderPath) return;

		// Always stop propagation to prevent the wrapper from toggling collapse
		evt.stopPropagation();

		const fileToOpen = findFolderNote(this.app, folderPath);

		if (fileToOpen) {
			void this.app.workspace.getLeaf(false).openFile(fileToOpen);
		}
	}

}
