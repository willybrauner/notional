import { Platform, Setting } from 'obsidian';
import { DEFAULT_WEBP_QUALITY } from '../../features/media-drop/constants';
import type { SettingsTabContext } from '../types';

// WebP conversion, its quality and HEIC decoding (shown while the conversion is on)
export function renderMediaDropSettings(containerEl: HTMLElement, ctx: SettingsTabContext): void {
	const { settings } = ctx;

	new Setting(containerEl)
		.setName('Convert images to WebP')
		.setDesc('Converts PNG and JPG images dropped or pasted into notes to WebP.')
		.addToggle(toggle => toggle
			.setValue(settings.convertImagesToWebp)
			.onChange(async value => {
				settings.convertImagesToWebp = value;
				await ctx.save();
				ctx.refresh();
			}));

	if (!settings.convertImagesToWebp) return;

	new Setting(containerEl)
		.setName('WebP quality')
		.setDesc('Quality of the converted images, from 1 to 100.')
		.addText(text => text
			.setPlaceholder(String(DEFAULT_WEBP_QUALITY))
			.setValue(String(settings.webpQuality))
			.onChange(async value => {
				const parsed = Number(value);
				settings.webpQuality = Number.isFinite(parsed) && parsed >= 1 && parsed <= 100
					? Math.round(parsed)
					: DEFAULT_WEBP_QUALITY;
				await ctx.save();
			}));

	// Decoded by the system's sips command, only there
	if (!Platform.isMacOS) return;
	new Setting(containerEl)
		.setName('Convert HEIC images')
		.setDesc('Converts HEIC and HEIF photos to WebP too, decoded by macOS.')
		.addToggle(toggle => toggle
			.setValue(settings.convertHeic)
			.onChange(async value => {
				settings.convertHeic = value;
				await ctx.save();
			}));
}
