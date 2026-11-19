// =============================================================================
// ICONS FEATURE
// =============================================================================

import { FileView, MarkdownView, TFile, setIcon } from 'obsidian';

import { EditorView } from '@codemirror/view';
import { Feature } from '../../core/Feature';
import type { FeatureContext } from '../../core/types';
import { IconPicker } from './icon-picker';
import { createIconEl } from './render';
import { renderTabIcons } from './renderTabIcons';
import { restoreTabIcons } from './restoreTabIcons';
import { clearIcons } from './clearIcons';
import { createInlineIconExtension, refreshIconsEffect } from './codemirror-decoration';
import { ResolvedIconConfig } from './types';
import { CLASSES, OWN_CLASSES, SELECTORS } from './constants';
import { cls, isTouchDevice } from '@wbe/utils';

const IS_TOUCH_DEVICE = isTouchDevice();

const NO_ICON: ResolvedIconConfig = { icon: '', color: 'default', source: 'default' };

export class IconsFeature extends Feature {
	private readonly store = this.ctx.services.icons;
	private observer: MutationObserver | null = null;
	private navObserver: MutationObserver | null = null;
	private rafPending = false;
	// Set on unload: a render already scheduled must not add icons back
	private destroyed = false;
	private navClickTimer: number | null = null;
	private activePicker: IconPicker | null = null;

	constructor(ctx: FeatureContext) {
		super(ctx);
	}

	onload(): void {
		// Title mentions, board, timeline and search show note icons from now on
		this.store.setShown(true);
		this.registerEvent(this.app.workspace.on('file-open', () => this.scheduleRender()));
		this.registerEvent(this.app.workspace.on('layout-change', () => this.scheduleRender()));
		// The icon store moves the stored path itself (registered first)
		this.registerEvent(this.app.vault.on('rename', () => this.scheduleRender()));
		// An icon pack added or removed (registerIconPack) clears the rendered keys, then notifies
		this.register(this.store.onChange(() => this.scheduleRender()));

		this.observer = new MutationObserver((mutations) => {
			for (const mut of mutations) {
				if (mut.type === 'attributes') {
					// data-path being set on a nav item after insertion
					const el = mut.target as HTMLElement;
					if (el.matches(`.${CLASSES.navFileTitle}, .${CLASSES.navFolderTitle}`)) {
						this.scheduleRender();
						return;
					}
					continue;
				}
				for (const node of Array.from(mut.addedNodes)) {
					if (!node.instanceOf(HTMLElement)) continue;
					if (Array.from(node.classList).some((c) => OWN_CLASSES.has(c))) continue;
					if (node.matches(SELECTORS.triggerTargets) || node.querySelector(SELECTORS.triggerTargets)) {
						this.scheduleRender();
						return;
					}
				}
			}
		});
		this.observer.observe(activeDocument.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-path'],
		});

