/** Paths (data-path) of the elements matching the selector that intersect a client-space rectangle. */
export function hitTestPaths(root: HTMLElement, selector: string, rect: DOMRect): string[] {
	const hits: string[] = [];
	root.querySelectorAll<HTMLElement>(selector).forEach(el => {
		const r = el.getBoundingClientRect();
		const overlaps = r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top;
		if (overlaps && el.dataset.path) hits.push(el.dataset.path);
	});
	return hits;
}
