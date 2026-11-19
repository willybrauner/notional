import { ATTRS, CLASSES, SELECTORS, colorBtnClass } from '../constants';
import { tagColorClass } from '../../colors/constants';
import { renderSwatches } from '../../colors/palette/renderSwatches';
import { getColor } from '../../colors/getColor';
import { dismissModal } from './dismissModal';

interface ModalState {
	activeModal: HTMLElement | null;
	activeBackdrop: HTMLElement | null;
	activeTd: HTMLElement | null;
	modalDragCleanup: (() => void) | null;
	modalTimer: number | null;
}

interface ShowBottomSheetCallbacks {
	currentBaseSeeds: Record<string, string[]>;
	globalSeeds: Record<string, string[]>;
	colorMap: Record<string, string>;
	collectOptions: (fmKey: string) => string[];
	setValue: (sourcePath: string, fmKey: string, value: string) => Promise<void>;
	clearValue: (sourcePath: string, fmKey: string) => Promise<void>;
	onPickColor: (label: string, color: string | null) => void;
}

function getCurrentValue(anchor: HTMLElement, context: 'base' | 'note'): string {
	if (context === 'base') {
		return (
			anchor.querySelector(`[${ATTRS.propertyLongtextValue}]`)?.getAttribute(ATTRS.propertyLongtextValue) ??
			anchor.querySelector<HTMLElement>('[contenteditable]')?.textContent?.trim() ??
			''
		);
	}
	return anchor.querySelector<HTMLElement>(SELECTORS.metadataPropertyValueCe)?.textContent?.trim() ?? '';
}

/** Builds a mobile-friendly inline option row with touch color swatches. */
function makeMobileOptionEl(
	label: string,
	isSelected: boolean,
	onClick: () => Promise<void> | void,
	color: string | null | undefined,
	onPickColor: (label: string, color: string | null) => void,
): HTMLElement {
	const item = createDiv();
	item.className = CLASSES.option;
	if (isSelected) item.classList.add(CLASSES.isSelected);

	if (color !== undefined) {
		const row = createDiv();
		row.className = CLASSES.optionMainRow;

		const chip = createSpan();
		chip.className = tagColorClass(color);
		chip.textContent = label;
		row.appendChild(chip);

		const right = createSpan();
		right.className = CLASSES.optionRight;

		const colorBtn = createSpan();
		colorBtn.className = colorBtnClass(color);
		let swatchRow: HTMLElement | null = null;
		let current = color ?? null;

		colorBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
		colorBtn.addEventListener('touchend', (e) => {
			e.stopPropagation(); e.preventDefault();
			if (swatchRow) { swatchRow.remove(); swatchRow = null; return; }

			swatchRow = createDiv();
			swatchRow.className = CLASSES.inlineSwatchRow;
			renderSwatches(swatchRow, current, picked => {
				current = picked;
				chip.className = tagColorClass(picked);
				colorBtn.className = colorBtnClass(picked);
				swatchRow?.remove(); swatchRow = null;
				onPickColor(label, picked);
			});

			item.appendChild(swatchRow);
		});

		if (isSelected) {
			const check = createSpan();
			check.className = CLASSES.check;
			check.textContent = '✓';
			right.appendChild(check);
		}
		right.appendChild(colorBtn);
		row.appendChild(right);
		item.appendChild(row);
	} else {
		item.textContent = label;
	}

	item.addEventListener('touchend', (e) => {
		if ((e.target as HTMLElement).closest(`.${CLASSES.colorBtn}, .${CLASSES.inlineSwatchRow}`)) return;
		e.preventDefault();
		void onClick();
	});

	return item;
}

/**
 * Builds and shows the mobile bottom-sheet picker for a select cell.
 * Mutates state to store modal/backdrop references and drag cleanup.
 */
