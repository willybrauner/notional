import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { useObsidian } from '../harness/useObsidian';
import { setFeature } from '../harness/workspace';

// One computed value per tweak, read on a probe element: `null` reads it on body,
// otherwise on an element of these classes (the tabs one exists in the window)
const PROBES: Record<string, { classes: string | null; property: string; on: string }> = {
	'tweak-accent': { classes: null, property: '--accent-h', on: '0' },
	'tweak-dark-background': { classes: null, property: '--background-primary', on: 'rgb(20, 20, 20)' },
	'tweak-typography': { classes: 'cm-header cm-header-2', property: 'font-size', on: '23px' },
	'tweak-tabs': { classes: 'workspace-tab-header-container', property: '--tab-outline-color', on: '' },
	'tweak-properties': { classes: 'metadata-properties-heading', property: 'display', on: 'flex' },
	'tweak-bases-layout': { classes: 'bases-cards-label', property: 'display', on: 'none' },
};
const IDS = Object.keys(PROBES);

// Each tweak alone: turned off, its rules stop applying and the others keep theirs
describe('visual tweaks', () => {
	const { page } = useObsidian();

	beforeAll(async () => {
		// Dark mode: "Darker dark mode" only applies there
		await page().evaluate(() => app.changeTheme('obsidian'));
	});

	afterAll(async () => {
		await page().evaluate(() => {
			document.querySelector('.notional-test-probes')?.remove();
			app.changeTheme('moonstone');
		});
		for (const id of IDS) await setFeature(page(), id, true);
	});

	// Computed value of every probe, by tweak id
	const read = () => page().evaluate((probes: typeof PROBES) => {
		let host = document.querySelector<HTMLElement>('.notional-test-probes');
		if (!host) {
			host = document.body.createDiv({ cls: 'notional-test-probes' });
			for (const probe of Object.values(probes)) {
				if (probe.classes && probe.classes !== 'workspace-tab-header-container') host.createDiv({ cls: probe.classes });
			}
		}
		const values: Record<string, string> = {};
		for (const [id, probe] of Object.entries(probes)) {
			const el = probe.classes === null ? document.body
				: probe.classes === 'workspace-tab-header-container'
					? document.querySelector('.workspace-split.mod-root .workspace-tab-header-container')
					: host.querySelector(`.${probe.classes.split(' ').join('.')}`);
			values[id] = el ? getComputedStyle(el).getPropertyValue(probe.property).trim() : 'missing';
		}
		return values;
	}, PROBES);

	it('are off by default and listed under Visual tweaks', async () => {
		const definitions = await page().evaluate(() =>
			app.plugins.plugins.notionalize.features.definitions
				.filter((d: { section: string }) => d.section === 'Visual tweaks')
				.map((d: { id: string; defaultEnabled: boolean }) => ({ id: d.id, defaultEnabled: d.defaultEnabled })));
		expect(definitions).toEqual(IDS.map(id => ({ id, defaultEnabled: false })));
	});

	it('stop applying once turned off, one at a time', async () => {
		for (const id of IDS) await setFeature(page(), id, true);
		const on = await read();
		for (const [id, probe] of Object.entries(PROBES)) {
			if (probe.on) expect(on[id], id).toBe(probe.on);
		}

		for (const id of IDS) {
			await setFeature(page(), id, false);
			const off = await read();
			expect(off[id], `${id} off`).not.toBe(on[id]);
			for (const other of IDS.filter(o => o !== id)) expect(off[other], `${other} with ${id} off`).toBe(on[other]);
			await setFeature(page(), id, true);
		}
	});
});
