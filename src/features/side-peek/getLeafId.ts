import type { WorkspaceLeaf } from 'obsidian';

// Leaf ids are stable across restarts (saved in the workspace layout) but not in the public API
export function getLeafId(leaf: WorkspaceLeaf): string {
	return (leaf as unknown as { id: string }).id;
}
