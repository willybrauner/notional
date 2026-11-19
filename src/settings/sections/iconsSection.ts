import { renderIconsSettings } from '../sub-settings/renderIconsSettings';
import type { SettingsSection } from '../types';

export const iconsSection: SettingsSection = {
	name: 'Icons',
	subSettings: { icons: renderIconsSettings },
};
