// =============================================================================
// TIMELINE FEATURE - Notion-like timeline view for Bases (drag, resize, zoom)
// =============================================================================

import { Feature } from '../../core/Feature';
import type { FeatureContext } from '../../core/types';
import { registerFeatureBasesView } from '../../shared/entries/lifecycle/registerFeatureBasesView';
import { VIEW_ICON, VIEW_ID, VIEW_NAME } from './constants';
import { getViewOptions } from './options/getViewOptions';
import { TimelineView } from './TimelineView';
import type { TimelineDeps } from './TimelineView';

export class TimelineFeature extends Feature {
	constructor(ctx: FeatureContext) {
		super(ctx);
	}

	onload() {
		const { colors, icons, selectPicker } = this.ctx.services;
		const deps: TimelineDeps = {
			getColorMap: () => colors.map,
			iconStore: icons,
			openSelectPicker: (anchor, fmKey, file, onChange) => selectPicker.openPicker(anchor, fmKey, file, onChange),
		};
		this.plugin.registerHoverLinkSource(VIEW_ID, { display: VIEW_NAME, defaultMod: true });
		registerFeatureBasesView(this, this.plugin, VIEW_ID, {
			name: VIEW_NAME,
			icon: VIEW_ICON,
			factory: (controller, containerEl) => new TimelineView(controller, containerEl, deps),
			options: () => getViewOptions(),
		});
	}
}
