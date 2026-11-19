import type { App } from 'obsidian';
import type { BasesControllerInternal, BasesViewInternal } from './types';

// The tab showing this controller's base; null for a base embedded in a note
export function findHostView(app: App, controller: BasesControllerInternal): BasesViewInternal | null {
	for (const leaf of app.workspace.getLeavesOfType('bases')) {
		const view = leaf.view as unknown as BasesViewInternal;
		if (view.controller === controller) return view;
	}
	return null;
}
