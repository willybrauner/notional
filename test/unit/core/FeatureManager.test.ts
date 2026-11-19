// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Platform } from 'obsidian';
// The mock itself: the real Plugin type is abstract
import { Plugin } from '../../mocks/obsidian';
import { Feature } from '../../../src/core/Feature';
import { FeatureManager } from '../../../src/core/FeatureManager';
import { defineFeature } from '../../../src/core/defineFeature';
import type { FeatureContext, FeatureDefinition, Services, SettingsAccess } from '../../../src/core/types';

// Records its lifecycle and registers a command through its scoped plugin
class TestFeature extends Feature {
	constructor(ctx: FeatureContext, private log: string[], private fail = false) {
		super(ctx);
	}
	onload() {
		this.log.push(`load ${this.id}`);
		this.plugin.addCommand({ id: this.id, name: this.id, callback: () => undefined });
		if (this.fail) throw new Error('broken');
	}
	onunload() {
		this.log.push(`unload ${this.id}`);
	}
}

function setup(defs: Partial<FeatureDefinition & { fail: boolean }>[], stored: Record<string, boolean> = {}) {
	const log: string[] = [];
	const plugin = new Plugin();
	plugin.load();
	const definitions = defs.map(({ fail, ...def }) => defineFeature({
		name: '', description: '', section: 'Bases', id: 'x',
		create: ctx => new TestFeature(ctx, log, fail),
		...def,
	}));
	const states = { ...stored };
	const manager = new FeatureManager(
		plugin as never,
		definitions,
		{ app: {} as never, plugin: plugin as never, services: {} as Services, settings: {} as SettingsAccess },
		{ get: id => states[id], set: async (id, on) => { states[id] = on; } },
	);
	manager.loadAll();
	return { manager, plugin, log, states };
}

describe('FeatureManager', () => {
	afterEach(() => { Platform.isDesktopApp = true; });

	it('starts the enabled features in registry order', () => {
		const { manager, log } = setup([{ id: 'a' }, { id: 'b', defaultEnabled: false }, { id: 'c' }, { id: 'd' }], { d: false });
		expect(log).toEqual(['load a', 'load c']);
		expect(manager.isRunning('b')).toBe(false);
		expect(manager.isEnabled('c')).toBe(true);
	});

	it('adds the body class while a feature runs', async () => {
		const { manager } = setup([{ id: 'a' }]);
		expect(document.body.classList.contains('notional-feature-a')).toBe(true);
		await manager.disable('a');
		expect(document.body.classList.contains('notional-feature-a')).toBe(false);
	});

	it('runs the cleanups of plugin APIs when a feature is turned off', async () => {
		const { manager, plugin, log, states } = setup([{ id: 'a' }, { id: 'b' }]);
		expect([...plugin.commands]).toEqual(['notionalize:a', 'notionalize:b']);

		await manager.disable('a');
		expect([...plugin.commands]).toEqual(['notionalize:b']);
		expect(log).toContain('unload a');
		expect(states.a).toBe(false);

		await manager.enable('a');
		expect([...plugin.commands]).toEqual(['notionalize:b', 'notionalize:a']);
		expect(states.a).toBe(true);
	});

	it('stops the dependents with their requirement, and brings them back', async () => {
		const { manager, log } = setup([{ id: 'a' }, { id: 'b', requires: ['a'] }, { id: 'c', requires: ['b'] }, { id: 'd' }]);
		expect(manager.dependentsOf('a')).toEqual(['b', 'c']);

		expect(await manager.disable('a')).toEqual(['b', 'c']);
		expect(log.slice(-3)).toEqual(['unload c', 'unload b', 'unload a']);
		expect(manager.isEnabled('b')).toBe(true);
		expect(manager.isRunning('b')).toBe(false);

		await manager.enable('a');
		expect(log.slice(-3)).toEqual(['load a', 'load b', 'load c']);
	});

	it('restarts a running feature with its running dependents, and leaves a stopped one off', async () => {
		const { manager, log } = setup([{ id: 'a' }, { id: 'b', requires: ['a'] }, { id: 'c' }]);
		manager.restart('a');
		expect(log.slice(-4)).toEqual(['unload b', 'unload a', 'load a', 'load b']);
		expect(manager.isEnabled('a')).toBe(true);

		await manager.disable('c');
		manager.restart('c');
		expect(manager.isRunning('c')).toBe(false);
	});

	it('does not start a feature whose requirement is off', () => {
		const { manager } = setup([{ id: 'a' }, { id: 'b', requires: ['a'] }], { a: false });
		expect(manager.isRunning('b')).toBe(false);
	});

	it('skips desktop-only features on mobile', () => {
		Platform.isDesktopApp = false;
		const { manager } = setup([{ id: 'a', desktopOnly: true }, { id: 'b' }]);
		expect(manager.isAvailable('a')).toBe(false);
		expect(manager.isRunning('a')).toBe(false);
		expect(manager.isRunning('b')).toBe(true);
	});

	it('keeps loading the others when a feature throws, and cleans it up', () => {
		const { manager, plugin } = setup([{ id: 'a', fail: true }, { id: 'b' }]);
		expect(manager.isRunning('a')).toBe(false);
		expect(manager.isRunning('b')).toBe(true);
		expect([...plugin.commands]).toEqual(['notionalize:b']);
		expect(document.body.classList.contains('notional-feature-a')).toBe(false);
	});
});
