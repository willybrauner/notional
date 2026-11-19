import type { Plugin } from 'obsidian';

type PluginData = Record<string, unknown>;

const queues = new WeakMap<Plugin, Promise<void>>();

/**
 * Read-modify-write of the plugin's data.json. Writes are queued per plugin so
 * concurrent saves (settings, colors, icons) never drop each other's keys.
 */
export function updatePluginData(plugin: Plugin, update: (data: PluginData) => void): Promise<void> {
	const previous = queues.get(plugin) ?? Promise.resolve();
	const next = previous
		.catch(() => undefined)
		.then(async () => {
			const data = ((await plugin.loadData()) as PluginData | null) ?? {};
			update(data);
			await plugin.saveData(data);
		});
	queues.set(plugin, next);
	return next;
}
