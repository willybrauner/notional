import { App, Plugin, PluginSettingTab } from 'obsidian';
import type { FeatureManager } from '../core/FeatureManager';
import { SETTINGS_SECTIONS } from './constants';
import type { NotionalSettings } from './NotionalSettings';
import { renderSection } from './renderSection';
import type { SettingsTabContext } from './types';

/** Settings → Notionalize: every feature of the registry, grouped by section. */
export class NotionalSettingTab extends PluginSettingTab {
	private readonly ctx: SettingsTabContext;

	constructor(app: App, plugin: Plugin, settings: NotionalSettings, save: () => Promise<void>, features: FeatureManager) {
		super(app, plugin);
		this.ctx = { app, settings, save, features, refresh: () => this.refresh() };
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		for (const section of SETTINGS_SECTIONS) renderSection(containerEl, section, this.ctx);
	}

	// Rendered again in place, at the same scroll position
	private refresh(): void {
		const { scrollTop } = this.containerEl;
		this.display();
		this.containerEl.scrollTop = scrollTop;
	}
}
