// Obsidian closes its new item popover on any click outside of it: simulate one.
export function closeHoverPopover(hoverEl: HTMLElement): void {
	hoverEl.ownerDocument.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
