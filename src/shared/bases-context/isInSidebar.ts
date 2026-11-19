import type { App, WorkspaceLeaf } from 'obsidian';

export function isInSidebar(app: App, leaf: WorkspaceLeaf): boolean {
	const root = leaf.getRoot();
	return root === app.workspace.leftSplit || root === app.workspace.rightSplit;
}
