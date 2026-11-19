import { CLASSES, TAG_PILL_SELECTOR } from './constants';

/** Tag shown by a tag element (link, property pill), without '#', or null. */
export function readTagName(el: HTMLElement): string | null {
	if (el.matches(TAG_PILL_SELECTOR)) {
		return el.querySelector(`.${CLASSES.pillContent}`)?.textContent?.trim() || null;
	}
	if (el.matches(`a.${CLASSES.tag}`)) {
		const href = el.getAttribute('href');
		const text = href?.startsWith('#') ? href : el.textContent;
		return text?.replace(/^#/, '').trim() || null;
	}
	return null;
}
