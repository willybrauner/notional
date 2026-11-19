import { Plugin } from 'obsidian';
import { NotionalSettingTab } from './settings/NotionalSettingTab';
import { ColorStore } from './services/colors/ColorStore';
import { IconStore } from './services/icons/IconStore';
import { SelectPicker } from './services/select-picker/SelectPicker';
import { DataStore } from './core/DataStore';
import { FEATURES } from './core/featureRegistry';
import { FeatureManager } from './core/FeatureManager';
import { registerIconPack } from './features/icons/packs/registerIconPack';
import { invalidateRenderedIcons } from './features/icons/packs/invalidateRenderedIcons';
import type { IconPack } from './features/icons/packs/iconPacks';

export default class NotionalPlugin extends Plugin {
	// Turns features on and off while Obsidian runs (settings tab, e2e)
	features!: FeatureManager;
	private icons!: IconStore;

	async onload() {
		// data.json, read before anything uses it
		const data = new DataStore(this);
		await data.load();

		// Services: loaded once, before the features that render icons and chips
		const icons = (this.icons = this.addChild(new IconStore(this.app, data)));
		const colors = new ColorStore(data);
		const selectPicker = this.addChild(new SelectPicker(this.app, colors));

		this.features = new FeatureManager(
			this,
			FEATURES,
			{ app: this.app, plugin: this, services: { icons, colors, selectPicker }, settings: { get: () => data.settings } },
			{
				get: id => data.settings.features[id],
				set: async (id, enabled) => {
					data.settings.features[id] = enabled;
					await data.saveSettings();
				},
			},
		);
		this.features.loadAll();

		this.addSettingTab(new NotionalSettingTab(this.app, this, data.settings, () => data.saveSettings(), this.features));

		// Plugins adding icons (registerIconPack) register again on each load of Notionalize
		this.app.workspace.trigger('notionalize:loaded', this);
	}

	/**
	 * Public API for other plugins: adds icons on top of the bundled ones, same name
	 * = replaced glyph. Returns the function removing them.
	 */
	registerIconPack(pack: IconPack): () => void {
		const refresh = () => {
			invalidateRenderedIcons(activeDocument);
			this.icons.notify();
		};
		const unregister = registerIconPack(pack);
		refresh();
		return () => {
			unregister();
			refresh();
		};
	}
}
