import type { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings/NotionalSettings';
import type { NotionalSettings } from '../settings/NotionalSettings';
import { updatePluginData } from '../utils/updatePluginData';
import { DATA_VERSION } from './constants';

type PluginData = Record<string, unknown>;

/** Keys of data.json owned by the services, next to `version` and `settings`. */
export type StoreKey = 'icons' | 'recentIcons' | 'selectColors';

/**
 * Single entry point of data.json: `{ version, settings: { …, features }, icons,
 * recentIcons, selectColors }`. Every write is a queued read-modify-write
 * (updatePluginData), so the settings, icon and color stores never drop each
 * other's keys.
 */
export class DataStore {
	// Live settings object: the settings tab edits it in place, then saveSettings()
	readonly settings: NotionalSettings = { ...DEFAULT_SETTINGS, features: {} };
	private snapshot: PluginData = {};

	constructor(private readonly plugin: Plugin) {}

	/**
	 * Reads data.json. A fresh install gets the current version written, so a
	 * later shape change knows where the data starts from: a new shape means a
	 * migration from DATA_VERSION, run here, and a bump of DATA_VERSION.
	 */
	async load(): Promise<void> {
		const data = ((await this.plugin.loadData()) as PluginData | null) ?? {};
		if (typeof data.version !== 'number') {
			data.version = DATA_VERSION;
			await updatePluginData(this.plugin, current => { current.version = DATA_VERSION; });
		}
		this.snapshot = data;
		const settings = (data.settings ?? {}) as Partial<NotionalSettings>;
		for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof NotionalSettings)[]) {
			if (key in settings) Object.assign(this.settings, { [key]: settings[key] });
		}
		this.settings.features = { ...(settings.features ?? {}) };
	}

	/** A store's value as loaded (icons, colors). */
	read<T>(key: StoreKey): T | undefined {
		return this.snapshot[key] as T | undefined;
	}

	/** Writes stores' values in one go, keeping every other key. */
	write(values: Partial<Record<StoreKey, unknown>>): Promise<void> {
		Object.assign(this.snapshot, values);
		return updatePluginData(this.plugin, data => { Object.assign(data, values); });
	}

	/** Writes the live settings, keeping stored keys this version doesn't know. */
	saveSettings(): Promise<void> {
		return updatePluginData(this.plugin, data => {
			const stored = (data.settings ?? {}) as PluginData;
			data.settings = { ...stored, ...this.settings };
		});
	}
}
