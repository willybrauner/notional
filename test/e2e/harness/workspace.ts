import type { ObsidianPage } from './ObsidianPage';

// Vault and workspace shortcuts for specs. Each runs inside the Obsidian window.

/** Opens a file in the active tab and waits for its view. */
export async function openFile(page: ObsidianPage, path: string): Promise<void> {
	await page.evaluate(async (p: string) => {
		await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath(p));
	}, path);
	await page.waitFor((p: string) => app.workspace.getActiveFile()?.path === p, path);
}

/** Opens a .base file on one of its views. */
export async function openBase(page: ObsidianPage, path: string, viewName: string): Promise<void> {
	await page.evaluate(async (p: string, name: string) => {
		await app.workspace.getLeaf(false).setViewState({ type: 'bases', state: { file: p, viewName: name }, active: true });
	}, path, viewName);
	await page.waitFor(() => !!document.querySelector('.workspace-leaf.mod-active .bases-view'));
}

export async function createFile(page: ObsidianPage, path: string, content = ''): Promise<void> {
	await page.evaluate(async (p: string, c: string) => {
		const folder = p.split('/').slice(0, -1).join('/');
		if (folder && !app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
		await app.vault.create(p, c);
	}, path, content);
}

export function exists(page: ObsidianPage, path: string): Promise<boolean> {
	return page.evaluate((p: string) => !!app.vault.getAbstractFileByPath(p), path);
}

export function readFile(page: ObsidianPage, path: string): Promise<string> {
	return page.evaluate((p: string) => app.vault.adapter.read(p) as Promise<string>, path);
}

/** Frontmatter as indexed by Obsidian (waits for the metadata cache). */
export function frontmatter(page: ObsidianPage, path: string): Promise<Record<string, unknown>> {
	return page.evaluate((p: string) => app.metadataCache.getCache(p)?.frontmatter ?? {}, path);
}

export function activePath(page: ObsidianPage): Promise<string | null> {
	return page.evaluate(() => app.workspace.getActiveFile()?.path ?? null);
}

/** Turns a feature off or on while Obsidian runs, and checks it took effect. */
export async function setFeature(page: ObsidianPage, id: string, enabled: boolean): Promise<void> {
	await page.evaluate(async (featureId: string, on: boolean) => {
		const { features } = app.plugins.plugins.notionalize;
		await (on ? features.enable(featureId) : features.disable(featureId));
	}, id, enabled);
	await page.waitFor((featureId: string, on: boolean) =>
		app.plugins.plugins.notionalize.features.isRunning(featureId) === on
		&& document.body.classList.contains(`notional-feature-${featureId}`) === on, id, enabled);
}

/** Renames through the file manager, like the file explorer does. */
export async function renameFile(page: ObsidianPage, from: string, to: string): Promise<void> {
	await page.evaluate(async (f: string, t: string) => {
		await app.fileManager.renameFile(app.vault.getAbstractFileByPath(f), t);
	}, from, to);
}

/** Colors a value in the shared color store (not public: reached through the feature manager). */
export async function setColor(page: ObsidianPage, value: string, color: string | null): Promise<void> {
	await page.evaluate((v: string, c: string | null) =>
		(app.plugins.plugins.notionalize.features as unknown as { context: { services: { colors: { set(v: string, c: string | null): Promise<void> } } } })
			.context.services.colors.set(v, c), value, color);
}
