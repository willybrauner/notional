import { CLASSES } from './constants';

// Obsidian flags the base "New" button as active right before appending the
// new item popover to the body, so a hover popover showing up at that moment is it.
export function isNewItemPopover(node: Node): node is HTMLElement {
	if (!node.instanceOf(HTMLElement) || !node.classList.contains(CLASSES.hoverPopover)) return false;
	return !!node.ownerDocument.querySelector(`.${CLASSES.newItemMenu} .${CLASSES.hasActiveMenu}`);
}
