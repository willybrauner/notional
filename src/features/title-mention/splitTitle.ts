import type { TFile } from 'obsidian';
import { mentionToken } from './mentionToken';

export interface TitleSegment {
	text: string;
	target?: TFile;
}

/**
 * Splits `title` into plain text and mention segments, each "@target" found left
 * to right. A mention segment shows the target name, without the "@".
 */
export function splitTitle(title: string, targets: TFile[]): TitleSegment[] {
	const segments: TitleSegment[] = [];
	let rest = title;
	for (const target of targets) {
		const token = mentionToken(target.basename);
		const index = rest.indexOf(token);
		if (index < 0 || !target.basename) continue;
		if (index > 0) segments.push({ text: rest.slice(0, index) });
		segments.push({ text: target.basename, target });
		rest = rest.slice(index + token.length);
	}
	if (rest) segments.push({ text: rest });
	return segments;
}