		this.plugin.registerEditorExtension(createInlineIconExtension(this.store, this.app));
		this.registerDomEvent(activeDocument, 'click', (e: MouseEvent) => this.onClickNav(e), true);
		this.registerDomEvent(activeDocument, 'click', (e: MouseEvent) => this.onClick(e), true);
		this.onLayoutReady(() => {
			this.observeNavToggles();
			// Initial invalidate + full render pass
			this.invalidateAllNavIcons();
			this.renderAll();
		});
	}

	onunload(): void {
		this.destroyed = true;
		this.observer?.disconnect();
		this.observer = null;
		this.navObserver?.disconnect();
		this.navObserver = null;
		if (this.navClickTimer !== null) window.clearTimeout(this.navClickTimer);
		this.activePicker?.close();
		this.activePicker = null;
		clearIcons(activeDocument);
		restoreTabIcons(this.app);
		this.store.setShown(false);
	}

	// Folder expand/collapse (is-collapsed class changes) re-renders the nav icons
	private observeNavToggles(): void {
		const navContainer = activeDocument.querySelector(`.${CLASSES.navFilesContainer}`);
		if (!navContainer) return;
		this.navObserver = new MutationObserver((mutations) => {
			const toggled = mutations.some((mut) => {
				if (mut.type !== 'attributes' || mut.attributeName !== 'class') return false;
				const el = mut.target as HTMLElement;
				return el.classList.contains(CLASSES.navFolder) || el.classList.contains(CLASSES.navFileList);
			});
			if (!toggled) return;
			this.invalidateAllNavIcons();
			this.scheduleRender();
		});
		this.navObserver.observe(navContainer, {
			attributes: true,
			attributeFilter: ['class'],
			subtree: true,
		});
	}

	private scheduleRender(): void {
		if (this.rafPending) return;
		this.rafPending = true;
		window.requestAnimationFrame(() => {
			this.rafPending = false;
			if (this.destroyed) return;
			this.renderAll();
		});
	}

	private renderAll(): void {
		this.renderBaseHeaders();
		this.renderPageHeaders();
		this.renderNavFolders();
		this.renderNavFiles();
		this.renderInlineLinks();
		this.renderExternalLinks();
		renderTabIcons(this.app, this.store);
	}

	// ─── DB Headers ──────────────────────────────────────────────────────────
	// "Add icon" button above the title (absolute area), icon left of the title.

	private renderBaseHeaders(): void {
		activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.dbHeader}`).forEach((header) => {
			const dbTitle = header.querySelector<HTMLElement>(`.${CLASSES.dbTitle}`);
			if (!dbTitle) return;
			const file = this.fileForEl(header);
			if (!file) return;
			this.syncDbHeader(header, dbTitle, file.path);
		});
	}

	private syncDbHeader(header: HTMLElement, dbTitle: HTMLElement, path: string): void {
		// ── 1. Wrapper row (icon + title side by side) ──────────────────────────
		let titleRow = header.querySelector<HTMLElement>(`:scope > .${CLASSES.dbTitleRow}`);
		if (!titleRow) {
			titleRow = createDiv();
			titleRow.className = CLASSES.dbTitleRow;
			header.insertBefore(titleRow, dbTitle);
			titleRow.appendChild(dbTitle); // move title inside row
		}

		// ── 2. Absolute area above (for the Add icon button) ────────────────────
		let area = header.querySelector<HTMLElement>(`:scope > .${CLASSES.iconArea}`);
		if (!area) {
			area = createDiv();
			area.className = CLASSES.iconArea;
			header.insertBefore(area, titleRow); // before the row
			area.appendChild(this.buildAddButton(path));
		}
		area.dataset.notionalPath = path;

		// ── 3. Inline icon (left of the title in the row) ───────────────────────
		const config = this.store.get(path);
		const configKey = config ? `${config.icon}:${config.color}` : 'none';

		const existingIcon = titleRow.querySelector<HTMLElement>(`:scope > .${CLASSES.iconHeader}`);
		if (existingIcon?.dataset.notionalConfigKey !== configKey) {
			existingIcon?.remove();
			if (config) {
				const icon = createIconEl(config, 'header');
				icon.dataset.notionalPath = path;
				icon.dataset.notionalConfigKey = configKey;
				titleRow.insertBefore(icon, dbTitle);
			}
		}

		area.classList.toggle(CLASSES.hasIcon, !!config);
	}

	// ─── Page headers: absolute area above the title ─────────────────────────

	private renderPageHeaders(): void {
		activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.inlineTitle}`).forEach((titleEl) => {
			const parent = titleEl.parentElement;
			if (!parent) return;
			const file = this.fileForEl(titleEl);
			if (!file || file.extension === 'base') return;
			this.syncPageArea(parent, titleEl, file.path);
		});
	}

	private syncPageArea(container: HTMLElement, anchor: Element, path: string): void {
		let area = container.querySelector<HTMLElement>(`:scope > .${CLASSES.iconArea}`);

		if (!area) {
			area = createDiv();
			area.className = CLASSES.iconArea;
			container.insertBefore(area, anchor);
		} else if (area.nextElementSibling !== anchor) {
			container.insertBefore(area, anchor);
		}

		area.dataset.notionalPath = path;
		const config = this.store.get(path);
		const configKey = config ? `${config.icon}:${config.color}` : 'none';
		if (area.dataset.notionalConfigKey === configKey) return;
		area.dataset.notionalConfigKey = configKey;

		area.replaceChildren();
		if (config) {
			area.classList.add(CLASSES.hasIcon);
			const icon = createIconEl(config, 'header');
			icon.dataset.notionalPath = path;
			area.appendChild(icon);
		} else {
			area.classList.remove(CLASSES.hasIcon);
			area.appendChild(this.buildAddButton(path));
		}
	}

	private buildAddButton(path: string): HTMLElement {
		const btn = createEl('button');
		btn.className = cls(CLASSES.addIconBtn, IS_TOUCH_DEVICE && CLASSES.addIconBtnTouchDevice);
		btn.dataset.notionalPath = path;
		const ico = createSpan();
		ico.className = CLASSES.addIconBtnIcon;
		setIcon(ico, 'smile');
		btn.appendChild(ico);
		const label = createSpan();
		label.textContent = 'Add icon';
		btn.appendChild(label);
		return btn;
	}

	// ─── Nav ──────────────────────────────────────────────────────────────────

	private renderNavFolders(): void {
		activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.navFolderTitle}`).forEach((folderEl) => {
			const folderPath = folderEl.getAttribute('data-path');
			if (!folderPath) return;
			const name = folderPath.split('/').pop();
			if (!name) return;

			const base = this.app.vault.getAbstractFileByPath(`${folderPath}/${name}.base`);
			const md = this.app.vault.getAbstractFileByPath(`${folderPath}/${name}.md`);
			const file = base instanceof TFile ? base : md instanceof TFile ? md : null;
			if (!file) return;

			const config = this.store.resolve(file.path);
			const configKey = `${config.icon}:${config.color}`;

			const existing = folderEl.querySelector<HTMLElement>(`:scope > .${CLASSES.iconNav}`);
			if (existing?.dataset.notionalConfigKey === configKey && !existing.dataset.notionalForceRender) {
				return;
			}
			existing?.remove();

			const iconEl = createIconEl(config, 'nav');
			iconEl.dataset.notionalConfigKey = configKey;
			const anchor = folderEl.querySelector<HTMLElement>(`.${CLASSES.navFolderTitleContent}`);
			folderEl.insertBefore(iconEl, anchor ?? folderEl.firstChild);
		});
	}

	// ─── Nav files ────────────────────────────────────────────────────────────

	private renderNavFiles(): void {
		activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.navFileTitle}`).forEach((fileEl) => {
			const filePath = fileEl.getAttribute('data-path');
			if (!filePath) return;

			const config = this.store.resolve(filePath);
			const configKey = `${config.icon}:${config.color}`;

			const existing = fileEl.querySelector<HTMLElement>(`:scope > .${CLASSES.iconNav}`);
			if (existing?.dataset.notionalConfigKey === configKey && !existing.dataset.notionalForceRender) {
				return;
			}
			existing?.remove();

			const iconEl = createIconEl(config, 'nav');
			iconEl.dataset.notionalConfigKey = configKey;
			const anchor = fileEl.querySelector<HTMLElement>(`.${CLASSES.navFileTitleContent}`);
			fileEl.insertBefore(iconEl, anchor ?? fileEl.firstChild);
		});
	}

	// ─── Inline links ─────────────────────────────────────────────────────────

	private renderInlineLinks(): void {
		activeDocument.querySelectorAll<HTMLElement>(`.${CLASSES.internalLink}, .${CLASSES.cmHmdInternalLink}`).forEach((link) => {
			const href = link.getAttribute('data-href') ?? link.getAttribute('href');
			if (!href) return;
			const dest = this.app.metadataCache.getFirstLinkpathDest(href, '');
			if (!dest) return;

			const config = this.store.resolve(dest.path);
			const configKey = `${config.icon}:${config.color}`;

			const existing = link.querySelector<HTMLElement>(`:scope > .${CLASSES.iconInline}`);
			if (existing?.dataset.notionalConfigKey === configKey) return;
			existing?.remove();

			let textWrapper = link.querySelector<HTMLElement>(`:scope > .${CLASSES.internalLinkText}`);
			if (!textWrapper) {
				textWrapper = createSpan();
				textWrapper.className = CLASSES.internalLinkText;
				Array.from(link.childNodes).forEach((node) => textWrapper!.appendChild(node));
				link.appendChild(textWrapper);
			}

			const iconEl = createIconEl(config, 'inline');
			iconEl.dataset.notionalConfigKey = configKey;
			iconEl.dataset.notionalPath = dest.path;
			link.insertBefore(iconEl, textWrapper);
		});
	}

	// ─── External links ───────────────────────────────────────────────────────
	// Prepends the target site's favicon before the link text. Obsidian's own
	// external-link arrow icon (CSS ::after on .external-link) is untouched.

	private renderExternalLinks(): void {
		if (!this.store.faviconsEnabled) return;
		activeDocument.querySelectorAll<HTMLElement>(`a.${CLASSES.externalLink}`).forEach((link) => {
			const href = link.getAttribute('href');
			if (!href) return;

			let hostname: string;
			try {
				hostname = new URL(href).hostname;
			} catch {
				return;
			}
			if (!hostname) return;

			const configKey = `favicon:${hostname}`;

			const existing = link.querySelector<HTMLElement>(`:scope > .${CLASSES.iconInline}`);
			if (existing?.dataset.notionalConfigKey === configKey) return;
			existing?.remove();

			let textWrapper = link.querySelector<HTMLElement>(`:scope > .${CLASSES.internalLinkText}`);
			if (!textWrapper) {
				textWrapper = createSpan();
				textWrapper.className = CLASSES.internalLinkText;
				Array.from(link.childNodes).forEach((node) => textWrapper!.appendChild(node));
				link.appendChild(textWrapper);
			}

			const iconEl = createIconEl({ icon: `favicon:${hostname}`, color: 'default' }, 'inline');
			iconEl.dataset.notionalConfigKey = configKey;
			link.insertBefore(iconEl, textWrapper);
		});
	}

	// ─── Click handlers ───────────────────────────────────────────────────────

	private onClickNav(e: MouseEvent): void {
		const target = e.target as HTMLElement;
		// Detect any click in nav files container - could be folder toggle or file click
		const navContainer = target.closest<HTMLElement>(`.${CLASSES.navFilesContainer}`);
		if (!navContainer) return;

		// Exclude clicks on our own icons
		if (target.closest(`.${CLASSES.icon}`)) return;

		// Any nav click might be a toggle - check after small delay for DOM update
		if (this.navClickTimer !== null) window.clearTimeout(this.navClickTimer);
		this.navClickTimer = window.setTimeout(() => {
			this.navClickTimer = null;
			this.invalidateAllNavIcons();
			this.scheduleRender();
		}, 50);
	}

	private onClick(e: MouseEvent): void {
		const target = e.target as HTMLElement;
		if (target.closest<HTMLElement>(`.${CLASSES.dbTitle}`)) return;
		const iconEl = target.closest<HTMLElement>(`.${CLASSES.icon}.${CLASSES.iconHeader}`);
		const inlineIconEl = target.closest<HTMLElement>(`.${CLASSES.icon}.${CLASSES.iconInline}`);
		const addBtn = target.closest<HTMLElement>(`.${CLASSES.addIconBtn}`);
		if (addBtn && e.detail >= 2) return;
		const clicked = iconEl ?? inlineIconEl ?? addBtn;
		if (!clicked) return;

		const area = clicked.closest<HTMLElement>(`.${CLASSES.iconArea}`);
		const path = area?.dataset.notionalPath ?? clicked.dataset.notionalPath;
		if (!path) return;

		e.preventDefault();
		e.stopPropagation();

		this.activePicker?.close();
		const current = this.store.get(path) ? this.store.resolve(path) : NO_ICON;

		this.activePicker = new IconPicker({
			current,
			recent: this.store.getRecent(),
			onSelect: (config) => {
				void this.store.set(path, config);
				this.activePicker = null;
				this.invalidate(path, area);
				this.scheduleRender();
				this.refreshCMEditors();
			},
			onRemove: () => {
				void this.store.remove(path);
				this.activePicker = null;
				this.invalidate(path, area);
				this.scheduleRender();
				this.refreshCMEditors();
			},
		});
		this.activePicker.open(clicked);
	}

	private refreshCMEditors(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const cmView = (leaf.view.editor as unknown as { cm?: EditorView }).cm;
				cmView?.dispatch({ effects: refreshIconsEffect.of(undefined) });
			}
		});
	}

	private invalidate(path: string, area: HTMLElement | null): void {
		if (area) area.dataset.notionalConfigKey = '';
		activeDocument
			.querySelectorAll<HTMLElement>(`.${CLASSES.iconHeader}[data-notional-path="${path}"]`)
			.forEach((el) => { el.dataset.notionalConfigKey = ''; });

		// Invalidate nav file icon
		activeDocument
			.querySelectorAll<HTMLElement>(`.${CLASSES.navFileTitle}[data-path="${path}"] > .${CLASSES.iconNav}`)
			.forEach((el) => el.remove());

		// Invalidate nav folder icon (parent folder)
		const lastSlash = path.lastIndexOf('/');
		if (lastSlash >= 0) {
			const folderPath = path.substring(0, lastSlash);
			activeDocument
				.querySelectorAll<HTMLElement>(`.${CLASSES.navFolderTitle}[data-path="${folderPath}"] > .${CLASSES.iconNav}`)
				.forEach((el) => el.remove());
		}
	}

	private invalidateAllNavIcons(): void {
		// Force complete re-render of nav icons by removing them all
		activeDocument
			.querySelectorAll<HTMLElement>(`.${CLASSES.iconNav}`)
			.forEach((el) => el.remove());
	}

	private fileForEl(el: HTMLElement): TFile | null {
		let found: TFile | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (found) return;
			const view = leaf.view;
			if (view instanceof FileView && view.file instanceof TFile && view.containerEl.contains(el)) {
				found = view.file;
			}
		});
		return found;
	}
}
