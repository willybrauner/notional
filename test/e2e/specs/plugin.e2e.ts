import { describe, expect, it } from 'vitest';
import { useObsidian } from '../harness/useObsidian';
import { activePath, createFile, exists, openBase, openFile, readFile, renameFile, setColor, setFeature } from '../harness/workspace';

// Time for a handler that should not run to have had its chance
const settle = () => new Promise(resolve => setTimeout(resolve, 300));

describe('plugin', () => {
	const { page } = useObsidian();

	it('is loaded in the test vault', async () => {
		const loaded = await page().evaluate(() => !!app.plugins.plugins.notionalize);
		expect(loaded).toBe(true);
	});

	it('unloads without leaving its elements behind, and loads again', async () => {
		await page().evaluate(async () => {
			await app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath('Tasks/Tasks.base'));
		});
		await page().waitFor(() => !!document.querySelector('.notional-db-header'));

		await page().evaluate(() => app.plugins.disablePlugin('notionalize'));
		const leftovers = await page().evaluate(() =>
			Array.from(document.querySelectorAll('[class*="notional-"]')).map(el => el.className),
		);
		expect(leftovers).toEqual([]);

		await page().evaluate(() => app.plugins.enablePlugin('notionalize'));
		await page().waitFor(() => !!app.plugins.plugins.notionalize);
	});

	it('runs every feature of the registry', async () => {
		const stopped = await page().evaluate(() => {
			const { features } = app.plugins.plugins.notionalize;
			return features.definitions.map((d: { id: string }) => d.id).filter((id: string) => !features.isRunning(id));
		});
		expect(stopped).toEqual([]);
	});

	it('turns a feature off and on without leaving its elements behind', async () => {
		await page().evaluate(async () => {
			await app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath('Tasks/Tasks.base'));
		});
		// Tasks/Tasks.base: the "Tasks" breadcrumb segment repeats the title, hidden by breadcrumb-nav
		await page().waitFor(() => !!document.querySelector('.notional-breadcrumb-duplicate'));

		await page().evaluate(() => app.plugins.plugins.notionalize.features.disable('breadcrumb-nav'));
		const state = await page().evaluate(() => ({
			duplicates: document.querySelectorAll('.notional-breadcrumb-duplicate').length,
			bodyClass: document.body.classList.contains('notional-feature-breadcrumb-nav'),
			running: app.plugins.plugins.notionalize.features.isRunning('breadcrumb-nav'),
			// Other features keep running
			header: !!document.querySelector('.notional-db-header'),
		}));
		expect(state).toEqual({ duplicates: 0, bodyClass: false, running: false, header: true });
		const stored = await page().evaluate(async () =>
			(JSON.parse(await app.vault.adapter.read(`${app.plugins.plugins.notionalize.manifest.dir}/data.json`) as string) as { settings: { features: unknown } }).settings.features);
		expect(stored).toMatchObject({ 'breadcrumb-nav': false });

		await page().evaluate(() => app.plugins.plugins.notionalize.features.enable('breadcrumb-nav'));
		// Hidden again on the next layout pass
		await page().evaluate(() => app.workspace.trigger('layout-change'));
		await page().waitFor(() => !!document.querySelector('.notional-breadcrumb-duplicate')
			&& document.body.classList.contains('notional-feature-breadcrumb-nav'));
	});

	it('folder-view: off, a folder click only folds it; on again, it opens the folder note', async () => {
		await page().evaluate(() => app.commands.executeCommandById('file-explorer:open'));
		await setFeature(page(), 'folder-view', false);
		await page().click('.nav-folder-title[data-path="Projects"]');
		await settle();
		expect(await activePath(page())).toBe(null);

		await setFeature(page(), 'folder-view', true);
		await page().click('.nav-folder-title[data-path="Projects"]');
		await page().waitFor(() => app.workspace.getActiveFile()?.path === 'Projects/Projects.md');
	});

	it('auto-rename-parent-folder: off, renaming a folder note keeps its folder; on again, the folder follows', async () => {
		await createFile(page(), 'Toggle/Toggle.md', '# Toggle\n');
		await setFeature(page(), 'auto-rename-parent-folder', false);
		await renameFile(page(), 'Toggle/Toggle.md', 'Toggle/Renamed.md');
		await settle();
		expect(await exists(page(), 'Toggle/Renamed.md')).toBe(true);
		await renameFile(page(), 'Toggle/Renamed.md', 'Toggle/Toggle.md');

		await setFeature(page(), 'auto-rename-parent-folder', true);
		await renameFile(page(), 'Toggle/Toggle.md', 'Toggle/Moved.md');
		await page().waitFor(() => !!app.vault.getAbstractFileByPath('Moved/Moved.md'));
	});

	it('hide-base-extension: off, links in a base show .base again; on again, it is hidden', async () => {
		// Listed by Tasks.base: a folder base of a direct subfolder
		await createFile(page(), 'Tasks/Sprint/Sprint.base');
		await openFile(page(), 'Tasks/Tasks.base');
		const linkText = () => page().evaluate(() => Array.from(document.querySelectorAll('.workspace-leaf.mod-active .internal-link'))
			.map(el => el.textContent).find(text => text?.startsWith('Sprint')) ?? null);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .internal-link--base'));
		expect(await linkText()).toBe('Sprint');

		await setFeature(page(), 'hide-base-extension', false);
		expect(await linkText()).toBe('Sprint.base');
		expect(await page().evaluate(() => document.querySelectorAll('.internal-link--base, [data-notional-processed]').length)).toBe(0);

		await setFeature(page(), 'hide-base-extension', true);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .internal-link--base'));
		expect(await linkText()).toBe('Sprint');
		await page().evaluate(() => app.vault.delete(app.vault.getAbstractFileByPath('Tasks/Sprint'), true));
	});

	it('note-template: off, a new note stays empty; on again, it gets the folder template', async () => {
		await setFeature(page(), 'note-template', false);
		await createFile(page(), 'Notes/Untemplated.md');
		await settle();
		expect(await readFile(page(), 'Notes/Untemplated.md')).toBe('');

		await setFeature(page(), 'note-template', true);
		await createFile(page(), 'Notes/Templated.md');
		await page().waitFor(async () => (await app.vault.adapter.read('Notes/Templated.md') as string).includes('# Templated'));
	});

	it('prettier: off, Cmd+S saves the note as it is; on again, it formats it', async () => {
		await createFile(page(), 'Toggle prettier.md', '*   one\n');
		await openFile(page(), 'Toggle prettier.md');
		await page().evaluate(() => app.workspace.activeEditor.editor.focus());
		await setFeature(page(), 'prettier', false);
		await page().press('s', ['Meta']);
		await settle();
		expect(await readFile(page(), 'Toggle prettier.md')).toBe('*   one\n');

		await setFeature(page(), 'prettier', true);
		await page().evaluate(() => app.workspace.activeEditor.editor.focus());
		await page().press('s', ['Meta']);
		await page().waitFor(async () => await app.vault.adapter.read('Toggle prettier.md') === '- one\n');
	});

	it('table-clipboard: off, a copy with the table focused does not reach it; on again, it is forwarded', async () => {
		await openFile(page(), 'Tasks/Tasks.base');
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .bases-table-container'));
		// Copies the focused table receives, from a copy fired at <body> like Chromium does
		const forwardedCopies = () => page().evaluate(() => {
			const table = document.querySelector<HTMLElement>('.workspace-leaf.mod-active .bases-table-container')!;
			let received = 0;
			const count = () => received++;
			table.addEventListener('copy', count);
			table.focus();
			document.body.dispatchEvent(new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true }));
			table.removeEventListener('copy', count);
			return received;
		});

		await setFeature(page(), 'table-clipboard', false);
		expect(await forwardedCopies()).toBe(0);

		await setFeature(page(), 'table-clipboard', true);
		expect(await forwardedCopies()).toBe(1);
	});

	it('base-own-context: off, the bases controller is native again; on again, it is patched', async () => {
		await openFile(page(), 'Tasks/Tasks.base');
		await page().waitFor(() => !!(app.workspace.getLeavesOfType('bases')[0]?.view as { controller?: unknown }).controller);
		// Whether the controller prototype method changed since the last call (kept on the window)
		const methodChanged = () => page().evaluate(() => {
			const view = app.workspace.getLeavesOfType('bases')[0]!.view as unknown as { controller: object };
			const method = (Object.getPrototypeOf(view.controller) as { updateCurrentFile: unknown }).updateCurrentFile;
			const holder = window as Window & { notionalMethod?: unknown };
			const changed = holder.notionalMethod !== undefined && holder.notionalMethod !== method;
			holder.notionalMethod = method;
			return changed;
		});

		await methodChanged();
		await setFeature(page(), 'base-own-context', false);
		expect(await methodChanged()).toBe(true);

		await setFeature(page(), 'base-own-context', true);
		expect(await methodChanged()).toBe(true);
		await page().evaluate(() => { delete (window as Window & { notionalMethod?: unknown }).notionalMethod; });
	});

	it('auto-base-filter: off, a new base stays empty and its command is gone; on again, both come back', async () => {
		const hasCommand = () => page().evaluate(() => !!app.commands.commands['notionalize:set-base-new-item-folders']);
		await setFeature(page(), 'auto-base-filter', false);
		expect(await hasCommand()).toBe(false);
		await createFile(page(), 'Shelf/Shelf.base');
		await settle();
		expect(await readFile(page(), 'Shelf/Shelf.base')).toBe('');

		await setFeature(page(), 'auto-base-filter', true);
		expect(await hasCommand()).toBe(true);
		await createFile(page(), 'Shelf/Sub/Sub.base');
		await page().waitFor(async () => (await app.vault.adapter.read('Shelf/Sub/Sub.base') as string).startsWith('filters:'));
		await page().evaluate(() => app.vault.delete(app.vault.getAbstractFileByPath('Shelf'), true));
	});

	it('database-header: off, the base title is removed and stays out; on again, it comes back', async () => {
		await openFile(page(), 'Tasks/Tasks.base');
		const headers = () => page().evaluate(() => document.querySelectorAll('.notional-db-header').length);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-db-header'));

		await setFeature(page(), 'database-header', false);
		expect(await headers()).toBe(0);
		// No observer or listener left to inject it again
		await page().evaluate(() => app.workspace.trigger('layout-change'));
		await settle();
		expect(await headers()).toBe(0);

		await setFeature(page(), 'database-header', true);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-db-header'));
	});

	it('database-header: renaming the base from its title renames its folder and filter, with auto-rename-parent-folder off or on', async () => {
		const renameTitle = (name: string) => page().evaluate((n: string) => {
			const title = document.querySelector<HTMLElement>('.workspace-leaf.mod-active .notional-db-title')!;
			title.focus();
			title.textContent = n;
			title.blur();
		}, name);
		const filtered = (path: string, folder: string) => page().waitFor(async (p: string, f: string) =>
			(await app.vault.adapter.read(p) as string).includes(`file.inFolder("${f}")`), path, folder);

		await createFile(page(), 'Shelf/Shelf.base');
		await filtered('Shelf/Shelf.base', 'Shelf');
		await setFeature(page(), 'auto-rename-parent-folder', false);
		await openFile(page(), 'Shelf/Shelf.base');
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-db-title'));

		await renameTitle('Library');
		await filtered('Library/Library.base', 'Library');
		expect(await exists(page(), 'Shelf')).toBe(false);

		// Both rename the folder: once
		await setFeature(page(), 'auto-rename-parent-folder', true);
		await renameTitle('Archive');
		await filtered('Archive/Archive.base', 'Archive');
		expect(await exists(page(), 'Library')).toBe(false);
	});

	it('media-drop: off, a pasted file is left to Obsidian; on again, it goes to _assets', async () => {
		await createFile(page(), 'Drop/Drop.md', '# Drop\n');
		await openFile(page(), 'Drop/Drop.md');
		// Paste of a GIF (written as it is, no WebP conversion) in the view, outside
		// the editor so Obsidian's own handler leaves it alone
		const paste = (name: string) => page().evaluate((fileName: string) => {
			const data = new DataTransfer();
			data.items.add(new File([new Uint8Array([71, 73, 70, 56, 57, 97])], fileName, { type: 'image/gif' }));
			document.querySelector('.workspace-leaf.mod-active .view-header')!
				.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
		}, name);

		await setFeature(page(), 'media-drop', false);
		await paste('off.gif');
		await settle();
		expect(await exists(page(), 'Drop/_assets/off.gif')).toBe(false);

		await setFeature(page(), 'media-drop', true);
		await paste('on.gif');
		await page().waitFor(() => !!app.vault.getAbstractFileByPath('Drop/_assets/on.gif'));
		await page().evaluate(() => app.vault.delete(app.vault.getAbstractFileByPath('Drop'), true));
	});

	it('reskin-search: off, quick switcher items keep their native look; on again, they are reskinned', async () => {
		// Opens the quick switcher on "Alpha", returns whether its first item was reskinned
		const reskinned = async () => {
			await page().evaluate(() => app.commands.executeCommandById('switcher:open'));
			await page().waitFor(() => document.activeElement?.classList.contains('prompt-input'));
			await page().type('Alpha');
			await page().waitFor(() => !!document.querySelector('.prompt .suggestion-item'));
			await settle();
			const result = await page().evaluate(() => !!document.querySelector('.prompt .notional-suggestion-item'));
			await page().press('Escape');
			return result;
		};

		await setFeature(page(), 'reskin-search', false);
		expect(await reskinned()).toBe(false);

		await setFeature(page(), 'reskin-search', true);
		expect(await reskinned()).toBe(true);
	});

	it('inline-note-rename: off, a double-click on a name cell does nothing; on again, it opens the rename input', async () => {
		await openFile(page(), 'Tasks/Tasks.base');
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .bases-table-cell .internal-link'));
		// Double-click on the name cell itself, outside its link
		const dblclickCell = () => page().evaluate(() => {
			const cell = document.querySelector('.workspace-leaf.mod-active .internal-link')!.closest('.bases-table-cell')!;
			cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
		});

		await setFeature(page(), 'inline-note-rename', false);
		await dblclickCell();
		await settle();
		expect(await page().evaluate(() => !!document.querySelector('.inline-rename-input'))).toBe(false);

		await setFeature(page(), 'inline-note-rename', true);
		await dblclickCell();
		await page().waitFor(() => !!document.querySelector('.inline-rename-input'));
		await page().press('Escape');
		await page().waitFor(() => !document.querySelector('.inline-rename-input'));
	});

	it('tag-colors: off, a colored tag gets its native look back; on again, its color', async () => {
		await createFile(page(), 'Tagged.md', '#toggled\n');
		await setColor(page(), 'toggled', 'blue');
		await page().evaluate(() => app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: 'Tagged.md', mode: 'preview' }, active: true }));
		const colored = () => page().evaluate(() => document.querySelectorAll('a.tag[data-notion-color]').length);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active a.tag[data-notion-color="blue"]'));

		await setFeature(page(), 'tag-colors', false);
		expect(await colored()).toBe(0);

		await setFeature(page(), 'tag-colors', true);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active a.tag[data-notion-color="blue"]'));
		await setColor(page(), 'toggled', null);
		await page().evaluate(() => app.vault.delete(app.vault.getAbstractFileByPath('Tagged.md')));
	});

	it('folder-page: off, "/page" shows no suggestion; on again, it does', async () => {
		await createFile(page(), 'Toggle folder page.md', '');
		await openFile(page(), 'Toggle folder page.md');
		// Types "/page Child" on a fresh line, returns whether the folder page suggestion shows
		const suggests = async () => {
			await page().evaluate(() => {
				const { editor } = app.workspace.activeEditor;
				editor.setValue('');
				editor.focus();
			});
			await page().type('/page Child');
			await settle();
			const shown = await page().evaluate(() => !!document.querySelector('.suggestion-container .folder-page-item'));
			await page().press('Escape');
			return shown;
		};

		await setFeature(page(), 'folder-page', false);
		expect(await suggests()).toBe(false);

		await setFeature(page(), 'folder-page', true);
		expect(await suggests()).toBe(true);
		await page().evaluate(() => app.vault.delete(app.vault.getAbstractFileByPath('Toggle folder page.md')));
	});

	it('select-property: off, cells lose their chips and markers and keep them off; on again, they come back', async () => {
		await openFile(page(), 'Tasks/Tasks.base');
		const marked = () => page().evaluate(() =>
			document.querySelectorAll('.notional-select-cell, .notional-select-note-property, .notional-value-chip, .bases-td[data-source-path]').length);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-select-cell .notional-value-chip'));

		await setFeature(page(), 'select-property', false);
		expect(await marked()).toBe(0);
		// No observer or listener left to mark them again
		await page().evaluate(() => app.workspace.trigger('layout-change'));
		await settle();
		expect(await marked()).toBe(0);

		await setFeature(page(), 'select-property', true);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-select-cell .notional-value-chip'));
	});

	it('icons: off, no icon or wrapper is left and tabs get their own icon back; on again, they come back', async () => {
		const setIcon = (icon: { icon: string; color: string } | null) => page().evaluate(async (config: { icon: string; color: string } | null) => {
			const { icons } = (app.plugins.plugins.notionalize.features as unknown as { context: { services: { icons: {
				set(path: string, c: unknown): Promise<void>; remove(path: string): Promise<void>;
			} } } }).context.services;
			await (config ? icons.set('Tasks/Tasks.base', config) : icons.remove('Tasks/Tasks.base'));
		}, icon);
		const rendered = () => !!document.querySelector('.notional-db-header > .notional-db-title-row .notional-icon-header')
			&& !!document.querySelector('.notional-icon-area')
			&& !!document.querySelector('.notional-icon-nav')
			&& !!document.querySelector('.workspace-tab-header.is-active .notional-icon-tab');
		await openFile(page(), 'Tasks/Tasks.base');
		await setIcon({ icon: 'star', color: 'red' });
		await page().evaluate(() => app.workspace.trigger('layout-change'));
		await page().waitFor(rendered);

		const leftovers = () => page().evaluate(() => ({
			icons: Array.from(document.querySelectorAll('[class*="notional-icon"], .notional-db-title-row')).map(el => el.className),
			// The base title is unwrapped, not removed
			title: !!document.querySelector('.notional-db-header > .notional-db-title'),
			// Obsidian's own view icon is back in the tab
			tabIcon: !!document.querySelector('.workspace-tab-header.is-active .workspace-tab-header-inner-icon > svg'),
		}));
		await setFeature(page(), 'icons', false);
		expect(await leftovers()).toEqual({ icons: [], title: true, tabIcon: true });
		// No observer or listener left to render them again
		await page().evaluate(() => app.workspace.trigger('layout-change'));
		await settle();
		expect(await leftovers()).toEqual({ icons: [], title: true, tabIcon: true });

		await setFeature(page(), 'icons', true);
		await page().waitFor(rendered);
		await setIcon(null);
	});

	it('title-mention: off, titles and base links show the plain name; on again, the chips come back', async () => {
		await createFile(page(), 'Toggle target.md', '');
		await createFile(page(), 'Tasks/Mention @Toggle target.md', '---\nstatus: Done\nmentions:\n  - "[[Toggle target]]"\n---\n');
		const leftovers = () => page().evaluate(() =>
			document.querySelectorAll('.notional-mention, .notional-title-mention, .notional-title-has-mention, .notional-mention-open, [data-notional-mention-key]').length);

		await openFile(page(), 'Tasks/Mention @Toggle target.md');
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-title-mention .notional-mention'));
		await setFeature(page(), 'title-mention', false);
		expect(await leftovers()).toBe(0);
		await setFeature(page(), 'title-mention', true);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .notional-title-mention .notional-mention'));

		await openBase(page(), 'Tasks/Tasks.base', 'Table');
		const link = () => page().waitFor(() => {
			const links = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .bases-view .internal-link'));
			return links.find(l => l.getAttribute('data-href')?.includes('Mention @Toggle'))?.textContent?.trim() ?? null;
		});
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .bases-view .notional-mention'));
		expect(await link()).toBe('Mention Toggle target');
		await setFeature(page(), 'title-mention', false);
		expect(await leftovers()).toBe(0);
		expect(await link()).toBe('Mention @Toggle target');
		// No observer or listener left to decorate them again
		await page().evaluate(() => app.workspace.trigger('layout-change'));
		await settle();
		expect(await leftovers()).toBe(0);

		await setFeature(page(), 'title-mention', true);
		await page().waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .bases-view .notional-mention'));
		await page().evaluate(async () => {
			for (const path of ['Tasks/Mention @Toggle target.md', 'Toggle target.md']) await app.vault.delete(app.vault.getAbstractFileByPath(path));
		});
	});

	it('side-peek: off, the open panel closes and a click opens the note in place; on again, in the panel', async () => {
		const clickTaskB = async () => {
			await openBase(page(), 'Tasks/Tasks.base', 'Table');
			await page().click(await page().waitFor(() => {
				const link = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .bases-tr .internal-link'))
					.find(l => l.textContent?.trim() === 'Task B');
				const rect = link?.getBoundingClientRect();
				return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
			}));
			await page().waitFor(() => app.workspace.getActiveFile()?.path === 'Tasks/Task B.md');
		};
		const peekEls = () => page().evaluate(() => document.querySelectorAll('[class*="notional-side-peek"]').length);

		await clickTaskB();
		await page().waitFor(() => !!document.querySelector('.notional-side-peek'));
		await setFeature(page(), 'side-peek', false);
		expect(await peekEls()).toBe(0);

		await clickTaskB();
		await settle();
		expect(await peekEls()).toBe(0);

		await setFeature(page(), 'side-peek', true);
		await clickTaskB();
		await page().waitFor(() => !!document.querySelector('.notional-side-peek'));
		await page().press('Escape');
		await page().waitFor(() => !document.querySelector('.notional-side-peek'));
	});

	it('timeline: off, an open timeline gives way to the unknown view message; on again, it comes back', async () => {
		await openBase(page(), 'Tasks/Tasks.base', 'Timeline');
		const bars = () => page().waitFor(() => document.querySelectorAll('.workspace-leaf.mod-active .notional-timeline-bar').length || null);
		await bars();
		const state = () => page().evaluate(() => {
			// The message replaces the view container, next to it
			const view = document.querySelector('.workspace-leaf.mod-active .view-content') as HTMLElement;
			return {
				leftovers: document.querySelectorAll('[class*="notional-timeline"]').length + (document.body.dataset.notionalTimelineCursor ? 1 : 0),
				unknown: view.innerText.includes('unknown view type'),
			};
		});

		await setFeature(page(), 'timeline', false);
		expect(await state()).toEqual({ leftovers: 0, unknown: true });
		await setFeature(page(), 'timeline', true);
		await bars();
		expect((await state()).unknown).toBe(false);
	});

	it('board: off, an open board gives way to the unknown view message; on again, it comes back', async () => {
		await openBase(page(), 'Tasks/Tasks.base', 'Board');
		const cards = () => page().waitFor(() => document.querySelectorAll('.workspace-leaf.mod-active .notional-board-card').length || null);
		await cards();
		const state = () => page().evaluate(() => {
			// The message replaces the view container, next to it
			const view = document.querySelector('.workspace-leaf.mod-active .view-content') as HTMLElement;
			return {
				leftovers: document.querySelectorAll('[class*="notional-board"]').length,
				unknown: view.innerText.includes('unknown view type'),
			};
		});

		await setFeature(page(), 'board', false);
		expect(await state()).toEqual({ leftovers: 0, unknown: true });
		await setFeature(page(), 'board', true);
		await cards();
		expect((await state()).unknown).toBe(false);
	});

	it('leaves nothing behind with every feature off, then turns them all back on', async () => {
		await page().evaluate(async () => {
			await app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath('Tasks/Tasks.base'));
		});
		await page().waitFor(() => !!document.querySelector('.notional-db-header'));

		await page().evaluate(async () => {
			const { features } = app.plugins.plugins.notionalize;
			const ids: string[] = features.definitions.map((d: { id: string }) => d.id);
			for (const id of [...ids].reverse()) await features.disable(id);
		});
		const leftovers = await page().evaluate(() =>
			Array.from(document.querySelectorAll('[class*="notional-"]')).map(el => `${el.tagName} ${el.className}`),
		);
		expect(leftovers).toEqual([]);

		await page().evaluate(async () => {
			const { features } = app.plugins.plugins.notionalize;
			for (const { id } of features.definitions as { id: string }[]) await features.enable(id);
		});
		await page().waitFor(() => !!document.querySelector('.notional-db-header') && !!document.querySelector('.notional-icon-nav'));
	});
});
