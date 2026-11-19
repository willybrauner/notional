import { Setting } from 'obsidian';
import type { SettingsTabContext } from '../types';

// Website icons: off by default, every domain shown is sent to Google
export function renderIconsSettings(containerEl: HTMLElement, ctx: SettingsTabContext): void {
	new Setting(containerEl)
		.setName('Website icons')
		.setDesc('Shows the site icon of external links and of notes with a URL property. Each domain is sent to Google\'s favicon service to fetch its icon.')
		.addToggle(toggle => toggle
			.setValue(ctx.settings.googleFavicons)
			.onChange(async value => {
				ctx.settings.googleFavicons = value;
				await ctx.save();
				// Icons are resolved on render: render them all again
				ctx.features.restart('icons');
			}));
}
