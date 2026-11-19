import { Menu, setIcon } from 'obsidian';
import { CLASSES, ZOOMS } from '../constants';
import type { Zoom } from '../constants';

export interface ToolbarHandlers {
	zoom: Zoom;
	sidebarCollapsed: boolean;
	showSidebar: boolean;
	onZoom: (zoom: Zoom) => void;
	onToday: () => void;
	onStep: (direction: -1 | 1) => void;
	onToggleSidebar: () => void;
}

function iconButton(parent: HTMLElement, icon: string, label: string, onClick: () => void): HTMLElement {
	const btn = parent.createEl('button', { cls: `${CLASSES.toolbarBtn} clickable-icon`, attr: { 'aria-label': label } });
	setIcon(btn, icon);
	btn.addEventListener('click', onClick);
	return btn;
}

/** Compact toolbar: sidebar toggle on the left; zoom menu and ‹ Today › on the right. */
export function renderToolbar(parent: HTMLElement, h: ToolbarHandlers): HTMLElement {
	const bar = parent.createDiv({ cls: CLASSES.toolbar });

	if (h.showSidebar && h.sidebarCollapsed) {
		iconButton(bar, 'chevrons-right', 'Show list', h.onToggleSidebar);
	}
	// Filled by applySelection ("2 selected · ⌫ to delete")
	bar.createDiv({ cls: CLASSES.selectionHint });
	bar.createDiv({ cls: CLASSES.toolbarSpacer });

	const current = ZOOMS.find(z => z.id === h.zoom) ?? ZOOMS[0];
	const zoomBtn = bar.createEl('button', { cls: `${CLASSES.toolbarBtn} ${CLASSES.zoomSelect}` });
	zoomBtn.createSpan({ text: current?.label ?? '' });
	setIcon(zoomBtn.createSpan({ cls: 'notional-timeline-zoom-chevron' }), 'chevron-down');
	zoomBtn.addEventListener('click', () => {
		const menu = new Menu();
		for (const z of ZOOMS) {
			menu.addItem(item => item
				.setTitle(z.label)
				.setChecked(z.id === h.zoom)
				.onClick(() => h.onZoom(z.id)));
		}
		// Anchored under the button (independent of the pointer position)
		const rect = zoomBtn.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
	});

	iconButton(bar, 'chevron-left', 'Previous', () => h.onStep(-1));
	const today = bar.createEl('button', { cls: CLASSES.toolbarBtn, text: 'Today' });
	today.addEventListener('click', h.onToday);
	iconButton(bar, 'chevron-right', 'Next', () => h.onStep(1));

	return bar;
}
