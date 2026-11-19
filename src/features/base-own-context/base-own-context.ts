import { Feature } from '../../core/Feature';
import { findBasesView } from '../../shared/bases-context/findBasesView';
import { isInSidebar } from '../../shared/bases-context/isInSidebar';
import { patchUpdateCurrentFile } from '../../shared/bases-context/patchUpdateCurrentFile';
import type { BasesControllerInternal, BasesViewInternal } from '../../shared/bases-context/types';

// A base opened in a tab keeps itself as `this`, whatever tab has the focus.
export class BaseOwnContextFeature extends Feature {
	// Set while the controller prototype is patched
	private restorePatch: (() => void) | null = null;

	onload() {
		this.onLayoutReady(() => this.tryPatch());
		this.registerEvent(this.app.workspace.on('layout-change', () => this.tryPatch()));
	}

	// Native behavior back on every loaded base
	onunload() {
		if (!this.restorePatch) return;
		this.restorePatch();
		this.restorePatch = null;
		this.resync();
	}

	// The controller class is internal: its prototype is reached through the first loaded base
	private tryPatch() {
		if (this.restorePatch) return;
		const controller = findBasesView(this.app)?.controller;
		if (!controller) return;
		const proto = Object.getPrototypeOf(controller) as BasesControllerInternal;
		this.restorePatch = patchUpdateCurrentFile(this.app, proto);
		this.resync();
	}

	// Re-applies the context of every loaded base (patched or restored behavior)
	private resync() {
		const activeFile = this.app.workspace.getActiveFile();
		for (const leaf of this.app.workspace.getLeavesOfType('bases')) {
			const view = leaf.view as unknown as BasesViewInternal;
			view.controller?.updateCurrentFile(isInSidebar(this.app, leaf) ? activeFile : view.file);
		}
	}
}
