import { describe, expect, it } from 'vitest';
import { useObsidian } from '../harness/useObsidian';
import { createFile, openFile, readFile } from '../harness/workspace';

describe('editor and navigation', () => {
	const { page } = useObsidian();

	it('prettier: Cmd+S formats the markdown of the note', async () => {
		await createFile(page(), 'Format me.md', '*   one\n*   two\n\n\n\n# Title   \n');
		await openFile(page(), 'Format me.md');
		await page().evaluate(() => app.workspace.activeEditor.editor.focus());
		await page().press('s', ['Meta']);
		const content = await page().waitFor(async () => {
			const text = await app.vault.adapter.read('Format me.md') as string;
			return text.startsWith('- one') ? text : null;
		});
		expect(content).toBe('- one\n- two\n\n# Title\n');
	});

	it('reskin-search: quick switcher suggestions show the name with the folder below', async () => {
		await page().evaluate(() => app.commands.executeCommandById('switcher:open'));
		await page().waitFor(() => document.activeElement?.classList.contains('prompt-input'));
		await page().type('Alpha');
		const item = await page().waitFor(() => {
			const el = document.querySelector('.prompt .notional-suggestion-item');
			const folder = el?.querySelector('.notional-suggestion-path')?.textContent?.trim();
			return el && folder ? { folder } : null;
		});
		expect(item.folder).toContain('Projects/Alpha');
		await page().press('Escape');
	});

	it('icons: the header button opens the picker and the chosen icon is saved', async () => {
		await openFile(page(), 'Home.md');
		// The button shows when the title is hovered, then stays while over its area
		await page().hover('.workspace-leaf.mod-active .inline-title');
		await page().click('.workspace-leaf.mod-active .notional-add-icon-btn');
		await page().waitFor(() => !!document.querySelector('.notional-icon-picker .notional-icon-option'));
		const chosen = await page().evaluate(() => {
			const option = document.querySelector<HTMLElement>('.notional-icon-picker .notional-icon-option');
			return option?.getAttribute('aria-label') ?? option?.dataset.icon ?? option?.title ?? '';
		});
		await page().click('.notional-icon-picker .notional-icon-option');
		// Picking an icon opens its color palette: the color confirms the choice
		await page().click('.notional-color-popover .notional-color-option');
		const saved = await page().waitFor(async () => {
			const data = JSON.parse(await app.vault.adapter.read('.obsidian/plugins/notionalize/data.json') as string) as { icons?: Record<string, { icon: string }> };
			return data.icons?.['Home.md'] ?? null;
		});
		expect(saved.icon).toBeTruthy();
		expect(typeof chosen).toBe('string');
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-icon-header'));
	});

	it('title-mention: "@" in the inline title links another note', async () => {
		await createFile(page(), 'Notes on.md', '');
		await openFile(page(), 'Notes on.md');
		// The "@" suggest is attached to the title on the feature's debounced render
		// pass (no DOM marker): leave it time, as a user would before typing
		await new Promise(resolve => setTimeout(resolve, 300));
		await page().evaluate(() => {
			const title = document.querySelector<HTMLElement>('.workspace-leaf.mod-active .inline-title');
			title?.focus();
			const range = document.createRange();
			range.selectNodeContents(title as HTMLElement);
			range.collapse(false);
			getSelection()?.removeAllRanges();
			getSelection()?.addRange(range);
		});
		await page().type(' @Alph');
		await page().waitFor(() => Array.from(document.querySelectorAll('.suggestion-container .suggestion-item'))
			.some(s => s.textContent?.includes('Alpha')));
		await page().press('Enter');
		await page().waitFor(() => !!app.vault.getAbstractFileByPath('Notes on @Alpha.md'));
		await page().waitFor(() => {
			const mentions = app.metadataCache.getCache('Notes on @Alpha.md')?.frontmatter?.mentions as string[] | undefined;
			return mentions?.includes('[[Alpha]]');
		});
		expect(await readFile(page(), 'Notes on @Alpha.md')).toContain('mentions:');
	});
});
