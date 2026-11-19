import { Notice, Setting } from 'obsidian';
import type { FeatureDefinition } from '../core/types';
import { SETTINGS_CLASSES } from './constants';
import type { SettingsTabContext, SubSettingsRenderer } from './types';

// One feature: toggle, description, Learn more, Desktop only badge, then its sub-settings while it is on
export function renderFeature(
	containerEl: HTMLElement,
	definition: FeatureDefinition,
	ctx: SettingsTabContext,
	subSettings?: SubSettingsRenderer,
): void {
	const { features } = ctx;
	const { id } = definition;
	const enabled = features.isEnabled(id);
	const available = features.isAvailable(id);
	const dependents = features.dependentsOf(id).map(dependent => nameOf(ctx, dependent));

	const setting = new Setting(containerEl)
		.setName(definition.name)
		.setDesc(description(definition, enabled ? dependents : []))
		.addToggle(toggle => toggle
			.setValue(enabled)
			.setDisabled(!available)
			.onChange(async value => {
				if (value) {
					await features.enable(id);
				} else {
					const stopped = await features.disable(id);
					if (stopped.length > 0) new Notice(`Also stopped: ${stopped.map(dependent => nameOf(ctx, dependent)).join(', ')}.`);
				}
				ctx.refresh();
			}));
	setting.settingEl.addClass(SETTINGS_CLASSES.feature);
	setting.settingEl.dataset.feature = id;
	if (definition.desktopOnly) setting.nameEl.createSpan({ cls: SETTINGS_CLASSES.badge, text: 'Desktop only' });

	if (!subSettings || !enabled || !available) return;
	subSettings(containerEl.createDiv({ cls: SETTINGS_CLASSES.subSettings }), ctx);
}

// Description, Learn more link, and the dependents that turning it off would stop
function description(definition: FeatureDefinition, dependents: string[]): DocumentFragment {
	const fragment = createFragment();
	fragment.appendText(`${definition.description} `);
	fragment.createEl('a', { text: 'Learn more', href: definition.docsUrl, cls: SETTINGS_CLASSES.learnMore });
	if (dependents.length > 0) {
		fragment.createDiv({ cls: SETTINGS_CLASSES.warning, text: `Turning it off also stops: ${dependents.join(', ')}.` });
	}
	return fragment;
}

function nameOf(ctx: SettingsTabContext, id: string): string {
	return ctx.features.definitions.find(d => d.id === id)?.name ?? id;
}
