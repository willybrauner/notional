// The single open palette (only one at a time across the plugin)
export const paletteState = {
	el: null as HTMLElement | null,
	anchor: null as HTMLElement | null,
	cleanup: null as (() => void) | null,
	onClose: null as (() => void) | null,
};
