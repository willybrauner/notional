import { describe, expect, it } from 'vitest';
import type { Plugin } from 'obsidian';
import { updatePluginData } from '../../../src/utils/updatePluginData';

// Plugin whose loadData/saveData are async, like Obsidian's (disk round trips)
function fakePlugin(initial: Record<string, unknown> | null) {
	let stored = initial === null ? null : JSON.stringify(initial);
	const tick = () => new Promise(resolve => setTimeout(resolve, 1));
	const plugin = {
		loadData: async () => { await tick(); return stored === null ? null : JSON.parse(stored) as unknown; },
		saveData: async (data: unknown) => { await tick(); stored = JSON.stringify(data); },
	};
	return { plugin: plugin as unknown as Plugin, read: () => JSON.parse(stored ?? 'null') as Record<string, unknown> };
}

describe('updatePluginData', () => {
	it('keeps the keys it does not touch', async () => {
		const { plugin, read } = fakePlugin({ icons: { 'a.md': 'star' }, webpQuality: 80 });
		await updatePluginData(plugin, data => { data.webpQuality = 60; });
		expect(read()).toEqual({ icons: { 'a.md': 'star' }, webpQuality: 60 });
	});

	it('starts from an empty object when there is no data yet', async () => {
		const { plugin, read } = fakePlugin(null);
		await updatePluginData(plugin, data => { data.selectColors = {}; });
		expect(read()).toEqual({ selectColors: {} });
	});

	it('serializes concurrent writes so none is lost', async () => {
		const { plugin, read } = fakePlugin({});
		await Promise.all([
			updatePluginData(plugin, data => { data.icons = { 'a.md': 'star' }; }),
			updatePluginData(plugin, data => { data.selectColors = { done: 'green' }; }),
			updatePluginData(plugin, data => { data.webpQuality = 80; }),
		]);
		expect(read()).toEqual({ icons: { 'a.md': 'star' }, selectColors: { done: 'green' }, webpQuality: 80 });
	});

	it('runs the next write after a failed one', async () => {
		const { plugin, read } = fakePlugin({});
		const failing = updatePluginData(plugin, () => { throw new Error('boom'); });
		const next = updatePluginData(plugin, data => { data.ok = true; });
		await expect(failing).rejects.toThrow('boom');
		await next;
		expect(read()).toEqual({ ok: true });
	});
});
