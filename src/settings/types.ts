import type { App } from 'obsidian';
import type { FeatureManager } from '../core/FeatureManager';
import type { FeatureSection } from '../core/types';
import type { NotionalSettings } from './NotionalSettings';

/** What every part of the settings tab receives. */
export interface SettingsTabContext {
	app: App;
	// Live settings: edit in place, then save()
	settings: NotionalSettings;
	save(): Promise<void>;
	features: FeatureManager;
	// Renders the tab again: a toggle shows or hides sub-settings and warnings
	refresh(): void;
}

/** Settings of a feature, shown under its toggle while it is on. */
export type SubSettingsRenderer = (containerEl: HTMLElement, ctx: SettingsTabContext) => void;

/** One group of the tab: the features of a registry section, and their sub-settings. */
export interface SettingsSection {
	name: FeatureSection;
	subSettings: Partial<Record<string, SubSettingsRenderer>>;
}
