// =============================================================================
// ICONS FEATURE - Picker (Notion-style)
// Virtualized icon grid → click → color popover
// Emoji tab → a click picks it, no color popover
// =============================================================================

import { setIcon } from 'obsidian';
import { IconConfig, ResolvedIconConfig } from './types';
import { ICON_COLORS, CLASSES } from './constants';
import { getPickerIcons } from './packs/getPickerIcons';
import { getIconKeywords } from './packs/getIconKeywords';
import { EMOJI_CATEGORIES } from './emoji-data';
import { renderGlyph, applyColor } from './render';
import { isMobile } from '../../utils/isMobile';

interface PickerCallbacks {
	current: ResolvedIconConfig;
	recent: string[];
	onSelect: (config: IconConfig) => void;
	onRemove: () => void;
}

type PickerTab = 'icons' | 'emoji';

const ALL_COLORS: IconConfig['color'][] = ['default', ...ICON_COLORS];

const PAGE_SIZE = 80; // icons rendered per page

export class IconPicker {
	private cb: PickerCallbacks;
	private container: HTMLElement | null = null;
	private backdrop: HTMLElement | null = null;
	private colorPopover: HTMLElement | null = null;
	private grid: HTMLElement | null = null;
	private searchWrap: HTMLElement | null = null;
	private cleanup: (() => void)[] = [];
	private filteredIcons: string[] = [];
	private renderedCount = 0;
	private observer: IntersectionObserver | null = null;
	private updateGradients: (() => void) | null = null;
	private activeTab: PickerTab = 'icons';

	constructor(cb: PickerCallbacks) {
		this.cb = cb;
		this.filteredIcons = getPickerIcons();
		// Open on emoji tab if current icon is an emoji
		this.activeTab =
			cb.current.source === 'direct' && cb.current.icon.startsWith('emoji:')
				? 'emoji'
				: 'icons';
	}

