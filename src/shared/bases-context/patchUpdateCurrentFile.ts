import type { App, TFile } from 'obsidian';
import { findHostView } from './findHostView';
import { isInSidebar } from './isInSidebar';
import type { BasesControllerInternal } from './types';

// Natively, on each `file-open` and active leaf change, a base in a tab sets `this`
// to the active file, even when that file is in another tab. For a base in a tab
// outside the sidebars, `this` is now always the base itself. Patched on the
// controller: the views' event handlers hold their own method, not the prototype's.
// Returns the restore function. side-peek's freezeBaseContext overrides it per
// instance on top of this patch.
export function patchUpdateCurrentFile(app: App, proto: BasesControllerInternal): () => void {
	const original = proto.updateCurrentFile;
	proto.updateCurrentFile = function (this: BasesControllerInternal, file: TFile | null) {
		const host = findHostView(app, this);
		const isOwnContext = host && !isInSidebar(app, host.leaf);
		return original.call(this, isOwnContext ? host.file : file);
	};
	return () => { proto.updateCurrentFile = original; };
}
