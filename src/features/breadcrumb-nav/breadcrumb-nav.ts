import { FileView } from 'obsidian';
import { Feature } from '../../core/Feature';
import { findFolderNote } from '../../utils/findFolderNote';
import { CLASSES } from './constants';
import { hideDuplicateBreadcrumb } from './hideDuplicateBreadcrumb';

// Clicking a breadcrumb segment opens its folder note; a folder note hides the segment repeating its title
export class BreadcrumbNavFeature extends Feature {
	private hideTimer: number | null = null;

	onload() {
		this.registerDomEvent(activeDocument, 'click', (evt: MouseEvent) => {
			this.handleBreadcrumbClick(evt);
		}, true);

		const update = () => this.scheduleHideDuplicates();
		this.onLayoutReady(update);
		this.registerEvent(this.app.workspace.on('file-open', update));
		this.registerEvent(this.app.workspace.on('layout-change', update));
		this.registerEvent(this.app.vault.on('rename', update));
	}

	// Show the hidden segments again (a pending pass would hide them back)
	onunload() {
		if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
		this.hideTimer = null;
		activeDocument.querySelectorAll(`.${CLASSES.duplicate}`).forEach((el) => el.removeClass(CLASSES.duplicate));
	}

	// After Obsidian has rebuilt the view headers
	private scheduleHideDuplicates() {
		if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
		this.hideTimer = window.setTimeout(() => {
			this.hideTimer = null;
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (leaf.view instanceof FileView) hideDuplicateBreadcrumb(leaf.view);
			});
		});
	}

	private handleBreadcrumbClick(evt: MouseEvent) {
		const target = evt.target as HTMLElement;

		const breadcrumbItem = target.closest(`.${CLASSES.breadcrumb}`) as HTMLElement;
		if (!breadcrumbItem) return;

		const leaf = this.app.workspace.getLeaf(false);
		const file = leaf?.view instanceof FileView ? leaf.view.file : null;
		if (!file) return;

		// Determine which folder was clicked by matching breadcrumb index to file path segments
		const titleParent = breadcrumbItem.closest(`.${CLASSES.breadcrumbParent}`);
		if (!titleParent) return;

		const allBreadcrumbs = Array.from(titleParent.querySelectorAll(`.${CLASSES.breadcrumb}`));
		const index = allBreadcrumbs.indexOf(breadcrumbItem);
		if (index === -1) return;

		const parts = file.path.split('/');
		const folderPath = parts.slice(0, index + 1).join('/');
		const fileToOpen = findFolderNote(this.app, folderPath);

		if (fileToOpen) {
			evt.preventDefault();
			evt.stopPropagation();
			void this.app.workspace.getLeaf(false).openFile(fileToOpen);
		}
	}
}
