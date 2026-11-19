import type { App, WorkspaceLeaf } from 'obsidian';
import type { BasesControllerInternal, BasesViewInternal } from './types';

/**
 * Keeps the bases behind the side peek on their own context while it is open:
 * otherwise the peeked note becomes `this` and filters like
 * `file.folder == this.file.folder` empty the base. Returns the restore
 * function, which re-syncs the bases with the active file.
 */
export function freezeBaseContext(app: App, peekLeaf: WorkspaceLeaf): () => void {
	const frozen: BasesViewInternal[] = [];
	for (const leaf of app.workspace.getLeavesOfType('bases')) {
		if (leaf.parent === peekLeaf.parent) continue;
		const view = leaf.view as unknown as BasesViewInternal;
		const controller = view.controller;
		// Own property: already frozen (an instance override, the prototype keeps the original)
		if (typeof controller?.updateCurrentFile !== 'function') continue;
		if (Object.prototype.hasOwnProperty.call(controller, 'updateCurrentFile')) continue;
		controller.updateCurrentFile = () => {};
		frozen.push(view);
	}
	return () => {
		for (const view of frozen) {
			if (view.controller) delete (view.controller as Partial<BasesControllerInternal>).updateCurrentFile;
			view.updateCurrentFile?.(app.workspace.getActiveFile());
		}
	};
}
