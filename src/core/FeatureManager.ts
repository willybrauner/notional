import { Platform } from 'obsidian';
import type { Component } from 'obsidian';
import type { Feature } from './Feature';
import type { FeatureContext, FeatureDefinition, FeatureStates } from './types';

/**
 * Turns features on and off while Obsidian runs: a running feature is a child
 * of the plugin, removing it unloads it. A feature runs when it is enabled,
 * available on this platform (desktopOnly) and every feature it requires runs.
 */
export class FeatureManager {
	private readonly running = new Map<string, Feature>();

	constructor(
		private readonly host: Component,
		readonly definitions: readonly FeatureDefinition[],
		private readonly context: Omit<FeatureContext, 'id'>,
		private readonly states: FeatureStates,
	) {}

	/** Starts every enabled feature, in registry order. */
	loadAll(): void {
		for (const definition of this.definitions) {
			if (this.isEnabled(definition.id)) this.start(definition);
		}
	}

	/** Stored state, or the default of the feature. */
	isEnabled(id: string): boolean {
		return this.states.get(id) ?? this.definition(id).defaultEnabled;
	}

	isRunning(id: string): boolean {
		return this.running.has(id);
	}

	isAvailable(id: string): boolean {
		return !this.definition(id).desktopOnly || Platform.isDesktopApp;
	}

	/** Features that require this one, directly or not. */
	dependentsOf(id: string): string[] {
		const direct = this.definitions.filter(d => d.requires.includes(id)).map(d => d.id);
		return [...new Set(direct.flatMap(dependent => [dependent, ...this.dependentsOf(dependent)]))];
	}

	/** Turns a feature on, then the enabled dependents it was blocking. */
	async enable(id: string): Promise<void> {
		await this.states.set(id, true);
		this.start(this.definition(id));
		for (const definition of this.definitions) {
			if (this.dependentsOf(id).includes(definition.id) && this.isEnabled(definition.id)) this.start(definition);
		}
	}

	/**
	 * Turns a feature off, and its running dependents with it (they stay enabled:
	 * they come back with it). Returns the dependents it stopped, for a warning.
	 */
	async disable(id: string): Promise<string[]> {
		await this.states.set(id, false);
		const stopped = this.dependentsOf(id).filter(dependent => this.running.has(dependent));
		// Last started first, like an unload
		[...stopped].reverse().forEach(dependent => this.stop(dependent));
		this.stop(id);
		return stopped;
	}

	/** Restarts a running feature and its running dependents, for a setting read on load. */
	restart(id: string): void {
		if (!this.running.has(id)) return;
		const stopped = this.dependentsOf(id).filter(dependent => this.running.has(dependent));
		[...stopped].reverse().forEach(dependent => this.stop(dependent));
		this.stop(id);
		// Registry order: the feature before the dependents that require it
		for (const definition of this.definitions) {
			if (definition.id === id || stopped.includes(definition.id)) this.start(definition);
		}
	}

	private definition(id: string): FeatureDefinition {
		const definition = this.definitions.find(d => d.id === id);
		if (!definition) throw new Error(`Unknown feature: ${id}`);
		return definition;
	}

	private start(definition: FeatureDefinition): void {
		const { id } = definition;
		if (this.running.has(id) || !this.isAvailable(id)) return;
		if (!definition.requires.every(required => this.running.has(required))) return;
		const feature = definition.create({ ...this.context, id });
		this.running.set(id, feature);
		try {
			this.host.addChild(feature);
		} catch (error) {
			// One broken feature must not keep the others from loading
			console.error(`Notionalize: the "${id}" feature failed to load`, error);
			this.stop(id);
		}
	}

	private stop(id: string): void {
		const feature = this.running.get(id);
		if (!feature) return;
		this.running.delete(id);
		this.host.removeChild(feature);
	}
}
