import type { App, WorkspaceLeaf } from 'obsidian';
import { OPEN_LEAF_STORAGE_KEY } from './constants';

// The workspace layout is saved with the side peek's split, so a peek still open
// when Obsidian quit or reloaded comes back as a regular split. Its leaf id was
// kept until closed: returns that leaf, to be turned back into a side peek.
export function findLeftoverPeekLeaf(app: App): WorkspaceLeaf | null {
	const id: unknown = app.loadLocalStorage(OPEN_LEAF_STORAGE_KEY);
	if (typeof id !== 'string') return null;
	const workspace = app.workspace as unknown as { getLeafById(id: string): WorkspaceLeaf | null };
	const leaf = workspace.getLeafById(id);
	if (!leaf) app.saveLocalStorage(OPEN_LEAF_STORAGE_KEY, null);
	return leaf;
}
