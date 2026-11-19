import { CLASSES } from '../constants';

interface ModalState {
	activeModal: HTMLElement | null;
	activeBackdrop: HTMLElement | null;
	activeTd: HTMLElement | null;
	modalDragCleanup: (() => void) | null;
	modalTimer: number | null;
}

/**
 * Animates the bottom-sheet out and removes it, clearing all related state.
 * Mutates the state object in place.
 */
export function dismissModal(state: ModalState): void {
	if (!state.activeModal) return;

	state.modalDragCleanup?.();
	state.modalDragCleanup = null;

	const modal = state.activeModal;
	const backdrop = state.activeBackdrop;
	state.activeModal = null;
	state.activeBackdrop = null;
	state.activeTd = null;

	modal.classList.remove(CLASSES.noTransition);
	if (backdrop) backdrop.classList.remove(CLASSES.noTransition);
	modal.style.removeProperty('transform');
	backdrop?.style.removeProperty('opacity');

	// Double-rAF: let the browser see the restored transition before removing is-visible
	window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
		modal.classList.remove(CLASSES.isVisible);
		if (backdrop) backdrop.classList.remove(CLASSES.isVisible);
		window.setTimeout(() => { modal.remove(); backdrop?.remove(); }, 300);
	}));
}
