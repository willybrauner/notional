import type { App, TFile } from 'obsidian';
import { renameNote } from '../../utils/renameNote';
import { isMentionLink } from './isMentionLink';
import { mentionToken } from './mentionToken';

/**
 * A mentioned note (or base, canvas) was renamed: renames each note mentioning it so its title
 * shows "@new name" (Obsidian updates the frontmatter link itself).
 */
export async function followTargetRename(app: App, target: TFile, oldPath: string): Promise<void> {
	const oldName = oldPath.split('/').pop() ?? '';
	const oldBasename = oldName.replace(/\.[^.]+$/, '');
	if (!oldBasename || oldBasename === target.basename) return;

	const oldToken = mentionToken(oldBasename);
	// Links to a note drop ".md", links to a base or canvas keep their extension
	const oldLinkpaths = [oldBasename, oldName, oldPath, oldPath.replace(/\.md$/, '')];
	const hosts = app.vault.getMarkdownFiles().filter(host => {
		if (host === target || !host.basename.includes(oldToken)) return false;
		return (app.metadataCache.getFileCache(host)?.frontmatterLinks ?? []).some(l => {
			if (!isMentionLink(l)) return false;
			const linkpath = l.link.split('#')[0] ?? '';
			return oldLinkpaths.includes(linkpath)
				|| app.metadataCache.getFirstLinkpathDest(linkpath, host.path) === target;
		});
	});

	for (const host of hosts) {
		await renameNote(app, host, host.basename.replace(oldToken, mentionToken(target.basename)));
	}
}
