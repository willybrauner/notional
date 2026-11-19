import type { App, Plugin } from 'obsidian';
import type { NotionalSettings } from '../settings/NotionalSettings';
import type { ColorStore } from '../services/colors/ColorStore';
import type { IconStore } from '../services/icons/IconStore';
import type { SelectPicker } from '../services/select-picker/SelectPicker';
import type { Feature } from './Feature';

// Groups of the settings tab, in display order
export type FeatureSection = 'Bases' | 'Folder notes' | 'Properties' | 'Icons' | 'Editor' | 'Visual tweaks';

/** Always loaded, shared by the features (never one feature by another). */
export interface Services {
	icons: IconStore;
	colors: ColorStore;
	selectPicker: SelectPicker;
}

/** Live settings: read them on use, they change while the feature runs. */
export interface SettingsAccess {
	get(): NotionalSettings;
}

/** What a feature receives when it is created. */
export interface FeatureContext {
	id: string;
	app: App;
	// The real plugin: a Feature reaches it through its own scoped `plugin`
	plugin: Plugin;
	services: Services;
	settings: SettingsAccess;
}

/** One entry of the feature registry. */
export interface FeatureDefinition {
	// Stable kebab-case id: folder name, data.json key, body class, docs page
	id: string;
	name: string;
	description: string;
	section: FeatureSection;
	docsUrl: string;
	defaultEnabled: boolean;
	desktopOnly: boolean;
	// Ids of the features that must run for this one to run (declared earlier in the registry)
	requires: string[];
	create(ctx: FeatureContext): Feature;
}

/** Where the on/off state of each feature is persisted. */
export interface FeatureStates {
	get(id: string): boolean | undefined;
	set(id: string, enabled: boolean): Promise<void>;
}
