// =============================================================================
// BOARD FEATURE - Notion-like kanban view for Bases (one column per value)
// =============================================================================

import { Feature } from '../../core/Feature';
import type { FeatureContext } from '../../core/types';
import { registerFeatureBasesView } from '../../shared/entries/lifecycle/registerFeatureBasesView';
import { VIEW_ICON, VIEW_ID, VIEW_NAME } from './constants';
import { getViewOptions } from './options/getViewOptions';
import { BoardView } from './BoardView';
import type { BoardDeps } from './BoardView';

export class BoardFeature extends Feature {
	constructor(ctx: FeatureContext) {
		super(ctx);
	}

	onload() {
		const { colors, icons, selectPicker } = this.ctx.services;
		const deps: BoardDeps = {
			colors,
			iconStore: icons,
			openSelectPicker: (anchor, fmKey, file, onChange) => selectPicker.openPicker(anchor, fmKey, file, onChange),
			getOptions: propName => selectPicker.getOptions(propName),
			onOptionsRead: listener => selectPicker.onActiveFileChange((_file, seedsRead) => { if (seedsRead) listener(); }),
		};
		this.plugin.registerHoverLinkSource(VIEW_ID, { display: VIEW_NAME, defaultMod: true });
		registerFeatureBasesView(this, this.plugin, VIEW_ID, {
			name: VIEW_NAME,
			icon: VIEW_ICON,
			factory: (controller, containerEl) => new BoardView(controller, containerEl, deps),
			options: () => getViewOptions(),
		});
	}
}
