import { Modal } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { CLASSES } from './constants';

const MAX_LISTED = 6;

/** "Delete N notes?" confirmation. Enter confirms, Escape cancels. */
export class ConfirmDeleteModal extends Modal {
	private files: TFile[];
	private onConfirm: () => void;

	constructor(app: App, files: TFile[], onConfirm: () => void) {
		super(app);
		this.files = files;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const count = this.files.length;
		this.setTitle(count === 1 ? 'Delete this note?' : `Delete ${count} notes?`);

		const list = this.contentEl.createEl('ul', { cls: CLASSES.confirmList });
		this.files.slice(0, MAX_LISTED).forEach(f => list.createEl('li', { text: f.basename }));
		if (count > MAX_LISTED) list.createEl('li', { text: `and ${count - MAX_LISTED} more…` });

		const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' });
		buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
		const confirm = buttons.createEl('button', { text: 'Delete', cls: 'mod-warning' });
		confirm.addEventListener('click', () => this.confirm());

		this.scope.register([], 'Enter', evt => { evt.preventDefault(); this.confirm(); });
		window.setTimeout(() => confirm.focus(), 0);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private confirm(): void {
		this.close();
		this.onConfirm();
	}
}
