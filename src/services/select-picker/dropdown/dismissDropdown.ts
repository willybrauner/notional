import { dismissColorPalette } from '../../colors/palette/dismissColorPalette';

interface DropdownState {
	dropdownTimer: number | null;
	activeDropdown: HTMLElement | null;
	activeTd: HTMLElement | null;
}

/**
 * Cancels any pending dropdown timer, dismisses the color palette and dropdown,
 * and clears related state. Mutates the state object in place.
 */
export function dismissDropdown(state: DropdownState): void {
	if (state.dropdownTimer !== null) {
		window.clearTimeout(state.dropdownTimer);
		state.dropdownTimer = null;
	}
	dismissColorPalette();
	if (state.activeDropdown) {
		if ('hidePopover' in state.activeDropdown) {
			try { (state.activeDropdown as HTMLElement & { hidePopover(): void }).hidePopover(); } catch { /* ignore */ }
		}
		state.activeDropdown.remove();
		state.activeDropdown = null;
	}
	state.activeTd = null;
}
