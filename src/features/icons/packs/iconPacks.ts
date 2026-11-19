// Icon packs registered by other plugins, latest last: a name already bundled
// gets the pack's glyph, a new name is added to the picker
export interface IconPack {
	svgs: Record<string, string>;
	keywords?: Record<string, string[]>;
}

export const iconPacks: IconPack[] = [];
