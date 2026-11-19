import type { PaneType, Workspace } from 'obsidian';

type Intercept = (linktext: string, sourcePath: string, newLeaf?: PaneType | boolean) => boolean;

// Every base view (table, cards, list, timeline…) opens notes through
// `workspace.openLinkText`: `intercept` returns true to take the call over.
// Returns the restore function.
export function patchOpenLinkText(workspace: Workspace, intercept: Intercept): () => void {
	const original = workspace.openLinkText.bind(workspace);
	const patched: Workspace['openLinkText'] = (linktext, sourcePath, newLeaf, openViewState) => {
		if (intercept(linktext, sourcePath, newLeaf)) return Promise.resolve();
		return original(linktext, sourcePath, newLeaf, openViewState);
	};
	workspace.openLinkText = patched;
	return () => {
		// Only if nobody patched it after us
		if (workspace.openLinkText === patched) workspace.openLinkText = original;
	};
}
