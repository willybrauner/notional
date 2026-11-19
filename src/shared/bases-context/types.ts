import type { TFile, WorkspaceLeaf } from 'obsidian';

// Not in the public API: the query controller of a base (tab or embed).
// updateCurrentFile sets `this` (filters, formulas) and re-runs the query.
export interface BasesControllerInternal {
	updateCurrentFile: (this: BasesControllerInternal, file: TFile | null) => void;
}

// Not in the public API: the `bases` view of a tab. On each `file-open`,
// its updateCurrentFile forwards the active file to its controller.
export interface BasesViewInternal {
	file: TFile | null;
	leaf: WorkspaceLeaf;
	controller?: BasesControllerInternal;
	updateCurrentFile?: (file: TFile | null) => void;
}
