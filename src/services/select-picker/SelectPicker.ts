import { App, Component, FileView, TFile } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import type { ColorStore } from '../colors/ColorStore';
import { dismissColorPalette } from '../colors/palette/dismissColorPalette';
import { DEFAULT_OPTIONS } from './constants';
import { normalizeKey } from './seeds/normalizeKey';
import { parseSeedsFromFile } from './seeds/parseSeedsFromFile';
import { buildGlobalSeeds } from './seeds/buildGlobalSeeds';
import { collectFromBase } from './seeds/collectFromBase';
import { collectFromVault } from './seeds/collectFromVault';
import { showDropdown } from './dropdown/showDropdown';
import { dismissDropdown } from './dropdown/dismissDropdown';
import { showBottomSheet } from './bottom-sheet/showBottomSheet';
import { dismissModal } from './bottom-sheet/dismissModal';
import { isMobile } from '../../utils/isMobile';
import { writeFrontmatterValue } from './writeFrontmatterValue';
import type { ActiveFileListener, PickerContext, PickerUIState } from './types';

/**
 * The select picker (dropdown on desktop, bottom sheet on phones), always loaded.
 * Select chips, board and timeline open it, so none of them depends on another feature.
 * Owns the shared UI state and the select.options declared across all the bases.
 */
export class SelectPicker extends Component {
	readonly ui: PickerUIState = {
		activeDropdown: null,
		activeModal: null,
		activeBackdrop: null,
		activeTd: null,
		dropdownTimer: null,
		modalDragCleanup: null,
		modalTimer: null,
	};

	// Seeds merged from ALL .base files, keyed by normalized property name
	private seeds: Record<string, string[]> = {};
	// Active file, and its seeds when it is a .base (empty otherwise)
	private file: TFile | null = null;
	private baseSeeds: Record<string, string[]> = {};
	private listeners = new Set<ActiveFileListener>();

	constructor(private app: App, private colors: ColorStore) {
		super();
	}

