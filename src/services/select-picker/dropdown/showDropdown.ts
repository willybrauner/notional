import { ATTRS, CLASSES, SELECTORS } from '../constants';
import { getColor } from '../../colors/getColor';
import { makeOptionEl } from './makeOptionEl';
import { dismissDropdown } from './dismissDropdown';

interface DropdownState {
	dropdownTimer: number | null;
	activeDropdown: HTMLElement | null;
	activeTd: HTMLElement | null;
}

interface ShowDropdownCallbacks {
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

/**
 * Builds and shows the desktop dropdown picker for a select cell.
 * Returns the created dropdown element (caller stores as activeDropdown).
 */
export function showDropdown(
	anchor: HTMLElement,
	normalizedPropKey: string,
	fmKey: string,
	sourcePath: string,
	context: 'base' | 'note',
	state: DropdownState,
	callbacks: ShowDropdownCallbacks,
): HTMLElement {
	const currentValue = getCurrentValue(anchor, context);
	const seeds = context === 'base'
		? (callbacks.currentBaseSeeds[normalizedPropKey] ?? [])
		: (callbacks.globalSeeds[normalizedPropKey] ?? []);
	const existing = callbacks.collectOptions(fmKey);
	const allOptions = [...new Set([...seeds, ...existing])].filter(Boolean);

	const dropdown = createDiv();
	dropdown.className = CLASSES.dropdown;
	dropdown.dataset.notionalProp = normalizedPropKey;
	const hasPopover = 'showPopover' in HTMLElement.prototype;
	if (hasPopover) dropdown.setAttribute('popover', 'manual');
	// Reset UA popover defaults so our fixed positioning works
	Object.assign(dropdown.style, {
		position: 'fixed',
		top: '-9999px',
		left: '-9999px',
		right: 'auto',
		bottom: 'auto',
		margin: '0',
		zIndex: '9999',
	});

	const input = createEl('input');
	input.type = 'text';
	input.className = CLASSES.input;
	input.placeholder = 'Search or create…';
	dropdown.appendChild(input);

	const list = createDiv();
	list.className = CLASSES.list;
	dropdown.appendChild(list);

	const optionCallbacks = { onPickColor: callbacks.onPickColor };

	const render = (filter: string) => {
		list.empty();
		const lf = filter.toLowerCase();
		const filtered = filter ? allOptions.filter(o => o.toLowerCase().includes(lf)) : allOptions;

		if (currentValue) {
			const clearEl = makeOptionEl('Clear', false, async () => {
				dismissDropdown(state);
				await callbacks.clearValue(sourcePath, fmKey);
			}, undefined, optionCallbacks);
			clearEl.classList.add(CLASSES.isClear);
			list.appendChild(clearEl);
		}

		if (currentValue && filtered.includes(currentValue)) {
			list.appendChild(makeOptionEl(currentValue, true, () => dismissDropdown(state), getColor(callbacks.colorMap, currentValue), optionCallbacks));
			for (const o of filtered.filter(o => o !== currentValue)) {
				list.appendChild(makeOptionEl(o, false, async () => {
					dismissDropdown(state);
					await callbacks.setValue(sourcePath, fmKey, o);
				}, getColor(callbacks.colorMap, o), optionCallbacks));
			}
		} else {
			for (const o of filtered) {
				list.appendChild(makeOptionEl(o, false, async () => {
					dismissDropdown(state);
					await callbacks.setValue(sourcePath, fmKey, o);
				}, getColor(callbacks.colorMap, o), optionCallbacks));
			}
		}

		const isNew = filter && !allOptions.find(o => o.toLowerCase() === lf);
		if (isNew) {
			const el = makeOptionEl(`Create "${filter}"`, false, async () => {
				dismissDropdown(state);
				await callbacks.setValue(sourcePath, fmKey, filter);
			}, undefined, optionCallbacks);
			el.classList.add(CLASSES.isCreate);
			list.appendChild(el);
		}
	};

	render('');
	input.addEventListener('input', () => render(input.value));
	input.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Escape') { e.preventDefault(); dismissDropdown(state); }
		if (e.key === 'Enter') {
			e.preventDefault();
			list.querySelector<HTMLElement>(`.${CLASSES.option}`)
				?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		}
	});

	activeDocument.body.appendChild(dropdown);
	if (hasPopover) (dropdown as HTMLElement & { showPopover(): void }).showPopover();

	// Smart positioning: double-rAF ensures layout is settled after showPopover()
	window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
		const anchorRect = anchor.getBoundingClientRect();
		const dropRect = dropdown.getBoundingClientRect();
		const dropW = dropRect.width || dropdown.offsetWidth;
		const dropH = dropRect.height || dropdown.offsetHeight;
		const vw = activeDocument.documentElement.clientWidth;
		const vh = activeDocument.documentElement.clientHeight;
		const GAP = 4;
		const MARGIN = 8;

		const spaceBelow = vh - anchorRect.bottom - GAP;
		const spaceAbove = anchorRect.top - GAP;
		let top = spaceBelow >= dropH || spaceBelow >= spaceAbove
			? anchorRect.bottom + GAP
			: Math.max(MARGIN, anchorRect.top - dropH - GAP);

		let left = anchorRect.left;
		left = Math.min(left, vw - MARGIN - dropW);
		left = Math.max(MARGIN, left);
		top = Math.max(MARGIN, top);

		dropdown.style.top = `${top}px`;
		dropdown.style.left = `${left}px`;
		dropdown.classList.add(CLASSES.isVisible);
	}));

	window.setTimeout(() => input.focus(), 0);
	return dropdown;
}
