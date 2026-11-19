import { describe, expect, it } from 'vitest';
import { rememberFrontmostApp } from '../harness/rememberFrontmostApp';
import { useObsidian } from '../harness/useObsidian';
import { createFile, setColor, setFeature } from '../harness/workspace';

// Popout windows. Run last (see vitest.e2e.config.ts): opening one brings the
// test window to the front, where the real pointer can disturb the specs after it.
describe('popout windows', () => {
	const { page } = useObsidian();

	it('tag-colors: colors the tags of a popout window and opens the palette there; off, they are uncolored', async () => {
		await createFile(page(), 'Popout tag.md', '#popped\n');
		await setColor(page(), 'popped', 'green');
		// Electron brings Obsidian to the front with the popout: put your app back
		const restoreFocus = rememberFrontmostApp();
		await page().evaluate(() => app.workspace.openPopoutLeaf()
			.setViewState({ type: 'markdown', state: { file: 'Popout tag.md', mode: 'preview' }, active: true }));
		restoreFocus();
		const coloredInPopout = () => {
			let count = 0;
			app.workspace.iterateAllLeaves((leaf: { view: { containerEl: HTMLElement } }) => {
				const doc = leaf.view.containerEl.ownerDocument;
				if (doc !== document) count += doc.querySelectorAll('a.tag[data-notion-color="green"]').length;
			});
			return count;
		};
		// The feature's body class, which scopes its styles, in the popout window too
		const popoutBodyClass = () => app.workspace.getLeavesOfType('markdown')
			.map((leaf: { view: { containerEl: HTMLElement } }) => leaf.view.containerEl.ownerDocument)
			.some((doc: Document) => doc !== document && doc.body.classList.contains('notional-feature-tag-colors'));

		try {
			await page().waitFor(coloredInPopout);
			expect(await page().evaluate(popoutBodyClass)).toBe(true);

			// Right-click on the tag, "Change color": the palette opens in the popout
			const palette = await page().evaluate(() => {
				const popout = app.workspace.getLeavesOfType('markdown')
					.map((leaf: { view: { containerEl: HTMLElement } }) => leaf.view.containerEl.ownerDocument)
					.find((doc: Document) => doc !== document) as Document;
				const tag = popout.querySelector<HTMLElement>('a.tag')!;
				const rect = tag.getBoundingClientRect();
				// Created by the popout window, like a real right-click there
				const win = popout.defaultView as Window & typeof globalThis;
				tag.dispatchEvent(new win.MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: win, clientX: rect.left + 2, clientY: rect.top + 2 }));
				popout.querySelector<HTMLElement>('.menu .menu-item')?.click();
				const where = { popout: !!popout.querySelector('.notional-color-palette-popup'), main: !!document.querySelector('.notional-color-palette-popup') };
				popout.body.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true }));
				return where;
			});
			expect(palette).toEqual({ popout: true, main: false });

			await setFeature(page(), 'tag-colors', false);
			expect(await page().evaluate(coloredInPopout)).toBe(0);
			expect(await page().evaluate(popoutBodyClass)).toBe(false);

			await setFeature(page(), 'tag-colors', true);
			expect(await page().evaluate(coloredInPopout)).toBe(1);
			expect(await page().evaluate(popoutBodyClass)).toBe(true);
		} finally {
			await page().evaluate(() => app.workspace.iterateAllLeaves((leaf: { view: { containerEl: HTMLElement }; detach(): void }) => {
				if (leaf.view.containerEl.ownerDocument !== document) leaf.detach();
			}));
			await page().waitFor(() => (app.workspace as unknown as { floatingSplit: { children: unknown[] } }).floatingSplit.children.length === 0);
			restoreFocus();
			await setColor(page(), 'popped', null);
			await page().evaluate(() => app.vault.delete(app.vault.getAbstractFileByPath('Popout tag.md')));
		}
	});
});
