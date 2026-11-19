import type { App, TFile } from 'obsidian';
import { readMentionTargets } from './readMentionTargets';
import { splitTitle } from './splitTitle';

/** Mentioned note when the title of `file` is that mention alone (e.g. "[chip Super page]"), else null. */
export function getSoleMentionTarget(app: App, file: TFile): TFile | null {
	const segments = splitTitle(file.basename, readMentionTargets(app, file)).filter(s => s.target || s.text.trim());
	const target = segments.length === 1 ? segments[0]?.target : undefined;
	return target?.extension === 'md' ? target : null;
}
