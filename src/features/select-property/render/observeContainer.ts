import { ATTRS } from '../constants';

/**
 * Re-runs `scan` after the DOM of `container` changed, on the next tick so
 * Obsidian finishes its own updates first. Returns the stop function: a scan
 * pending when stopped is dropped, it would put the chips back after the cleanup.
 */
export function observeContainer(container: HTMLElement, scan: () => void): () => void {
	let pending = false;
	let stopped = false;
	const observer = new MutationObserver(() => {
		if (pending) return;
		pending = true;
		window.setTimeout(() => {
			pending = false;
			if (!stopped) scan();
		}, 0);
	});
	// Bases updates values in place (text node / longtext attribute) when a note changes:
	// without characterData + attributes the chips would stay stale until a reload
	observer.observe(container, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: [ATTRS.propertyLongtextValue],
	});
	return () => {
		stopped = true;
		observer.disconnect();
	};
}
