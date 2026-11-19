// =============================================================================
// ICONS FEATURE - Types
// =============================================================================

/**
 * Colors of the icon palette (Notion's palette, extended; see $icon-colors in styles/icons.scss).
 */
export type IconColor =
	| 'gray'
	| 'slate'
	| 'brown'
	| 'orange'
	| 'amber'
	| 'yellow'
	| 'olive'
	| 'lime'
	| 'green'
	| 'mint'
	| 'teal'
	| 'cyan'
	| 'sky'
	| 'blue'
	| 'navy'
	| 'indigo'
	| 'violet'
	| 'purple'
	| 'fuchsia'
	| 'pink'
	| 'rose'
	| 'red'
	| 'coral';


/**
 * Icon name: one of our custom SVGs ('file' | 'base'),
 * or a Lucide id rendered through Obsidian's setIcon().
 */
export type IconName = string;

/** Icon of a path. */
export interface IconConfig {
	icon: IconName;
	// `default` = no custom color → monochrome look (var(--text-muted))
	color: IconColor | 'default';
}

/** Saved filePath -> IconConfig map (`icons` key of data.json). */
export type IconSettings = Record<string, IconConfig>;

/** Resolved config, with where it comes from. */
export interface ResolvedIconConfig extends IconConfig {
	source: 'direct' | 'favicon' | 'default';
}
