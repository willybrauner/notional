import type { App, TFile } from 'obsidian';
import { PROPERTY } from './constants';
import { isMentionLink } from './isMentionLink';
import { mentionToken } from './mentionToken';

/**
 * Removes the mentions of `host` whose "@target" is no longer in its title.
 * Unresolved links are kept: Obsidian may not have updated them yet after a
 * target rename, or the target is gone (rendered as plain text).
 */
export async function pruneMentions(app: App, host: TFile): Promise<void> {
	const links = (app.metadataCache.getFileCache(host)?.frontmatterLinks ?? [])
		.filter(isMentionLink);
	const stale = links.filter(l => {
		const target = app.metadataCache.getFirstLinkpathDest(l.link, host.path);
		return target && !host.basename.includes(mentionToken(target.basename));
	});
	if (!stale.length) return;

	const staleValues = new Set(stale.map(l => l.original));
	await app.fileManager.processFrontMatter(host, (fm: Record<string, unknown>) => {
		const current = fm[PROPERTY];
		if (!Array.isArray(current)) return;
		const kept = current.filter(v => typeof v !== 'string' || !staleValues.has(v));
		if (kept.length) fm[PROPERTY] = kept;
		else delete fm[PROPERTY];
	});
}
