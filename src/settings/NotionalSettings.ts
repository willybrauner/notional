import { DEFAULT_WEBP_QUALITY } from '../features/media-drop/constants';

export interface NotionalSettings {
	convertImagesToWebp: boolean;
	webpQuality: number;
	// HEIC/HEIF images converted too (macOS sips), else written as they are
	convertHeic: boolean;
	// Website icons fetched from Google's favicon service (a network call per domain)
	googleFavicons: boolean;
	// On/off per feature id; a missing id uses the feature's default
	features: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: NotionalSettings = {
	convertImagesToWebp: true,
	webpQuality: DEFAULT_WEBP_QUALITY,
	convertHeic: true,
	googleFavicons: false,
	features: {},
};
