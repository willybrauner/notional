import { NOTION_COLORS } from './constants';

/**
 * The value → color map read from data.json: a prototype-free object (a value
 * named `constructor` or `__proto__` is a plain key) holding only the entries
 * whose color is one of Notion's, the colors end up in class names.
 */
export function readColorMap(raw: unknown): Record<string, string> {
	const map = Object.create(null) as Record<string, string>;
	if (!raw || typeof raw !== 'object') return map;
	for (const [key, color] of Object.entries(raw)) {
		if (isNotionColor(color)) map[key] = color;
	}
	return map;
}

export function isNotionColor(color: unknown): color is string {
	return typeof color === 'string' && (NOTION_COLORS as string[]).includes(color);
}
