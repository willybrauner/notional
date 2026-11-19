import type { App, TFile } from 'obsidian';
import { MENTION_PREFIX } from './constants';
import { mentionToken } from './mentionToken';
import { pruneMentions } from './pruneMentions';
import { readMentionTargets } from './readMentionTargets';

/**
 * Drops the mentions missing from their note title (titles edited while the plugin was off).
 * A title that still has an "@name" matching none of its mentions is left as it is: the
 * mentioned note was likely renamed while the plugin was off, and its mention is kept.
 */
export async function pruneAllMentions(app: App): Promise<void> {
	for (const host of app.vault.getMarkdownFiles()) {
		const targets = readMentionTargets(app, host);
		if (!targets.length || hasUnmatchedMention(host, targets)) continue;
		await pruneMentions(app, host);
	}
}

// The title, without the "@target" of its mentions, still has a mention prefix
function hasUnmatchedMention(host: TFile, targets: TFile[]): boolean {
	let rest = host.basename;
	for (const target of targets) rest = rest.replace(mentionToken(target.basename), '');
	return rest.includes(MENTION_PREFIX);
}
