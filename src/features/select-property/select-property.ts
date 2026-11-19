import type { TFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import type { FeatureContext } from '../../core/types';
import { CLASSES, SELECTORS } from './constants';
import type { InteractionDeps, PointerState } from './types';

import { refreshChips } from './colors/refreshChips';
import type { ColorStore } from '../../services/colors/ColorStore';
import { dismissColorPalette } from '../../services/colors/palette/dismissColorPalette';

import { processCells } from './render/processCells';
import { markNoteProperties } from './render/markNoteProperties';
import { clearSelectMarkers } from './render/clearSelectMarkers';
import { observeContainer } from './render/observeContainer';

import { handleMouseDown } from './interactions/handleMouseDown';
import { handleTouchStart } from './interactions/handleTouchStart';
import { trackTouchMove } from './interactions/trackTouchMove';
import { handleTouchEnd } from './interactions/handleTouchEnd';
import { blockNativeClick } from './interactions/blockNativeClick';
import { startInlineEdit } from './inline-edit/startInlineEdit';

export class SelectPropertyFeature extends Feature {
	// Stops the observer of the active leaf
	private stopObserver: (() => void) | null = null;

	private readonly colors: ColorStore = this.ctx.services.colors;
	private readonly colorMap: Record<string, string> = this.colors.map;

	// Picker service: shared UI state, active file and seeds of the bases, writes
	private readonly picker = this.ctx.services.selectPicker;

	// Ends the inline edit in progress (restores the cell, removes its listeners)
	private endInlineEdit: (() => void) | null = null;

	private readonly state: PointerState = {
		lastClickTd: null,
		lastClickTime: 0,
		preventNextClick: false,
		touchStartEl: null,
		touchStartX: 0,
		touchStartY: 0,
		touchMoved: false,
	};

	private readonly deps: InteractionDeps = {
		app: this.app,
		picker: this.picker,
		ui: this.picker.ui,
		state: this.state,
		enterInlineEdit: td => this.enterInlineEdit(td),
	};

	constructor(ctx: FeatureContext) {
		super(ctx);
	}

	onload() {
		this.register(this.colors.onChange((value, color) => {
			if (value !== null) refreshChips(value, color);
		}));

		// The picker service tracks the active file and reads its seeds
		this.register(this.picker.onActiveFileChange((file, seedsRead) => {
			if (seedsRead) this.refreshCurrentBase();
			else this.onFileOpen(file);
		}));

		this.onLayoutReady(() => this.onFileOpen(this.picker.activeFile));

		this.registerDomEvent(activeDocument, 'mousedown', e => handleMouseDown(e, this.deps), true);
		// On mobile, intercept touchstart to prevent iOS from focusing [contenteditable]
		// before our logic runs. preventDefault() on touchstart suppresses mouse events,
		// so we handle the full tap logic in touchend.
		this.registerDomEvent(activeDocument, 'touchstart', e => handleTouchStart(e, this.deps), { passive: false, capture: true });
		this.registerDomEvent(activeDocument, 'touchmove', e => trackTouchMove(e, this.state), true);
		this.registerDomEvent(activeDocument, 'touchend', e => handleTouchEnd(e, this.deps), true);
		this.registerDomEvent(activeDocument, 'click', e => blockNativeClick(e, this.deps), true);
	}

	onunload() {
		this.endInlineEdit?.();
		this.endInlineEdit = null;
		this.stopObserving();
		const { ui } = this.deps;
		if (ui.modalTimer !== null) { window.clearTimeout(ui.modalTimer); ui.modalTimer = null; }
		this.picker.dismiss();
		dismissColorPalette();
		clearSelectMarkers(activeDocument);
	}

	// A new active file: the seeds of a .base come next (refreshCurrentBase)
	private onFileOpen(file: TFile | null) {
		this.stopObserving();
		if (!file) return;

		const leaf = this.app.workspace.getLeaf(false);
		if (!leaf?.view) return;
		if (file.extension === 'base') {
			const vc = leaf.view.containerEl.querySelector<HTMLElement>(`.${CLASSES.viewContent}`);
			if (!vc) return;
			this.scanBase(vc);
			this.startObserving(vc, () => this.scanBase(vc));
		} else {
			const container = leaf.view.containerEl;
			this.scanNote(container);
			this.startObserving(container, () => this.scanNote(container));
		}
	}

	// Seeds of the active .base read (opened or modified): they apply to the cells
	private refreshCurrentBase() {
		const leaf = this.app.workspace.getLeaf(false);
		const vc = leaf?.view?.containerEl.querySelector<HTMLElement>(`.${CLASSES.viewContent}`);
		if (vc) this.scanBase(vc);
	}

	private scanBase(container: HTMLElement) {
		processCells(container, this.app, this.colorMap, this.picker.activeBaseSeeds, this.picker.globalSeeds);
	}

	private scanNote(container: HTMLElement) {
		markNoteProperties(container, this.app, this.colorMap);
		this.scanBase(container);
	}

	private startObserving(container: HTMLElement, scan: () => void) {
		this.stopObserver = observeContainer(container, scan);
	}

	private stopObserving() {
		this.stopObserver?.();
		this.stopObserver = null;
		this.picker.dismissDropdown();
	}

	// No observer while editing; on blur it watches the leaf again (note properties)
	private enterInlineEdit(td: HTMLElement) {
		const ce = td.querySelector<HTMLElement>(SELECTORS.contentEditable);
		if (!ce) return;
		this.stopObserving();
		this.endInlineEdit = startInlineEdit(td, ce, () => {
			this.endInlineEdit = null;
			const container = this.app.workspace.getLeaf(false)?.view?.containerEl;
			if (container) this.startObserving(container, () => markNoteProperties(container, this.app, this.colorMap));
		});
	}
}
