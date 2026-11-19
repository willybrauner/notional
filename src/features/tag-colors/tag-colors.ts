// =============================================================================
// TAG COLORS FEATURE - Notion colors on tags (shared with selects and board)
// =============================================================================

import { Menu } from 'obsidian';
import { Feature } from '../../core/Feature';
import { ATTRS } from '../../services/colors/constants';
import { openColorPalette } from '../../services/colors/palette/openColorPalette';
import { buildTagStylesheet } from './buildTagStylesheet';
import { CLASSES, DECORATED_SELECTOR } from './constants';
import { decorateTags } from './decorateTags';
import { findTagElement } from './findTagElement';
import { readTagName } from './readTagName';
import { TagSuggestModal } from './TagSuggestModal';

// What the feature adds to one window (main or popout)
interface WindowState {
	// Constructed stylesheet (no <style> element) holding the editor hashtag rules,
	// built by that window: a stylesheet can't be adopted by another document
	sheet: CSSStyleSheet;
	observer: MutationObserver;
}

export class TagColorsFeature extends Feature {
	private readonly colors = this.ctx.services.colors;
	private windows = new Map<Document, WindowState>();

	onload() {
		this.attach(activeDocument);
		// Popouts already open, then the ones opened later
		this.app.workspace.iterateAllLeaves(leaf => this.attach(leaf.view.containerEl.doc));
		this.registerEvent(this.app.workspace.on('window-open', win => this.attach(win.doc)));
		this.registerEvent(this.app.workspace.on('window-close', win => this.detach(win.doc)));
		this.register(this.colors.onChange(() => this.refresh()));

		this.plugin.addCommand({
			id: 'set-tag-color',
			name: 'Set tag color',
			callback: () => new TagSuggestModal(this.app, this.colors, tag => this.pickFromCenter(tag)).open(),
		});
	}

	onunload() {
		[...this.windows.keys()].forEach(doc => this.detach(doc));
		activeDocument.querySelectorAll(`.${CLASSES.paletteAnchor}`).forEach(el => el.remove());
	}

	// Colors the tags of a window and keeps them colored
	private attach(doc: Document): void {
		if (this.windows.has(doc)) return;
		const sheet = new (doc.win as Window & typeof globalThis).CSSStyleSheet();
		sheet.replaceSync(buildTagStylesheet(this.colors.map));
		doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
		const observer = new MutationObserver(mutations => this.onMutations(mutations));
		observer.observe(doc.body, { childList: true, subtree: true });
		this.windows.set(doc, { sheet, observer });
		decorateTags(doc.body, this.colors.map);
		this.registerDomEvent(doc, 'contextmenu', evt => this.onContextMenu(evt), true);
	}

	// Tags of a window back to their native look
	private detach(doc: Document): void {
		const state = this.windows.get(doc);
		if (!state) return;
		state.observer.disconnect();
		doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter(sheet => sheet !== state.sheet);
		doc.querySelectorAll(DECORATED_SELECTOR).forEach(el => el.removeAttribute(ATTRS.notionColor));
		this.windows.delete(doc);
	}

	/** Re-applies the colors in every window (after a color change). */
	private refresh(): void {
		const css = buildTagStylesheet(this.colors.map);
		for (const [doc, { sheet }] of this.windows) {
			sheet.replaceSync(css);
			decorateTags(doc.body, this.colors.map);
		}
	}

	// Mutations come batched (one callback per task): decorate what was added.
	// instanceOf, not instanceof: popout nodes come from another window's classes
	private onMutations(mutations: MutationRecord[]): void {
		const roots = new Set<Element>();
		for (const mutation of mutations) {
			// Pill content is filled after the pill is attached
			const pill = mutation.target.instanceOf(Element) ? mutation.target.closest(`.${CLASSES.pill}`) : null;
			if (pill) roots.add(pill);
			mutation.addedNodes.forEach(node => {
				if (node.instanceOf(Element)) roots.add(node);
			});
		}
		roots.forEach(root => {
			if (root.isConnected) decorateTags(root, this.colors.map);
		});
	}

	/** Right-click (long press on mobile) on a tag: "Change color" opens the palette on it. */
	private onContextMenu(evt: MouseEvent): void {
		const tagEl = findTagElement(evt.target);
		const tag = tagEl ? readTagName(tagEl) : null;
		if (!tagEl || !tag) return;
		evt.preventDefault();
		evt.stopPropagation();
		const menu = new Menu();
		menu.addItem(item => item
			.setTitle('Change color')
			.setIcon('palette')
			.onClick(() => this.pick(tagEl, tag)));
		menu.showAtMouseEvent(evt);
	}

	private pick(anchor: HTMLElement, tag: string, onClose?: () => void): void {
		openColorPalette(anchor, this.colors.get(tag), color => void this.colors.set(tag, color), onClose);
	}

	// From the command there is no tag on screen: anchor the palette where the modal was
	private pickFromCenter(tag: string): void {
		const anchor = activeDocument.body.createDiv({ cls: CLASSES.paletteAnchor });
		this.pick(anchor, tag, () => anchor.remove());
	}
}
