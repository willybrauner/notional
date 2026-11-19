import type { App, TFile } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import { readMentionTargets } from './readMentionTargets';

/** Cache key of a rendered title: changes with the name, the mentions, their names and icons. */
export function mentionKey(app: App, file: TFile, iconStore: IconStore): string {
	const targets = readMentionTargets(app, file).map(t => {
		const { icon, color } = iconStore.resolve(t.path);
		return `${t.path}:${icon}:${color}`;
	});
	// Icons turned off or on: the chips render again
	return [file.basename, iconStore.shown, ...targets].join('|');
}
