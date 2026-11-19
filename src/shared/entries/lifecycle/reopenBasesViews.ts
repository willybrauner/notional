import type { ControllerInternals } from './types';

// Rebuilds the views closed by `closeBasesView` once their type is registered
// again, unless the base was closed or switched to another view meanwhile
export function reopenBasesViews(controllers: Iterable<ControllerInternals>, viewId: string): void {
	for (const controller of controllers) {
		if (!controller.viewContainerEl.isConnected || controller.view || !controller.query) continue;
		if (controller.getViewConfig()?.type !== viewId) continue;
		// update() alone keeps the error shown: the query didn't change
		controller.clearError();
		controller.update();
	}
}
