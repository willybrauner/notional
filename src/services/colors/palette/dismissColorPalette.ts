import { paletteState } from './paletteState';

/** Closes the open color palette, if any. */
export function dismissColorPalette(): void {
	paletteState.cleanup?.();
	const onClose = paletteState.onClose;
	const el = paletteState.el;
	if (el) {
		if ('hidePopover' in el) {
			try { (el as HTMLElement & { hidePopover(): void }).hidePopover(); } catch { /* not shown */ }
		}
		el.remove();
	}
	paletteState.el = null;
	paletteState.anchor = null;
	paletteState.cleanup = null;
	paletteState.onClose = null;
	onClose?.();
}