	onload() {
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (!(file instanceof TFile) || file.extension !== 'base') return;
				this.rebuildGlobalSeeds();
				if (file === this.file) void this.readBaseSeeds(file);
			})
		);
		this.registerEvent(this.app.workspace.on('file-open', (file) => this.track(file)));
		this.registerEvent(this.app.workspace.on('layout-change', () => this.trackActiveFile()));
		// The vault is loaded once the layout is ready: at plugin load it has no file yet,
		// and the seeds of all the bases stayed empty until a base was edited
		this.app.workspace.onLayoutReady(() => {
			this.rebuildGlobalSeeds();
			this.trackActiveFile();
			const onBaseChange = (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === 'base') this.rebuildGlobalSeeds();
			};
			this.registerEvent(this.app.vault.on('create', onBaseChange));
			this.registerEvent(this.app.vault.on('delete', onBaseChange));
			this.registerEvent(this.app.vault.on('rename', onBaseChange));
		});
		this.register(() => {
			this.listeners.clear();
			dismissDropdown(this.ui);
			dismissModal(this.ui);
			dismissColorPalette();
		});
	}

	/** Active file (last opened, or of the active leaf). */
	get activeFile(): TFile | null {
		return this.file;
	}

	/** select.options of the active .base, keyed by normalized property name (empty for a note). */
	get activeBaseSeeds(): Record<string, string[]> {
		return this.baseSeeds;
	}

	/** select.options declared in all the bases, keyed by normalized property name. */
	get globalSeeds(): Record<string, string[]> {
		return this.seeds;
	}

	/**
	 * Calls back when the active file changes (file open, layout change), right
	 * away, then with seedsRead once the seeds of an active .base are read (also
	 * after it was modified), and once the seeds of all the bases are read again.
	 * Returns the unsubscribe function.
	 */
	onActiveFileChange(listener: ActiveFileListener): () => void {
		this.listeners.add(listener);
		return () => { this.listeners.delete(listener); };
	}

	/** select.options declared for a property across all the bases. */
	getOptions(propName: string): string[] {
		return this.seeds[normalizeKey(propName)] ?? [];
	}

	/**
	 * Opens the select picker for a note property from outside the table views.
	 * The anchor must contain an element carrying data-property-longtext-value
	 * with the current value. onChange fires right away (before the write) so
	 * the caller can update its UI optimistically.
	 */
	openPicker(anchor: HTMLElement, fmKeyStr: string, file: TFile, onChange: (value: string) => void): void {
		dismissDropdown(this.ui);
		dismissModal(this.ui);
		this.ui.activeTd = anchor;
		this.show(anchor, fmKeyStr, file.path, 'base', onChange);
	}

	/**
	 * Shows the bottom sheet on phones, the dropdown otherwise, for the value of
	 * fmKeyStr in the note at sourcePath. onChange fires before the write.
	 */
	show(anchor: HTMLElement, fmKeyStr: string, sourcePath: string, context: PickerContext, onChange?: (value: string) => void): void {
		const callbacks = {
			currentBaseSeeds: this.baseSeeds,
			globalSeeds: this.seeds,
			colorMap: this.colors.map,
			collectOptions: (key: string) => this.collectOptions(context, key),
			setValue: (sp: string, key: string, val: string) => { onChange?.(val); return writeFrontmatterValue(this.app, sp, key, val); },
			clearValue: (sp: string, key: string) => { onChange?.(''); return writeFrontmatterValue(this.app, sp, key, ''); },
			onPickColor: (label: string, color: string | null) => { void this.colors.set(label, color); },
		};
		const normalizedPropKey = normalizeKey(fmKeyStr);
		if (isMobile()) {
			showBottomSheet(anchor, normalizedPropKey, fmKeyStr, sourcePath, context, this.ui, callbacks);
		} else {
			this.ui.activeDropdown = showDropdown(anchor, normalizedPropKey, fmKeyStr, sourcePath, context, this.ui, callbacks);
		}
	}

	/** Closes the dropdown and the bottom sheet, if open. */
	dismiss(): void {
		dismissDropdown(this.ui);
		dismissModal(this.ui);
	}

	/** Closes the dropdown only, if open. */
	dismissDropdown(): void {
		dismissDropdown(this.ui);
	}

	// Default options first, then the values already used (folder of the active base, or vault)
	private collectOptions(context: PickerContext, fmKeyStr: string): string[] {
		const used = context === 'base'
			? collectFromBase(this.app.vault, this.app.metadataCache, this.file?.extension === 'base' ? this.file : null, fmKeyStr)
			: collectFromVault(this.app.vault, this.app.metadataCache, fmKeyStr);
		return [...(DEFAULT_OPTIONS[normalizeKey(fmKeyStr)] ?? []), ...used];
	}

	private rebuildGlobalSeeds() {
		// Listeners drawn with the former seeds (a board's column order) draw again
		void buildGlobalSeeds(this.app.vault).then(seeds => { this.seeds = seeds; this.emit(this.file, true); });
	}

	private trackActiveFile() {
		const leaf = this.app.workspace.getLeaf(false);
		this.track(leaf?.view instanceof FileView ? leaf.view.file : null);
	}

	private track(file: TFile | null) {
		this.file = file;
		this.baseSeeds = {};
		this.emit(file, false);
		if (file?.extension === 'base') void this.readBaseSeeds(file);
	}

	private async readBaseSeeds(file: TFile) {
		const seeds = await parseSeedsFromFile(this.app.vault, file);
		// Another file opened while the seeds were read
		if (this.file !== file) return;
		this.baseSeeds = seeds;
		this.emit(file, true);
	}

	private emit(file: TFile | null, seedsRead: boolean) {
		for (const listener of this.listeners) listener(file, seedsRead);
	}
}
