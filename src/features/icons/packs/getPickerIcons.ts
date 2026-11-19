import { FILLED_SVGS } from '../constants';
import { getIconSvg } from './getIconSvg';
import { iconPacks } from './iconPacks';

/**
 * Names listed by the picker: those of the packs first, in their order, then the
 * bundled ones. Several names can share one glyph (kept so saved icons still
 * render): it is listed once.
 */
export function getPickerIcons(): string[] {
	const names = new Set([...iconPacks.flatMap((pack) => Object.keys(pack.svgs)), ...Object.keys(FILLED_SVGS)]);
	const listedGlyphs = new Set<string>();
	return [...names].filter((name) => {
		const svg = getIconSvg(name);
		if (!svg || listedGlyphs.has(svg)) return false;
		listedGlyphs.add(svg);
		return true;
	});
}