	open(anchor: HTMLElement | null): void {
		const mobile = isMobile();

		const backdrop = createDiv();
		backdrop.className = `${CLASSES.backdrop} ${mobile ? CLASSES.isMobile : CLASSES.isPopover}`;
		this.backdrop = backdrop;

		const container = createDiv();
		container.className = `${CLASSES.picker} ${mobile ? CLASSES.isMobile : CLASSES.isPopover}`;
		this.container = container;

		container.appendChild(this.buildHeader());
		this.searchWrap = this.buildSearch();
		container.appendChild(this.searchWrap);
		this.renderContent();

		activeDocument.body.appendChild(backdrop);
		activeDocument.body.appendChild(container);
		activeDocument.body.classList.add(CLASSES.pickerActive);

		if (!mobile) this.positionPopover(container, anchor);

		const onBackdrop = () => this.close();
		backdrop.addEventListener('click', onBackdrop);

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (this.colorPopover) this.hideColorPopover();
				else this.close();
			}
		};
		activeDocument.addEventListener('keydown', onKey, true);
		this.cleanup.push(
			() => backdrop.removeEventListener('click', onBackdrop),
			() => activeDocument.removeEventListener('keydown', onKey, true),
		);

		window.requestAnimationFrame(() => {
			backdrop.classList.add(CLASSES.isVisible);
			container.classList.add(CLASSES.isVisible);
		});
	}

	// ─── Tab switching ────────────────────────────────────────────────────────

	private switchTab(tab: PickerTab): void {
		if (this.activeTab === tab) return;
		this.activeTab = tab;

		this.container?.querySelectorAll<HTMLElement>(`.${CLASSES.pickerTab}`).forEach(el => {
			el.classList.toggle(CLASSES.isActive, el.dataset.tab === tab);
		});

		// Reset icon search state when switching back
		if (tab === 'icons') {
			this.filteredIcons = getPickerIcons();
			const input = this.searchWrap?.querySelector<HTMLInputElement>(`.${CLASSES.pickerSearch}`);
			if (input) input.value = '';
		}

		this.renderContent();
	}

	private renderContent(): void {
		this.clearContent();
		if (this.activeTab === 'icons') {
			this.searchWrap?.classList.remove(CLASSES.isHidden);
			this.container?.appendChild(this.buildGrid());
		} else {
			this.searchWrap?.classList.add(CLASSES.isHidden);
			this.container?.appendChild(this.buildEmojiGrid());
		}
	}

	private clearContent(): void {
		this.observer?.disconnect();
		this.observer = null;
		this.grid = null;
		this.updateGradients = null;
		this.hideColorPopover();
		if (!this.container || !this.searchWrap) return;
		const children = Array.from(this.container.children);
		const idx = children.indexOf(this.searchWrap);
		children.slice(idx + 1).forEach(el => el.remove());
	}

	// ─── Header ───────────────────────────────────────────────────────────────

	private buildHeader(): HTMLElement {
		const header = createDiv();
		header.className = CLASSES.pickerHeader;

		const tabsWrap = createDiv();
		tabsWrap.className = CLASSES.pickerTabs;

		(['icons', 'emoji'] as PickerTab[]).forEach(tab => {
			const tabEl = createSpan();
			tabEl.className = `${CLASSES.pickerTab}${this.activeTab === tab ? ` ${CLASSES.isActive}` : ''}`;
			tabEl.dataset.tab = tab;
			tabEl.textContent = tab === 'icons' ? 'Icons' : 'Emoji';
			tabEl.addEventListener('click', () => this.switchTab(tab));
			tabsWrap.appendChild(tabEl);
		});

		header.appendChild(tabsWrap);

		if (this.cb.current.source === 'direct') {
			const removeBtn = createEl('button');
			removeBtn.className = CLASSES.pickerRemoveBtn;
			removeBtn.textContent = 'Remove';
			removeBtn.addEventListener('click', () => {
				this.cb.onRemove();
				this.close();
			});
			header.appendChild(removeBtn);
		}

		return header;
	}

	// ─── Search ───────────────────────────────────────────────────────────────

	private buildSearch(): HTMLElement {
		const wrap = createEl('label');
		wrap.className = CLASSES.pickerSearchWrap;

		const searchIco = createSpan();
		searchIco.className = CLASSES.pickerSearchIco;
		setIcon(searchIco, 'search');
		wrap.appendChild(searchIco);

		const input = createEl('input');
		input.type = 'text';
		input.placeholder = 'Filter...';
		input.className = CLASSES.pickerSearch;
		input.addEventListener('input', () => {
			this.hideColorPopover();
			this.filterGrid(input.value.toLowerCase().trim());
		});
		wrap.appendChild(input);

		return wrap;
	}

	// ─── Icon grid (Sections + Paginated lazy-load) ───────────────────────────

	private buildGrid(): HTMLElement {
		const outer = createDiv();
		outer.className = CLASSES.pickerScrollOuter;

		const wrapper = createDiv();
		wrapper.className = CLASSES.pickerGridWrapper;
		this.grid = createDiv();
		this.grid.className = CLASSES.pickerGridInner;
		wrapper.appendChild(this.grid);

		this.renderedCount = 0;
		this.renderSections();
		this.attachSentinel(wrapper);

		const update = () => {
			const { scrollTop, scrollHeight, clientHeight } = wrapper;
			outer.classList.toggle(CLASSES.canScrollUp, scrollTop > 0);
			outer.classList.toggle(CLASSES.canScrollDown, scrollTop + clientHeight < scrollHeight - 1);
		};
		this.updateGradients = update;
		wrapper.addEventListener('scroll', update, { passive: true });
		window.requestAnimationFrame(update);

		outer.appendChild(wrapper);
		return outer;
	}

	/** Render Recent + Icons sections (no filter active). */
	private renderSections(): void {
		if (!this.grid) return;
		this.grid.empty();

		const recent = this.cb.recent.filter(n => !n.startsWith('emoji:'));
		if (recent.length > 0) {
			this.grid.appendChild(this.buildSectionLabel('Recent'));
			const recentGrid = createDiv();
			recentGrid.className = CLASSES.pickerGrid;
			recent.forEach(name => recentGrid.appendChild(this.buildIconBtn(name)));
			this.grid.appendChild(recentGrid);
		}

		this.grid.appendChild(this.buildSectionLabel('Icons'));
		const allGrid = createDiv();
		allGrid.className = CLASSES.pickerGrid;
		this.grid.appendChild(allGrid);

		// Swap main grid pointer to the all-icons grid for pagination
		this.grid = allGrid;
		this.renderedCount = 0;
		this.renderNextPage();
	}

	private buildSectionLabel(text: string): HTMLElement {
		const el = createDiv();
		el.className = CLASSES.pickerSectionLabel;
		el.textContent = text;
		return el;
	}

	/** Render the next PAGE_SIZE icons into the grid. */
	private renderNextPage(): void {
		if (!this.grid) return;
		const from = this.renderedCount;
		const to = Math.min(from + PAGE_SIZE, this.filteredIcons.length);
		if (from >= to) return;

		for (let i = from; i < to; i++) {
			const name = this.filteredIcons[i];
			if (name) this.grid.appendChild(this.buildIconBtn(name));
		}
		this.renderedCount = to;
		window.requestAnimationFrame(() => this.updateGradients?.());
	}

	private buildIconBtn(name: string): HTMLElement {
		const btn = createEl('button');
		btn.className = CLASSES.iconOption;
		btn.dataset.iconName = name;
		if (name === this.cb.current.icon && this.cb.current.source === 'direct') {
			btn.classList.add(CLASSES.isSelected);
		}
		const glyph = createSpan();
		glyph.className = CLASSES.icon;
		renderGlyph(glyph, name);
		if (name === this.cb.current.icon && this.cb.current.source === 'direct') {
			applyColor(glyph, this.cb.current.color);
		}
		btn.appendChild(glyph);
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showColorPopover(btn, name);
		});
		return btn;
	}

	/** Sentinel at bottom of grid triggers next page load on scroll. */
	private attachSentinel(wrapper: HTMLElement): void {
		this.observer?.disconnect();

		const sentinel = createDiv();
		sentinel.className = CLASSES.sentinel;
		wrapper.appendChild(sentinel);

		this.observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && this.renderedCount < this.filteredIcons.length) {
					this.renderNextPage();
				}
			},
			{ root: wrapper, threshold: 0 },
		);
		this.observer.observe(sentinel);
		this.cleanup.push(() => this.observer?.disconnect());
	}

	private filterGrid(filter: string): void {
		// Reset grid pointer to the inner wrapper before re-rendering
		const inner = this.container?.querySelector<HTMLElement>(`.${CLASSES.pickerGridInner}`);
		if (!inner) return;
		this.grid = inner;

		if (filter === '') {
			// No filter: show Recent + Icons sections
			this.filteredIcons = getPickerIcons();
			this.renderSections();
		} else {
			// Filter active: flat grid, no sections
			this.filteredIcons = getPickerIcons().filter(name => {
				// Check if icon name matches
				if (name.includes(filter)) return true;
				// Check if any keyword matches
				const keywords = getIconKeywords(name);
				return keywords.some(kw => kw.includes(filter));
			});
			inner.empty();
			const flatGrid = createDiv();
			flatGrid.className = CLASSES.pickerGrid;
			inner.appendChild(flatGrid);
			this.grid = flatGrid;
			this.renderedCount = 0;
			this.renderNextPage();
		}
	}

	// ─── Emoji grid ───────────────────────────────────────────────────────────

	private buildEmojiGrid(): HTMLElement {
		const outer = createDiv();
		outer.className = CLASSES.pickerScrollOuter;

		const wrapper = createDiv();
		wrapper.className = CLASSES.pickerGridWrapper;

		const inner = createDiv();
		inner.className = CLASSES.pickerGridInner;

		const recentEmojis = this.cb.recent.filter(n => n.startsWith('emoji:'));
		if (recentEmojis.length > 0) {
			inner.appendChild(this.buildSectionLabel('Recent'));
			const recentGrid = createDiv();
			recentGrid.className = `${CLASSES.pickerGrid} ${CLASSES.pickerGridEmoji}`;
			recentEmojis.forEach(name => recentGrid.appendChild(this.buildEmojiBtn(name)));
			inner.appendChild(recentGrid);
		}

		for (const cat of EMOJI_CATEGORIES) {
			inner.appendChild(this.buildSectionLabel(cat.label));
			const grid = createDiv();
			grid.className = `${CLASSES.pickerGrid} ${CLASSES.pickerGridEmoji}`;
			cat.emojis.forEach(emoji => grid.appendChild(this.buildEmojiBtn('emoji:' + emoji)));
			inner.appendChild(grid);
		}

		const update = () => {
			const { scrollTop, scrollHeight, clientHeight } = wrapper;
			outer.classList.toggle(CLASSES.canScrollUp, scrollTop > 0);
			outer.classList.toggle(CLASSES.canScrollDown, scrollTop + clientHeight < scrollHeight - 1);
		};
		wrapper.addEventListener('scroll', update, { passive: true });
		window.requestAnimationFrame(update);

		wrapper.appendChild(inner);
		outer.appendChild(wrapper);
		return outer;
	}

	private buildEmojiBtn(emojiName: string): HTMLElement {
		const emoji = emojiName.startsWith('emoji:') ? emojiName.slice(6) : emojiName;
		const btn = createEl('button');
		btn.className = `${CLASSES.iconOption} ${CLASSES.emojiOption}`;
		if (emojiName === this.cb.current.icon && this.cb.current.source === 'direct') {
			btn.classList.add(CLASSES.isSelected);
		}
		btn.textContent = emoji;
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.cb.onSelect({ icon: emojiName, color: 'default' });
			this.close();
		});
		return btn;
	}

	// ─── Color popover ────────────────────────────────────────────────────────

	private showColorPopover(iconBtn: HTMLElement, iconName: string): void {
		this.hideColorPopover();

		const popover = createDiv();
		popover.className = CLASSES.colorPopover;

		// Position relative to picker (picker is position:relative, fixed on screen)
		const pickerRect = this.container!.getBoundingClientRect();
		const btnRect = iconBtn.getBoundingClientRect();
		let top = btnRect.bottom - pickerRect.top + 4;
		let left = btnRect.left - pickerRect.left;
		popover.style.top = `${top}px`;
		popover.style.left = `${left}px`;

		ALL_COLORS.forEach((color) => {
			const btn = createEl('button');
			btn.className = CLASSES.colorOption;
			const isCurrentColor =
				color === this.cb.current.color &&
				iconName === this.cb.current.icon &&
				this.cb.current.source === 'direct';
			if (isCurrentColor) btn.classList.add(CLASSES.isSelected);

			const glyph = createSpan();
			glyph.className = CLASSES.icon;
			renderGlyph(glyph, iconName);
			applyColor(glyph, color); // notional-icon--{color} on the glyph, two-class CSS rules
			btn.appendChild(glyph);

			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.cb.onSelect({ icon: iconName, color });
				this.close();
			});

			popover.appendChild(btn);
		});

		this.container!.appendChild(popover);
		this.colorPopover = popover;

		// Reajust if overflows right/bottom edge of picker
		window.requestAnimationFrame(() => {
			if (!popover.isConnected) return;
			const pRect = popover.getBoundingClientRect();
			const cRect = this.container!.getBoundingClientRect();
			if (pRect.right > cRect.right - 4) {
				popover.style.left = `${Math.max(4, cRect.width - pRect.width - 4)}px`;
			}
			if (pRect.bottom > cRect.bottom - 4) {
				popover.style.top = `${Math.max(4, btnRect.top - cRect.top - pRect.height - 4)}px`;
			}
		});

		// Close when clicking outside popover
		const onOut = (e: MouseEvent) => {
			if (!popover.contains(e.target as Node) && !iconBtn.contains(e.target as Node)) {
				this.hideColorPopover();
				activeDocument.removeEventListener('click', onOut, true);
			}
		};
		window.setTimeout(() => {
			activeDocument.addEventListener('click', onOut, true);
			this.cleanup.push(() => activeDocument.removeEventListener('click', onOut, true));
		}, 50);
	}

	private hideColorPopover(): void {
		this.colorPopover?.remove();
		this.colorPopover = null;
	}

	// ─── Positioning (desktop) ────────────────────────────────────────────────

	private positionPopover(container: HTMLElement, anchor: HTMLElement | null): void {
		const W = 320;
		const H = Math.min(480, window.innerHeight * 0.72);
		const margin = 8;
		const rect = anchor?.getBoundingClientRect();
		let top = rect ? rect.bottom + 6 : window.innerHeight / 2 - H / 2;
		let left = rect ? rect.left : window.innerWidth / 2 - W / 2;
		left = Math.max(margin, Math.min(left, window.innerWidth - W - margin));
		top = Math.max(margin, Math.min(top, window.innerHeight - H - margin));
		container.style.top = `${top}px`;
		container.style.left = `${left}px`;
		container.style.width = `${W}px`;
		container.style.maxHeight = `${H}px`;
	}

	// ─── Close ────────────────────────────────────────────────────────────────

	close(): void {
		activeDocument.body.classList.remove(CLASSES.pickerActive);
		this.hideColorPopover();
		this.backdrop?.classList.remove(CLASSES.isVisible);
		this.container?.classList.remove(CLASSES.isVisible);
		this.cleanup.forEach((fn) => fn());
		this.cleanup = [];
		const backdrop = this.backdrop;
		const container = this.container;
		this.backdrop = null;
		this.container = null;
		window.setTimeout(() => {
			backdrop?.remove();
			container?.remove();
		}, 200);
	}
}
