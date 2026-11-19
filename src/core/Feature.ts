import { Component } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { FEATURE_BODY_CLASS_PREFIX } from './constants';
import { createScopedPlugin } from './createScopedPlugin';
import type { FeatureContext } from './types';

/**
 * A feature that can be turned on and off while Obsidian runs. Register every
 * listener, observer and plugin API through `this.register*` or `this.plugin`
 * (scoped to the feature): unloading the feature then leaves nothing behind.
 * While loaded, `body.notional-feature-<id>` scopes the feature's styles. It
 * is set on the main window's body: Obsidian mirrors its classes into popouts.
 */
export abstract class Feature extends Component {
	readonly id: string;
	protected readonly app: App;
	// Plugin APIs registered here are cleaned up when the feature unloads
	protected readonly plugin: Plugin;
	protected readonly ctx: FeatureContext;
	// True between load and unload
	private running = false;

	constructor(ctx: FeatureContext) {
		super();
		this.id = ctx.id;
		this.app = ctx.app;
		this.ctx = ctx;
		this.plugin = createScopedPlugin(ctx.plugin, this);
	}

	get bodyClass(): string {
		return FEATURE_BODY_CLASS_PREFIX + this.id;
	}

	// Body class first, so onload already renders with the feature's styles
	load(): void {
		window.document.body.classList.add(this.bodyClass);
		this.running = true;
		super.load();
	}

	unload(): void {
		this.running = false;
		super.unload();
		window.document.body.classList.remove(this.bodyClass);
	}

	// Runs `callback` once the layout is ready (right away if it already is),
	// unless the feature was turned off in between: nothing registers after unload
	protected onLayoutReady(callback: () => void): void {
		this.app.workspace.onLayoutReady(() => {
			if (this.running) callback();
		});
	}
}
