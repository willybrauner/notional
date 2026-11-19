import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, expect, inject } from 'vitest';
import { RUN_DIR } from './constants';
import { ObsidianPage } from './ObsidianPage';

const SCREENSHOT_DIR = path.join(RUN_DIR, 'failures');

/**
 * Connects a spec file to the shared Obsidian instance. Before each test the
 * workspace is reduced to one empty tab; after each test no error may have
 * been logged.
 */
export function useObsidian(): { page: () => ObsidianPage } {
	let page: ObsidianPage | null = null;

	beforeAll(async () => {
		page = await ObsidianPage.connect(inject('pageUrl'));
	});

	afterAll(() => {
		page?.disconnect();
	});

	beforeEach(async ({ task, onTestFailed }) => {
		// Screenshot of the window at the failure, next to the run's vault
		onTestFailed(async () => {
			fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
			const name = task.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 80);
			await page?.screenshot(path.join(SCREENSHOT_DIR, `${name}.png`)).catch(() => undefined);
		});
		// Close what a previous test may have left open (pickers, suggestions, menus)
		await page?.press('Escape');
		await page?.press('Escape');
		await page?.evaluate(async () => {
			document.querySelectorAll('.modal-close-button, .menu').forEach(el => (el as HTMLElement).click());
			// Keep one main area tab (never the side peek's): detaching every leaf
			// would remove the tab group itself
			type Leaf = { containerEl: HTMLElement; detach(): void; setViewState(state: unknown): Promise<void> };
			const leaves: Leaf[] = [];
			app.workspace.iterateRootLeaves((leaf: Leaf) => leaves.push(leaf));
			const first = leaves.find(leaf => !leaf.containerEl.closest('.notional-side-peek')) ?? leaves[0];
			leaves.filter(leaf => leaf !== first).forEach(leaf => leaf.detach());
			await first?.setViewState({ type: 'empty' });
			app.workspace.setActiveLeaf(first, { focus: true });
		});
		page?.takeErrors();
	});

	afterEach(() => {
		expect(page?.takeErrors() ?? []).toEqual([]);
	});

	return {
		page: () => {
			if (!page) throw new Error('Obsidian page not connected');
			return page;
		},
	};
}
