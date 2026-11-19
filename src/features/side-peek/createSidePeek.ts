import { App, FileView, Scope, TFile, View, WorkspaceLeaf, setIcon } from 'obsidian';
import { CLASSES, HEADER_BUTTONS, HOTKEYS, OPEN_LEAF_STORAGE_KEY, WIDTH } from './constants';
import { afterAnimations } from './afterAnimations';
import { attachResizeHandle } from './attachResizeHandle';
import { findOriginLeaf } from './findOriginLeaf';
import { freezeBaseContext } from '../../shared/bases-context/freezeBaseContext';
import { getLeafId } from './getLeafId';

export interface SidePeek {
	open(file: TFile, eState?: Record<string, unknown>): Promise<void>;
	close(animate?: boolean): void;
}

// A real workspace leaf (split next to the current one) restyled as a fixed right
// panel over an overlay: the note behaves exactly as when opened normally
// (properties, select picker, icons…). Closing detaches the leaf.
// `restoredLeaf`: the split left by a peek open at the last quit/reload, turned
// back into a side peek as is (same note, scroll and cursor, no slide-in).
export function createSidePeek(app: App, onClosed: () => void, restoredLeaf?: WorkspaceLeaf): SidePeek {
	const leaf: WorkspaceLeaf = restoredLeaf ?? app.workspace.getLeaf('split', 'vertical');
	const origin = findOriginLeaf(app, leaf);
	// The tab group (not attached to the DOM yet when new). Its element isn't in
	// the public API but every workspace item has one.
	const panelEl = (leaf.parent as unknown as { containerEl: HTMLElement }).containerEl;
	const overlayEl = panelEl.ownerDocument.body.createDiv(CLASSES.overlay);
	panelEl.addClass(CLASSES.panel);
	if (restoredLeaf) {
		panelEl.addClass(CLASSES.isRestored);
		overlayEl.addClass(CLASSES.isRestored);
	}
	// Remembered until closed: see findLeftoverPeekLeaf
	app.saveLocalStorage(OPEN_LEAF_STORAGE_KEY, getLeafId(leaf));

	// Last width set by resizing any side peek; CSS default otherwise
	const setWidth = (width: number) => panelEl.style.setProperty(WIDTH.cssVar, `${width}px`);
	const savedWidth: unknown = app.loadLocalStorage(WIDTH.storageKey);
	if (typeof savedWidth === 'number') setWidth(savedWidth);
	const removeResizeHandle = attachResizeHandle(panelEl, setWidth, (width) => app.saveLocalStorage(WIDTH.storageKey, width));

	// On top of the keymap stack while open; unhandled keys fall through to the
	// app (and the focused view). Suggests, menus and modals push their own scope
	// above, so they keep Escape for themselves.
	const scope = new Scope(app.scope);
	app.keymap.pushScope(scope);

	let closed = false;
	// Bases behind keep their `this` while the peeked note is the active file
	let unfreeze: (() => void) | null = null;
	const close = (animate = true) => {
		if (closed) return;
		closed = true;
		app.keymap.popScope(scope);
		app.workspace.offref(layoutRef);
		panelEl.addClass(CLASSES.isClosing);
		overlayEl.addClass(CLASSES.isClosing);
		const done = () => {
			overlayEl.remove();
			// Already gone when the tab was closed from Obsidian (e.g. Mod+W)
			if (leaf.parent) leaf.detach();
			panelEl.removeClass(CLASSES.panel, CLASSES.isClosing, CLASSES.isRestored);
			panelEl.style.removeProperty(WIDTH.cssVar);
			removeResizeHandle();
			app.saveLocalStorage(OPEN_LEAF_STORAGE_KEY, null);
			unfreeze?.();
			onClosed();
		};
		if (animate) void afterAnimations(panelEl).then(done);
		else done();
	};

	// Like Notion: replace the page behind with this note
	const expand = async () => {
		const file = leaf.view instanceof FileView ? leaf.view.file : null;
		close(false);
		if (!file) return;
		const target = origin?.view.containerEl.isConnected ? origin : app.workspace.getLeaf('tab');
		await target.openFile(file, { active: true });
	};

	// Close and expand buttons at the top left of the view header (the overlay
	// doesn't close the panel). Views are reused when navigating inside the leaf:
	// add them once per view.
	const withButtons = new WeakSet<View>();
	const addHeaderButtons = () => {
		const view = leaf.view;
		const headerLeftEl = view.containerEl.querySelector<HTMLElement>(`.${CLASSES.viewHeaderLeft}`);
		if (!headerLeftEl || withButtons.has(view)) return;
		withButtons.add(view);
		const buttonsEl = headerLeftEl.createDiv(CLASSES.headerButtons);
		headerLeftEl.prepend(buttonsEl);
		const addButton = ({ icon, title }: { icon: string; title: string }, onClick: () => void) => {
			const buttonEl = buttonsEl.createEl('button', { cls: CLASSES.clickableIcon, attr: { 'aria-label': title } });
			setIcon(buttonEl, icon);
			buttonEl.addEventListener('click', onClick);
		};
		addButton(HEADER_BUTTONS.close, () => close());
		addButton(HEADER_BUTTONS.expand, () => { void expand(); });
	};

	// overlayEl.addEventListener('click', () => close());
	// Tab closed from Obsidian (e.g. Mod+W): drop the overlay and hotkeys too
	const layoutRef = app.workspace.on('layout-change', () => { if (!leaf.parent) close(false); });
	scope.register(HOTKEYS.close.modifiers, HOTKEYS.close.key, () => { close(); return false; });
	scope.register(HOTKEYS.expand.modifiers, HOTKEYS.expand.key, () => { void expand(); return false; });

	if (restoredLeaf) {
		unfreeze = freezeBaseContext(app, leaf);
		void leaf.loadIfDeferred().then(addHeaderButtons);
	}

	return {
		open: async (file, eState) => {
			unfreeze ??= freezeBaseContext(app, leaf);
			await leaf.openFile(file, { active: true, eState });
			addHeaderButtons();
		},
		close,
	};
}
