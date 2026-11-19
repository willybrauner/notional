import type { App, TFile } from 'obsidian';
import { ORDER_PROPERTY } from '../constants';

/** Writes the manual order value of a note into its frontmatter. */
export async function writeEntryOrder(app: App, file: TFile, order: number): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		fm[ORDER_PROPERTY] = order;
	});
}
