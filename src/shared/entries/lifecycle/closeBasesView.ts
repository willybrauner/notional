import type { BasesView } from 'obsidian';
import type { ControllerInternals } from './types';

// Takes an open view down once its type is deregistered: the base shows
// Obsidian's "unknown view type" message in its place
export function closeBasesView(controller: ControllerInternals, view: BasesView): void {
	if (controller.view !== view) return;
	controller.removeChild(view);
	controller.view = null;
	controller.viewContainerEl.empty();
	controller.update();
}
