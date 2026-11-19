import { App, getLinkpath, TFile } from 'obsidian';

// Resolves a link to a markdown note; anything else (base, canvas, media…) returns null.
export function resolveMarkdownFile(app: App, linktext: string, sourcePath: string): TFile | null {
	const file = app.metadataCache.getFirstLinkpathDest(getLinkpath(linktext), sourcePath);
	return file?.extension === 'md' ? file : null;
}
