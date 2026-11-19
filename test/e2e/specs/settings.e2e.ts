import { afterEach, describe, expect, it } from 'vitest';
import { useObsidian } from '../harness/useObsidian';

// The settings open in their own window: the tab is reached through
// app.setting.activeTab and clicked there (the page drives the main window)
describe('settings tab', () => {
	const { page } = useObsidian();

	afterEach(async () => {
		await page().evaluate(() => app.setting.close());
	});

	it('lists every feature of the registry', async () => {
		await page().evaluate(() => { app.setting.open(); app.setting.openTabById('notionalize'); });
		const listed = await page().waitFor(() => {
			const rows = Array.from((app.setting.activeTab.containerEl as HTMLElement)
				.querySelectorAll<HTMLElement>('.notional-settings-feature'));
			return rows.length ? rows.map(row => row.dataset.feature) : null;
		});
		const registry = await page().evaluate(() =>
			app.plugins.plugins.notionalize.features.definitions.map((d: { id: string }) => d.id));
		expect([...listed].sort()).toEqual([...registry].sort());
	});

	it('turns a feature off and on from its toggle, with its sub-settings', async () => {
		await page().evaluate(() => { app.setting.open(); app.setting.openTabById('notionalize'); });
		// Running state and sub-settings once they agree (the tab renders again after the toggle)
		const state = (on: boolean) => {
			const row = (app.setting.activeTab.containerEl as HTMLElement)
				.querySelector('.notional-settings-feature[data-feature="media-drop"]');
			const running = app.plugins.plugins.notionalize.features.isRunning('media-drop') as boolean;
			const subSettings = row?.nextElementSibling?.classList.contains('notional-settings-sub') ?? false;
			return row && running === on && subSettings === on ? { running, subSettings } : null;
		};
		const clickToggle = () => (app.setting.activeTab.containerEl as HTMLElement)
			.querySelector<HTMLElement>('.notional-settings-feature[data-feature="media-drop"] .checkbox-container')
			?.click();

		await page().waitFor(state, true);
		await page().evaluate(clickToggle);
		expect(await page().waitFor(state, false)).toEqual({ running: false, subSettings: false });
		await page().evaluate(clickToggle);
		expect(await page().waitFor(state, true)).toEqual({ running: true, subSettings: true });
	});
});
