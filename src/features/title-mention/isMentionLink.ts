import type { FrontmatterLinkCache } from 'obsidian';
import { PROPERTY } from './constants';

/** Link of the `mentions` frontmatter list (keys `mentions`, `mentions.0`…). */
export function isMentionLink(link: FrontmatterLinkCache): boolean {
	return link.key === PROPERTY || link.key.startsWith(`${PROPERTY}.`);
}
