// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { Plugin } from 'obsidian';
import { DataStore } from '../../../src/core/DataStore';
import { FEATURES } from '../../../src/core/featureRegistry';
import { OFF_BY_DEFAULT } from '../../e2e/harness/constants';

// The public defaults: what a fresh install runs
const ON_BY_DEFAULT = [
	'icons', 'select-property', 'tag-colors', 'folder-page', 'folder-view', 'breadcrumb-nav', 'database-header',
	'auto-base-filter', 'auto-rename-parent-folder', 'media-drop', 'note-template', 'inline-note-rename',
	'side-peek', 'board', 'timeline', 'title-mention', 'reskin-search', 'table-clipboard',
];

// Features on after loading this data.json (stored state, else the registry default)
async function enabledAfterLoad(stored: Record<string, unknown> | null): Promise<string[]> {
	const plugin = { loadData: async () => stored, saveData: async () => undefined } as unknown as Plugin;
	const store = new DataStore(plugin);
	await store.load();
	return FEATURES.filter(d => store.settings.features[d.id] ?? d.defaultEnabled).map(d => d.id);
}

describe('feature defaults', () => {
	it('gives a fresh install the public defaults', async () => {
		expect((await enabledAfterLoad(null)).sort()).toEqual([...ON_BY_DEFAULT].sort());
	});

	it('turns on, in the e2e vault, every feature off by default', () => {
		expect([...OFF_BY_DEFAULT].sort()).toEqual(FEATURES.filter(d => !d.defaultEnabled).map(d => d.id).sort());
	});

	it('keeps website icons off until they are turned on', async () => {
		const plugin = { loadData: async () => null, saveData: async () => undefined } as unknown as Plugin;
		const store = new DataStore(plugin);
		await store.load();
		expect(store.settings.googleFavicons).toBe(false);
	});
});
