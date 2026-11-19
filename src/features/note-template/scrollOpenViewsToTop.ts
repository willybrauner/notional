import { App, MarkdownView, TFile } from 'obsidian';

// A note can already be open when its template lands (e.g. created from a base
// "New" button, shown in the side peek): the editor gets it as an external change
// that moves the cursor to the end and scrolls down. Bring those views back to the top.
export function scrollOpenViewsToTop(app: App, file: TFile): void {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (!(view instanceof MarkdownView) || view.file !== file) continue;
		view.editor.setCursor(0, 0);
		view.editor.scrollTo(null, 0);
	}
}
