import type { App, TFile } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import { createMentionChip } from './createMentionChip';
import { readMentionTargets } from './readMentionTargets';
import { splitTitle } from './splitTitle';

/** Appends the title of `file` to `parent`: plain text, with a chip for each mentioned note. */
export function renderTitleSegments(parent: HTMLElement, app: App, file: TFile, iconStore: IconStore): void {
	for (const segment of splitTitle(file.basename, readMentionTargets(app, file))) {
		if (segment.target) parent.appendChild(createMentionChip(segment.target, iconStore));
		else parent.appendText(segment.text);
	}
}
