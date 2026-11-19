import { MENTION_PREFIX } from './constants';

/**
 * How a mention is written in the file name: "@Super page". The prefix keeps the
 * host from ever taking the target's name (a title made of the mention alone
 * would duplicate it, and Obsidian then rewrites every link to the target).
 */
export function mentionToken(basename: string): string {
	return `${MENTION_PREFIX}${basename}`;
}
