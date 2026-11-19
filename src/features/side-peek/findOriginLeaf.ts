import type { App, WorkspaceLeaf } from 'obsidian';

// The page behind the panel: the most recent main area leaf outside the panel's
// tab group (after a restart, the most recent one can be the panel itself).
export function findOriginLeaf(app: App, peekLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
	const recent = app.workspace.getMostRecentLeaf(app.workspace.rootSplit);
	if (recent && recent.parent !== peekLeaf.parent) return recent;
	let origin: WorkspaceLeaf | null = null;
	app.workspace.iterateRootLeaves((leaf) => {
		if (!origin && leaf.parent !== peekLeaf.parent) origin = leaf;
	});
	return origin;
}
