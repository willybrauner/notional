import { Setting } from 'obsidian';
import { renderFeature } from './renderFeature';
import type { SettingsSection, SettingsTabContext } from './types';

// Heading of a registry section and its features, in registry order (nothing while it has none)
export function renderSection(containerEl: HTMLElement, section: SettingsSection, ctx: SettingsTabContext): void {
	const definitions = ctx.features.definitions.filter(d => d.section === section.name);
	if (definitions.length === 0) return;

	new Setting(containerEl).setName(section.name).setHeading();
	for (const definition of definitions) {
		renderFeature(containerEl, definition, ctx, section.subSettings[definition.id]);
	}
}
