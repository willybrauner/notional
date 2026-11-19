import { setIcon } from 'obsidian';
import type { App, WorkspaceLeaf } from 'obsidian';
import { CLASSES } from './constants';

// Icon element of a leaf's tab header: not in the public API
type LeafWithTabIcon = WorkspaceLeaf & { tabHeaderInnerIconEl?: HTMLElement };

/** Gives every tab its Obsidian view icon back (feature turned off). */
export function restoreTabIcons(app: App): void {
	app.workspace.iterateAllLeaves((leaf: LeafWithTabIcon) => {
		const iconEl = leaf.tabHeaderInnerIconEl;
		if (iconEl?.querySelector(`:scope > .${CLASSES.iconTab}`)) setIcon(iconEl, leaf.view.getIcon());
	});
}
