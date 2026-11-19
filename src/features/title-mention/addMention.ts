import type { App, TFile } from 'obsidian';
import { PROPERTY } from './constants';

/** Adds `[[target]]` to the `mentions` frontmatter list of `host`. */
export async function addMention(app: App, host: TFile, target: TFile): Promise<void> {
	const link = `[[${app.metadataCache.fileToLinktext(target, host.path)}]]`;
	await app.fileManager.processFrontMatter(host, (fm: Record<string, unknown>) => {
		const current = fm[PROPERTY];
		const list = Array.isArray(current) ? current.filter((v): v is string => typeof v === 'string') : [];
		if (!list.includes(link)) list.push(link);
		fm[PROPERTY] = list;
	});
}
