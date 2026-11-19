/**
 * Forgets what every rendered icon shows (`data-notional-config-key`): the next
 * render pass draws them again, with the glyphs of the packs now registered.
 */
export function invalidateRenderedIcons(doc: Document): void {
	doc.querySelectorAll<HTMLElement>('[data-notional-config-key]').forEach((el) => {
		delete el.dataset.notionalConfigKey;
	});
}
