import type { BasesView, QueryController } from 'obsidian';

// Bases internals of a base's controller (not in the public API)
export interface ControllerInternals extends QueryController {
	view: BasesView | null;
	viewContainerEl: HTMLElement;
	query: unknown;
	getViewConfig(): { type: string } | null | undefined;
	update(): void;
	clearError(): void;
}
