import { DECORATED_SELECTOR } from './constants';

/** The tag link or tag property pill under an event target (any window), if any. */
export function findTagElement(target: EventTarget | null): HTMLElement | null {
	const node = target as Node | null;
	return node?.instanceOf?.(HTMLElement) ? node.closest<HTMLElement>(DECORATED_SELECTOR) : null;
}
