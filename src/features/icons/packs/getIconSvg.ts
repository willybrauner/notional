import { FILLED_SVGS } from '../constants';
import { iconPacks } from './iconPacks';

/** SVG of the glyph `name`: the latest pack defining it, else the bundled one. */
export function getIconSvg(name: string): string | undefined {
	for (let i = iconPacks.length - 1; i >= 0; i--) {
		const svg = iconPacks[i]?.svgs[name];
		if (svg) return svg;
	}
	return FILLED_SVGS[name];
}
