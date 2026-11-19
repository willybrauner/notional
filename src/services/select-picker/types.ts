import type { TFile } from 'obsidian';

// Mutable UI state of the open select picker, shared by every caller so only one is open at a time.
// Module functions mutate it in place.
export interface PickerUIState {
	activeDropdown: HTMLElement | null;
	activeModal: HTMLElement | null;
	activeBackdrop: HTMLElement | null;
	activeTd: HTMLElement | null;
	dropdownTimer: number | null;
	modalDragCleanup: (() => void) | null;
	modalTimer: number | null;
}

export type PickerContext = 'base' | 'note';

// Called with a new active file (seedsRead false), then once the seeds of an active .base are read
export type ActiveFileListener = (file: TFile | null, seedsRead: boolean) => void;
