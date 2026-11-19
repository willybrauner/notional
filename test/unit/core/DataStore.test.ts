import { describe, expect, it } from 'vitest';
import type { Plugin } from 'obsidian';
import { DATA_VERSION } from '../../../src/core/constants';
import { DataStore } from '../../../src/core/DataStore';

// Plugin whose loadData/saveData are async, like Obsidian's (disk round trips)
function fakePlugin(initial: Record<string, unknown> | null) {
	let stored = initial === null ? null : JSON.stringify(initial);
	let writes = 0;
	const tick = () => new Promise(resolve => setTimeout(resolve, 1));
	const plugin = {
		loadData: async () => { await tick(); return stored === null ? null : JSON.parse(stored) as unknown; },
		saveData: async (data: unknown) => { await tick(); writes++; stored = JSON.stringify(data); },
	};
	return { plugin: plugin as unknown as Plugin, read: () => JSON.parse(stored ?? 'null') as Record<string, unknown>, writes: () => writes };
}

// A data.json of the current shape
const current = () => ({
	version: DATA_VERSION,
	settings: { webpQuality: 70, features: { icons: true } },
	icons: { 'a.md': { icon: 'rocket', color: 'blue' } },
	selectColors: { 'in progress': 'blue' },
});

describe('DataStore', () => {
	it('writes the current version on a fresh install, with the defaults', async () => {
		const { plugin, read } = fakePlugin(null);
		const store = new DataStore(plugin);
		await store.load();
		expect(read()).toEqual({ version: DATA_VERSION });
		expect(store.settings.convertImagesToWebp).toBe(true);
		expect(store.settings.features).toEqual({});
	});

	it('reads the settings and the stores', async () => {
		const { plugin } = fakePlugin(current());
		const store = new DataStore(plugin);
		await store.load();
		expect(store.settings.webpQuality).toBe(70);
		expect(store.settings.features).toEqual({ icons: true });
		expect(store.read('icons')).toEqual(current().icons);
		expect(store.read('selectColors')).toEqual(current().selectColors);
	});

	it('does not write when the data is already current', async () => {
		const { plugin, writes } = fakePlugin({ version: DATA_VERSION, settings: { webpQuality: 50 }, icons: {} });
		const store = new DataStore(plugin);
		await store.load();
		expect(writes()).toBe(0);
		expect(store.settings.webpQuality).toBe(50);
		expect(store.settings.convertImagesToWebp).toBe(true);
	});

	it('keeps settings, icons and colors when they are saved at the same time', async () => {
		const { plugin, read } = fakePlugin(current());
		const store = new DataStore(plugin);
		await store.load();

		store.settings.webpQuality = 42;
		store.settings.features.icons = false;
		await Promise.all([
			store.saveSettings(),
			store.write({ icons: { 'a.md': { icon: 'star', color: 'default' } }, recentIcons: ['star'] }),
			store.write({ selectColors: { done: 'green' } }),
		]);

		const data = read();
		expect(data.settings).toMatchObject({ webpQuality: 42, features: { icons: false }, convertImagesToWebp: true });
		expect(data.icons).toEqual({ 'a.md': { icon: 'star', color: 'default' } });
		expect(data.recentIcons).toEqual(['star']);
		expect(data.selectColors).toEqual({ done: 'green' });
	});

	it('keeps stored settings this version does not know', async () => {
		const { plugin, read } = fakePlugin({ version: DATA_VERSION, settings: { futureKey: 'x' } });
		const store = new DataStore(plugin);
		await store.load();
		await store.saveSettings();
		expect(read().settings).toMatchObject({ futureKey: 'x' });
	});
});
