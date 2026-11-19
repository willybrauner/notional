import type { App } from 'obsidian';
import type { SelectPicker } from '../../services/select-picker/SelectPicker';
import type { PickerUIState } from '../../services/select-picker/types';

// Last click or tap (double-click detection) and the touch in progress
export interface PointerState {
	lastClickTd: HTMLElement | null;
	lastClickTime: number;
	// The click following a double-click → inline edit is swallowed
	preventNextClick: boolean;
	touchStartEl: HTMLElement | null;
	touchStartX: number;
	touchStartY: number;
	touchMoved: boolean;
}

// What the pointer handlers read and act on, held by the feature
export interface InteractionDeps {
	app: App;
	picker: SelectPicker;
	ui: PickerUIState;
	state: PointerState;
	enterInlineEdit: (td: HTMLElement) => void;
}
