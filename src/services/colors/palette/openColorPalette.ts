import { CLASSES, PALETTE_GAP, PALETTE_MARGIN } from '../constants';
import { dismissColorPalette } from './dismissColorPalette';
import { paletteState } from './paletteState';
import { renderSwatches } from './renderSwatches';

/**
 * Opens the floating color palette under the anchor (above when there is no
 * room). Picking a swatch closes it and calls onPick. Opening it again from the
 * same anchor closes it; a press outside or Escape closes it too. onClose
 * runs whenever it closes (picked or dismissed). It opens in the anchor's
 * window (main or popout).
 */
export function openColorPalette(
	anchor: HTMLElement,
	current: string | null,
	onPick: (color: string | null) => void,
	onClose?: () => void,
): void {
	if (paletteState.anchor === anchor) {
		dismissColorPalette();
		return;
	}
	dismissColorPalette();

	const doc = anchor.doc;
	const palette = doc.body.createDiv({ cls: CLASSES.palette });
	const hasPopover = 'showPopover' in HTMLElement.prototype;
	if (hasPopover) palette.setAttribute('popover', 'manual');
	// Reset UA popover defaults (inset, margin) so fixed positioning works
	Object.assign(palette.style, { position: 'fixed', top: '0', left: '0', right: 'auto', bottom: 'auto', margin: '0' });
	renderSwatches(palette, current, color => {
		dismissColorPalette();
		onPick(color);
	});
	if (hasPopover) (palette as HTMLElement & { showPopover(): void }).showPopover();

	const rect = anchor.getBoundingClientRect();
	const vw = doc.documentElement.clientWidth;
	const vh = doc.documentElement.clientHeight;
	const below = rect.bottom + PALETTE_GAP;
	const top = below + palette.offsetHeight > vh - PALETTE_MARGIN ? rect.top - PALETTE_GAP - palette.offsetHeight : below;
	const left = Math.min(rect.left, vw - PALETTE_MARGIN - palette.offsetWidth);
	palette.style.top = `${Math.max(PALETTE_MARGIN, top)}px`;
	palette.style.left = `${Math.max(PALETTE_MARGIN, left)}px`;

	const onPointerDown = (e: PointerEvent) => {
		const target = e.target as Node;
		if (palette.contains(target) || anchor.contains(target)) return;
		dismissColorPalette();
	};
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key !== 'Escape') return;
		e.preventDefault();
		e.stopPropagation();
		dismissColorPalette();
	};
	doc.addEventListener('pointerdown', onPointerDown, true);
	doc.addEventListener('keydown', onKeyDown, true);

	paletteState.el = palette;
	paletteState.anchor = anchor;
	paletteState.onClose = onClose ?? null;
	paletteState.cleanup = () => {
		doc.removeEventListener('pointerdown', onPointerDown, true);
		doc.removeEventListener('keydown', onKeyDown, true);
	};
}
