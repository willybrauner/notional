// Resolves once the element's running CSS animations end (immediately if none).
export async function afterAnimations(el: HTMLElement): Promise<void> {
	await Promise.allSettled(el.getAnimations().map((a) => a.finished));
}
