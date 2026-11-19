// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
// The mock itself: the real Plugin type is abstract
import { Plugin } from '../../mocks/obsidian';
import { Feature } from '../../../src/core/Feature';
import type { FeatureContext, Services, SettingsAccess } from '../../../src/core/types';

// Defers its work to the layout ready callback
class LateFeature extends Feature {
	ran = 0;
	onload() {
		this.onLayoutReady(() => this.ran++);
	}
}

// A workspace whose layout gets ready when `ready()` is called
function setup() {
	const pending: (() => void)[] = [];
	const workspace = { onLayoutReady: (callback: () => void) => pending.push(callback) };
	const ctx: FeatureContext = {
		id: 'late',
		app: { workspace } as never,
		plugin: new Plugin() as never,
		services: {} as Services,
		settings: {} as SettingsAccess,
	};
	const ready = () => pending.splice(0).forEach(callback => callback());
	return { feature: new LateFeature(ctx), ready };
}

describe('Feature', () => {
	it('runs a layout ready callback while it is loaded', () => {
		const { feature, ready } = setup();
		feature.load();
		ready();
		expect(feature.ran).toBe(1);
		feature.unload();
	});

	it('skips a layout ready callback once turned off', () => {
		const { feature, ready } = setup();
		feature.load();
		feature.unload();
		ready();
		expect(feature.ran).toBe(0);
	});
});
