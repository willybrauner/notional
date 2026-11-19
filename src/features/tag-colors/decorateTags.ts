import { ATTRS } from '../../services/colors/constants';
import { getColor } from '../../services/colors/getColor';
import { DECORATED_SELECTOR } from './constants';
import { readTagName } from './readTagName';

/**
 * Sets data-notion-color on the tag links and tag property pills found in
 * root (root included), from the shared color map. Bases values and property
 * pills don't expose the tag in an attribute, hence the DOM pass.
 */
export function decorateTags(root: Element, colorMap: Record<string, string>): void {
	const els = Array.from(root.querySelectorAll<HTMLElement>(DECORATED_SELECTOR));
	if (root.instanceOf(HTMLElement) && root.matches(DECORATED_SELECTOR)) els.push(root);
	for (const el of els) {
		const name = readTagName(el);
		const color = name ? getColor(colorMap, name) : null;
		if (color) {
			if (el.getAttribute(ATTRS.notionColor) !== color) el.setAttribute(ATTRS.notionColor, color);
		} else if (el.hasAttribute(ATTRS.notionColor)) {
			el.removeAttribute(ATTRS.notionColor);
		}
	}
}
