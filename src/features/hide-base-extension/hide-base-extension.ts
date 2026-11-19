import { FileView, TFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import { CLASSES, FILE_EXT, PROCESSED_ATTR } from './constants';
import { restoreLinks } from './restoreLinks';

// Links shown inside an open base read "tasks" instead of "tasks.base"
export class HideBaseExtensionFeature extends Feature {
	private observer: MutationObserver | null = null;

	onload() {
		this.registerEvent(
			this.app.workspace.on('file-open', (file: TFile | null) => {
				this.onFileOpen(file);
			})
		);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.detectCurrentBase();
			})
		);

		this.onLayoutReady(() => this.detectCurrentBase());
	}

	onunload() {
		this.stopObserving();
		// Every leaf, popout windows included (their links are not in this document)
		this.app.workspace.iterateAllLeaves((leaf) => restoreLinks(leaf.view.containerEl));
	}

	private detectCurrentBase() {
		const leaf = this.app.workspace.getLeaf(false);
		const file = leaf?.view instanceof FileView ? leaf.view.file : null;
		this.onFileOpen(file);
	}

	private onFileOpen(file: TFile | null) {
		this.stopObserving();

		if (!file || file.extension !== 'base') return;

		const leaf = this.app.workspace.getLeaf(false);
		if (!leaf?.view) return;

		const viewContent = leaf.view.containerEl.querySelector(`.${CLASSES.viewContent}`) as HTMLElement;
		if (!viewContent) return;

		this.processLinks(viewContent);
		this.startObserving(viewContent);
	}

	private processLinks(container: HTMLElement) {
		container.querySelectorAll<HTMLElement>(`.${CLASSES.internalLink}`).forEach((link) => {
			if (link.hasAttribute(PROCESSED_ATTR)) return;
			// Mark before mutating text to prevent observer re-entry
			link.setAttribute(PROCESSED_ATTR, '1');

			const text = link.textContent || '';
			if (text.endsWith(FILE_EXT.base)) {
				link.textContent = text.slice(0, -FILE_EXT.base.length);
				link.classList.add(CLASSES.internalLinkBase);
			}
		});
	}

	private startObserving(container: HTMLElement) {
		this.observer = new MutationObserver(() => {
			this.processLinks(container);
		});

		this.observer.observe(container, { childList: true, subtree: true });
	}

	private stopObserving() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}
}
