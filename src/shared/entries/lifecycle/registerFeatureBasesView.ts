import type { BasesView, BasesViewRegistration, Component, Plugin } from 'obsidian';
import { closeBasesView } from './closeBasesView';
import { reopenBasesViews } from './reopenBasesViews';
import type { ControllerInternals } from './types';

// Controllers whose view went down with its feature, by view type. Module
// state: a feature is a new instance each time it is turned on
const closedControllers = new Map<string, Set<ControllerInternals>>();

/**
 * Registers a Bases view type for a feature (`plugin` scoped to `owner`).
 * Obsidian keeps the views already open running after `deregisterView`, so
 * turning the feature off closes them and turning it on again reopens them.
 */
export function registerFeatureBasesView(owner: Component, plugin: Plugin, viewId: string, registration: BasesViewRegistration): void {
	const open = new Map<BasesView, ControllerInternals>();
	// Registered first, so it runs after the deregistration below (cleanups run
	// last in, first out): update() then finds no factory for the type
	owner.register(() => {
		const controllers = new Set(open.values());
		for (const [view, controller] of [...open]) closeBasesView(controller, view);
		closedControllers.set(viewId, controllers);
	});
	plugin.registerBasesView(viewId, {
		...registration,
		factory: (controller, containerEl) => {
			const view = registration.factory(controller, containerEl);
			open.set(view, controller as ControllerInternals);
			view.register(() => open.delete(view));
			return view;
		},
	});
	reopenBasesViews(closedControllers.get(viewId) ?? [], viewId);
	closedControllers.delete(viewId);
}
