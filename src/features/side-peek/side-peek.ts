import { PaneType, TFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import type { FeatureContext } from '../../core/types';
import { ATTRS, CLASSES } from './constants';
import { closeHoverPopover } from './closeHoverPopover';
import { createSidePeek, SidePeek } from './createSidePeek';
import { findLeftoverPeekLeaf } from './findLeftoverPeekLeaf';
import { getActiveTableCellLink } from './getActiveTableCellLink';
import { isNewItemPopover } from './isNewItemPopover';
import { patchOpenLinkText } from './patchOpenLinkText';
import { resolveMarkdownFile } from './resolveMarkdownFile';
import { getSoleMentionTarget } from '../title-mention/getSoleMentionTarget';

// Opens notes from bases (any view, and new items) in a Notion-like side peek.
// Desktop app only (`desktopOnly` in the registry): nothing is set up on mobile.
export class SidePeekFeature extends Feature {
	private peek: SidePeek | null = null;
	private isBaseInteraction = false;
	// Enter (not a click) opens the note mentioned by a title made of that mention only
	private isBaseEnter = false;
	private newItemObserver: MutationObserver | null = null;
	// New item popovers hidden while waiting to be taken over, and their observer
	private pendingNewItems = new Map<HTMLElement, MutationObserver>();

	constructor(ctx: FeatureContext) {
		super(ctx);
	}

	onload() {
		this.onLayoutReady(() => this.restoreLeftoverPeek());
		this.watchBaseInteractions();
		this.watchNewItemPopovers();
		this.register(patchOpenLinkText(this.app.workspace, (linktext, sourcePath, newLeaf) =>
			this.interceptLink(linktext, sourcePath, newLeaf)
		));
	}

	// Closes the panel, and gives a new item popover still waiting its native look back
	onunload() {
		this.peek?.close(false);
		this.newItemObserver?.disconnect();
		this.newItemObserver = null;
		this.pendingNewItems.forEach((observer, hoverEl) => {
			observer.disconnect();
			hoverEl.removeClass(CLASSES.hiddenNative);
		});
		this.pendingNewItems.clear();
	}

	private open(file: TFile, eState?: Record<string, unknown>) {
		this.peek ??= createSidePeek(this.app, () => { this.peek = null; });
		void this.peek.open(file, eState);
	}

	// A peek open at the last quit/reload comes back as it was
	private restoreLeftoverPeek() {
		const leaf = findLeftoverPeekLeaf(this.app);
		if (leaf && !this.peek) this.peek = createSidePeek(this.app, () => { this.peek = null; }, leaf);
	}

	// Flags plain clicks and Enter inside a base for the duration of their dispatch,
	// so only notes opened from a base are intercepted. `pointerup` covers views
	// opening on release to tell clicks from drags (timeline bars).
	private watchBaseInteractions() {
		const onPointer = (evt: MouseEvent) => {
			if (evt.button !== 0 || hasModifier(evt) || !isInBase(evt.target)) return;
			this.flagBaseInteraction();
		};
		this.registerDomEvent(activeDocument, 'click', onPointer, true);
		this.registerDomEvent(activeDocument, 'pointerup', onPointer, true);
		this.registerDomEvent(activeDocument, 'keydown', (evt) => this.onBaseEnter(evt), true);
	}

	// Enter on a keyboard-selected note: cards (and alike) open it through
	// openLinkText. Tables do nothing on the file name cell: open its note here.
	// Not while editing a cell (focus is then in its input, not on the table).
	private onBaseEnter(evt: KeyboardEvent) {
		if (evt.key !== 'Enter' || evt.isComposing || hasModifier(evt) || !isInBase(evt.target)) return;
		if (evt.targetNode?.instanceOf(HTMLElement) && evt.targetNode.hasClass(CLASSES.tableContainer)) {
			const href = getActiveTableCellLink(evt.targetNode)?.getAttribute(ATTRS.href);
			const file = href ? resolveMarkdownFile(this.app, href, '') : null;
			if (file) {
				evt.preventDefault();
				this.open(getSoleMentionTarget(this.app, file) ?? file);
			}
			return;
		}
		this.flagBaseInteraction(true);
	}

	private flagBaseInteraction(isEnter = false) {
		this.isBaseInteraction = true;
		this.isBaseEnter = isEnter;
		window.setTimeout(() => {
			this.isBaseInteraction = false;
			this.isBaseEnter = false;
		});
	}

	private interceptLink(linktext: string, sourcePath: string, newLeaf?: PaneType | boolean): boolean {
		if (!this.isBaseInteraction || newLeaf) return false;
		const file = resolveMarkdownFile(this.app, linktext, sourcePath);
		if (!file) return false;
		this.isBaseInteraction = false;
		this.open(this.isBaseEnter ? getSoleMentionTarget(this.app, file) ?? file : file);
		return true;
	}

	// Popovers are appended to the body: watching its direct children is enough.
	private watchNewItemPopovers() {
		this.newItemObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (isNewItemPopover(node)) this.takeOverNewItem(node);
				}
			}
		});
		this.newItemObserver.observe(activeDocument.body, { childList: true });
	}

	// The native new item popover stays hidden. Once Obsidian flags it as ready
	// (its editor is the active one, on the new note), it is closed and the note
	// reopened in the side peek with its title selected.
	private takeOverNewItem(hoverEl: HTMLElement) {
		hoverEl.addClass(CLASSES.hiddenNative);
		const observer = new MutationObserver(() => {
			if (!hoverEl.hasClass(CLASSES.newItemPopover)) return;
			observer.disconnect();
			this.pendingNewItems.delete(hoverEl);
			const file = this.app.workspace.activeEditor?.file;
			closeHoverPopover(hoverEl);
			if (file) this.open(file, { rename: 'all' });
		});
		observer.observe(hoverEl, { attributes: true, attributeFilter: ['class'] });
		this.pendingNewItems.set(hoverEl, observer);
	}
}

function hasModifier(evt: MouseEvent | KeyboardEvent): boolean {
	return evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey;
}

// Element, not HTMLElement: clicks often land on SVG icons
function isInBase(target: EventTarget | null): target is Element {
	return target instanceof Element && !!target.closest(`.${CLASSES.basesView}`);
}
