import type { App } from 'obsidian';
import type { BasesViewInternal } from './types';

// A loaded `bases` view (deferred views have no controller yet)
export function findBasesView(app: App): BasesViewInternal | null {
	for (const leaf of app.workspace.getLeavesOfType('bases')) {
		const view = leaf.view as unknown as BasesViewInternal;
		if (typeof view.controller?.updateCurrentFile === 'function') return view;
	}
	return null;
}
