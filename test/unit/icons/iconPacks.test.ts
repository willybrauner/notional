import { afterEach, describe, expect, it } from 'vitest';
import { FILLED_SVGS } from '../../../src/features/icons/constants';
import { registerIconPack } from '../../../src/features/icons/packs/registerIconPack';
import { getIconSvg } from '../../../src/features/icons/packs/getIconSvg';
import { getIconKeywords } from '../../../src/features/icons/packs/getIconKeywords';
import { getPickerIcons } from '../../../src/features/icons/packs/getPickerIcons';

const removals: (() => void)[] = [];
const register = (...args: Parameters<typeof registerIconPack>) => {
	const remove = registerIconPack(...args);
	removals.push(remove);
	return remove;
};
afterEach(() => removals.splice(0).forEach((remove) => remove()));

describe('icon packs', () => {
	it('replaces a bundled glyph by name, the latest pack wins, removal restores it', () => {
		const bundled = FILLED_SVGS.house;
		register({ svgs: { house: '<svg>a</svg>' } });
		const removeB = register({ svgs: { house: '<svg>b</svg>' } });
		expect(getIconSvg('house')).toBe('<svg>b</svg>');
		removeB();
		expect(getIconSvg('house')).toBe('<svg>a</svg>');
		removals.splice(0).forEach((remove) => remove());
		expect(getIconSvg('house')).toBe(bundled);
	});

	it('lists the names of the packs first, new names included, each glyph once', () => {
		register({ svgs: { 'pack-only': '<svg>p</svg>', 'pack-copy': '<svg>p</svg>', house: '<svg>house</svg>' } });
		const names = getPickerIcons();
		expect(names.slice(0, 2)).toEqual(['pack-only', 'house']);
		expect(names).not.toContain('pack-copy');
		expect(names.filter((name) => name === 'house')).toHaveLength(1);
	});

	it('adds the keywords of the packs to the bundled ones', () => {
		register({ svgs: { 'pack-only': '<svg/>' }, keywords: { 'pack-only': ['zodiac'] } });
		expect(getIconKeywords('pack-only')).toEqual(['zodiac']);
		expect(getIconKeywords('house')).toEqual(expect.arrayContaining(['home']));
	});
});
