import { basesSection } from './sections/basesSection';
import { editorSection } from './sections/editorSection';
import { folderNotesSection } from './sections/folderNotesSection';
import { iconsSection } from './sections/iconsSection';
import { propertiesSection } from './sections/propertiesSection';
import { visualTweaksSection } from './sections/visualTweaksSection';
import type { SettingsSection } from './types';

// Groups of the tab, in display order
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
	basesSection,
	folderNotesSection,
	propertiesSection,
	iconsSection,
	editorSection,
	visualTweaksSection,
];

export const SETTINGS_CLASSES = {
	feature: 'notional-settings-feature',
	badge: 'notional-settings-badge',
	learnMore: 'notional-settings-learn-more',
	warning: 'notional-settings-warning',
	subSettings: 'notional-settings-sub',
} as const;
