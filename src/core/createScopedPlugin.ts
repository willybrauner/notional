import type { Component, Plugin } from 'obsidian';

/**
 * The plugin as seen by one feature: every plugin API (addCommand,
 * registerEditorExtension, registerBasesView…) ends with `this.register(cleanup)`,
 * so routing `register*` to the feature makes all its cleanups run when the
 * feature unloads, not only when the whole plugin does.
 */
export function createScopedPlugin(plugin: Plugin, owner: Component): Plugin {
	const scoped = Object.create(plugin) as Plugin;
	return Object.assign(scoped, {
		register: owner.register.bind(owner),
		registerEvent: owner.registerEvent.bind(owner),
		registerDomEvent: owner.registerDomEvent.bind(owner),
		registerInterval: owner.registerInterval.bind(owner),
		addChild: owner.addChild.bind(owner),
		removeChild: owner.removeChild.bind(owner),
		// data.json bookkeeping (_lastDataModifiedTime) stays on the real plugin
		loadData: plugin.loadData.bind(plugin),
		saveData: plugin.saveData.bind(plugin),
	});
}
