// =============================================================================
// TABLE CLIPBOARD FEATURE - Cmd+C / Cmd+V on the keyboard-selected cells of a base table
// =============================================================================

import { Feature } from '../../core/Feature';
import { CLIPBOARD_EVENTS } from './constants';
import { forwardToTable } from './forwardToTable';

export class TableClipboardFeature extends Feature {
	onload() {
		this.listen(activeDocument);
		this.registerEvent(this.app.workspace.on('window-open', win => this.listen(win.doc)));
	}

	private listen(doc: Document): void {
		for (const type of CLIPBOARD_EVENTS) {
			this.registerDomEvent(doc, type, forwardToTable, true);
		}
	}
}