export function showBottomSheet(
	anchor: HTMLElement,
	normalizedPropKey: string,
	fmKey: string,
	sourcePath: string,
	context: 'base' | 'note',
	state: ModalState,
	callbacks: ShowBottomSheetCallbacks,
): void {
	const currentValue = getCurrentValue(anchor, context);
	const seeds = context === 'base'
		? (callbacks.currentBaseSeeds[normalizedPropKey] ?? [])
		: (callbacks.globalSeeds[normalizedPropKey] ?? []);
	const existing = callbacks.collectOptions(fmKey);
	const allOptions = [...new Set([...seeds, ...existing])].filter(Boolean);

	const backdrop = createDiv();
	backdrop.className = CLASSES.backdrop;
	Object.assign(backdrop.style, {
		position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
		zIndex: '9998',
	});

	const modal = createDiv();
	modal.className = CLASSES.bottomSheet;
	Object.assign(modal.style, {
		position: 'fixed', bottom: '0', left: '0', right: '0',
		backgroundColor: 'var(--background-primary)',
		color: 'var(--text-normal)',
		maxHeight: '90vh',
		zIndex: '9999',
		display: 'flex',
		flexDirection: 'column',
		willChange: 'transform',
	});

	const dragHandle = createDiv();
	dragHandle.className = CLASSES.dragHandle;
	Object.assign(dragHandle.style, {
		padding: '12px 0 8px',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexShrink: '0',
		cursor: 'grab',
	});
	const pill = createDiv();
	pill.className = CLASSES.pill;
	Object.assign(pill.style, {
		width: '36px', height: '4px',
		borderRadius: '2px',
		backgroundColor: 'var(--text-muted)',
		opacity: '0.4',
	});
	dragHandle.appendChild(pill);
	modal.appendChild(dragHandle);

	const header = createDiv();
	Object.assign(header.style, {
		padding: '4px 16px 16px',
		borderBottom: '1px solid var(--divider-color)',
		display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: '0',
	});

	const title = createDiv();
	title.textContent = normalizedPropKey.charAt(0).toUpperCase() + normalizedPropKey.slice(1);
	Object.assign(title.style, { fontSize: '16px', fontWeight: '600', color: 'var(--text-normal)' });
	header.appendChild(title);

	const input = createEl('input');
	input.type = 'text';
	input.className = CLASSES.input;
	input.placeholder = 'Search or create…';
	Object.assign(input.style, {
		padding: '10px 12px',
		border: '1px solid var(--divider-color)',
		borderRadius: '8px',
		fontSize: '14px',
		width: '100%',
		boxSizing: 'border-box',
	});
	header.appendChild(input);
	modal.appendChild(header);

	modal.dataset.notionalProp = normalizedPropKey;

	const list = createDiv();
	Object.assign(list.style, {
		display: 'flex', flexDirection: 'column',
		overflowY: 'auto', flex: '1',
		paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
	});
	modal.appendChild(list);

	const render = (filter: string) => {
		list.empty();
		const lf = filter.toLowerCase();
		const filtered = filter ? allOptions.filter(o => o.toLowerCase().includes(lf)) : allOptions;

		if (currentValue) {
			const clearEl = makeMobileOptionEl('Clear', false, async () => {
				dismissModal(state); await callbacks.clearValue(sourcePath, fmKey);
			}, undefined, callbacks.onPickColor);
			clearEl.classList.add(CLASSES.isClear);
			Object.assign(clearEl.style, { padding: '10px 16px', borderBottom: '1px solid var(--divider-color)' });
			list.appendChild(clearEl);
		}

		const others = currentValue ? filtered.filter(o => o !== currentValue) : filtered;
		if (currentValue && filtered.includes(currentValue)) {
			const el = makeMobileOptionEl(currentValue, true, () => dismissModal(state), getColor(callbacks.colorMap, currentValue), callbacks.onPickColor);
			Object.assign(el.style, { padding: '10px 16px', borderBottom: '1px solid var(--divider-color)' });
			list.appendChild(el);
		}
		for (const o of others) {
			const el = makeMobileOptionEl(o, false, async () => {
				dismissModal(state); await callbacks.setValue(sourcePath, fmKey, o);
			}, getColor(callbacks.colorMap, o), callbacks.onPickColor);
			Object.assign(el.style, { padding: '10px 16px', borderBottom: '1px solid var(--divider-color)' });
			list.appendChild(el);
		}

		if (filter && !allOptions.find(o => o.toLowerCase() === lf)) {
			const el = makeMobileOptionEl(`Create "${filter}"`, false, async () => {
				dismissModal(state); await callbacks.setValue(sourcePath, fmKey, filter);
			}, undefined, callbacks.onPickColor);
			el.classList.add(CLASSES.isCreate);
			Object.assign(el.style, { padding: '10px 16px', color: 'var(--text-muted)' });
			list.appendChild(el);
		}
	};

	render('');
	input.addEventListener('input', () => render(input.value));
	input.addEventListener('keydown', (ev: KeyboardEvent) => {
		if (ev.key === 'Escape') { ev.preventDefault(); dismissModal(state); }
	});
	input.addEventListener('focus', () => { modal.classList.add(CLASSES.isExpanded); });
	input.addEventListener('blur', () => { modal.classList.remove(CLASSES.isExpanded); });

	// ── Drag to dismiss ────────────────────────────────────────────────────────
	let dragStartY = 0;
	let dragging = false;

	const onDragMove = (ev: TouchEvent) => {
		if (!dragging || !ev.touches[0]) return;
		const dy = Math.max(0, ev.touches[0].clientY - dragStartY);
		modal.classList.add(CLASSES.noTransition);
		modal.style.transform = `translateY(${dy}px)`;
		backdrop.classList.add(CLASSES.noTransition);
		const modalH = modal.getBoundingClientRect().height;
		backdrop.style.opacity = String(Math.max(0, 0.4 * (1 - dy / modalH)));
	};

	const onDragEnd = (ev: TouchEvent) => {
		dragging = false;
		activeDocument.removeEventListener('touchmove', onDragMove);
		activeDocument.removeEventListener('touchend', onDragEnd);
		if (!ev.changedTouches[0]) return;

		const dy = ev.changedTouches[0].clientY - dragStartY;
		const modalH = modal.getBoundingClientRect().height;
		if (dy > modalH * 0.35) {
			dismissModal(state);
		} else {
			modal.classList.remove(CLASSES.noTransition);
			backdrop.classList.remove(CLASSES.noTransition);
			window.requestAnimationFrame(() => {
				modal.style.removeProperty('transform');
				backdrop.style.removeProperty('opacity');
			});
		}
	};

	dragHandle.addEventListener('touchstart', (ev: TouchEvent) => {
		if (!ev.touches[0]) return;
		dragging = true;
		dragStartY = ev.touches[0].clientY;
		activeDocument.addEventListener('touchmove', onDragMove, { passive: true });
		activeDocument.addEventListener('touchend', onDragEnd);
	}, { passive: true });

	state.modalDragCleanup = () => {
		activeDocument.removeEventListener('touchmove', onDragMove);
		activeDocument.removeEventListener('touchend', onDragEnd);
	};

	activeDocument.body.appendChild(backdrop);
	activeDocument.body.appendChild(modal);
	state.activeModal = modal;
	state.activeBackdrop = backdrop;

	window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
		backdrop.classList.add(CLASSES.isVisible);
		modal.classList.add(CLASSES.isVisible);
	}));
}
