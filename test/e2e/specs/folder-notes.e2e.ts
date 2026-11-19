import { describe, expect, it } from 'vitest';
import { useObsidian } from '../harness/useObsidian';
import { activePath, createFile, exists, openFile } from '../harness/workspace';

describe('folder notes', () => {
	const { page } = useObsidian();

	it('folder-view: clicking a folder in the file explorer opens its folder note', async () => {
		await page().evaluate(() => app.commands.executeCommandById('file-explorer:open'));
		await page().click('.nav-folder-title[data-path="Projects"]');
		await page().waitFor(() => app.workspace.getActiveFile()?.path === 'Projects/Projects.md');
	});

	it('breadcrumb-nav: hides the duplicate segment and opens folder notes from the breadcrumbs', async () => {
		await openFile(page(), 'Projects/Alpha/Alpha.md');
		// Projects › Alpha: "Alpha" repeats the title of the folder note
		await page().waitFor(() => {
			const crumbs = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .view-header-breadcrumb'));
			return crumbs.length === 2 && crumbs[1]?.classList.contains('notional-breadcrumb-duplicate');
		});
		await page().click('.workspace-leaf.mod-active .view-header-breadcrumb');
		await page().waitFor(() => app.workspace.getActiveFile()?.path === 'Projects/Projects.md');
	});

	it('auto-rename-parent-folder: renaming a folder note renames its folder', async () => {
		await createFile(page(), 'Drafts/Drafts.md', '# Drafts\n');
		await page().evaluate(async () => {
			await app.fileManager.renameFile(app.vault.getAbstractFileByPath('Drafts/Drafts.md'), 'Drafts/Essays.md');
		});
		await page().waitFor(() => !!app.vault.getAbstractFileByPath('Essays/Essays.md'));
		expect(await exists(page(), 'Drafts')).toBe(false);
	});

	it('note-template: a new empty note gets the folder template', async () => {
		await createFile(page(), 'Notes/Meeting.md');
		const content = await page().waitFor(async () => {
			const text = await app.vault.adapter.read('Notes/Meeting.md') as string;
			return text.includes('# Meeting') ? text : null;
		});
		const today = new Date();
		const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		expect(content).toBe(`---\ncreated: "${date}"\n---\n# Meeting\n`);
	});

	it('folder-page: "/page <name>" creates a folder page in its own folder and links it', async () => {
		await createFile(page(), 'Ideas.md', '');
		await openFile(page(), 'Ideas.md');
		await page().evaluate(() => app.workspace.activeEditor.editor.focus());
		await page().type('/page Child');
		await page().waitFor(() => !!document.querySelector('.suggestion-container .folder-page-item'));
		await page().press('Enter');
		// The parent note moves into its own folder, the child goes next to it
		await page().waitFor(() => !!app.vault.getAbstractFileByPath('Ideas/Ideas.md'));
		const created = await page().waitFor(() => app.vault.getMarkdownFiles().find((f: { basename: string }) => f.basename === 'Child')?.path);
		expect(created.startsWith('Ideas/')).toBe(true);
		const parent = await page().waitFor(async () => {
			const text = await app.vault.adapter.read('Ideas/Ideas.md') as string;
			return text.includes('Child') ? text : null;
		});
		expect(parent).toContain('[[');
		expect(await activePath(page())).toBeTruthy();
	});
});
