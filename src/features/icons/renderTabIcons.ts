// =============================================================================
// ICONS FEATURE - Tab headers
// =============================================================================

import { App, WorkspaceLeaf, setIcon } from 'obsidian';
import { IconStore } from '../../services/icons/IconStore';
import { createIconEl } from './render';
import { CLASSES } from './constants';

// Icon element of a leaf's tab header: not in the public API
type LeafWithTabIcon = WorkspaceLeaf & { tabHeaderInnerIconEl?: HTMLElement };

/**
 * Shows the note's chosen icon (or favicon) in its tab header instead of
 * Obsidian's view icon. Obsidian rewrites this element on each header update
 * (file-open, rename…): the next render pass puts our icon back.
 */
export function renderTabIcons(app: App, store: IconStore): void {
	app.workspace.iterateAllLeaves((leaf: LeafWithTabIcon) => {
		const iconEl = leaf.tabHeaderInnerIconEl;
		if (!iconEl) return;
		// From the view state: also covers deferred (not yet loaded) tabs
		const path: unknown = leaf.getViewState().state?.file;
		const config = typeof path === 'string' ? store.resolve(path) : null;
		const existing = iconEl.querySelector<HTMLElement>(`:scope > .${CLASSES.iconTab}`);

		if (!config || config.source === 'default') {
			if (existing) setIcon(iconEl, leaf.view.getIcon());
			return;
		}

		const configKey = `${config.icon}:${config.color}`;
		if (existing?.dataset.notionalConfigKey === configKey) return;
		const icon = createIconEl(config, 'tab');
		icon.dataset.notionalConfigKey = configKey;
		iconEl.replaceChildren(icon);
	});
}
