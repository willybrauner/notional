import { renderMediaDropSettings } from '../sub-settings/renderMediaDropSettings';
import type { SettingsSection } from '../types';

export const editorSection: SettingsSection = {
	name: 'Editor',
	subSettings: {
		'media-drop': renderMediaDropSettings,
	},
};
