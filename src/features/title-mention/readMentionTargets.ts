import type { App, TFile } from 'obsidian';
import { isMentionLink } from './isMentionLink';

/** Notes mentioned in the title of `file` (frontmatter `mentions`), unresolved links skipped. */
export function readMentionTargets(app: App, file: TFile): TFile[] {
	const links = app.metadataCache.getFileCache(file)?.frontmatterLinks ?? [];
	const targets: TFile[] = [];
	for (const link of links) {
		if (!isMentionLink(link)) continue;
		const target = app.metadataCache.getFirstLinkpathDest(link.link, file.path);
		if (target && !targets.includes(target)) targets.push(target);
	}
	return targets;
}
