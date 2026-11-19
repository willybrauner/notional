import { CLASSES } from '../constants';

/**
 * Removes the global drag cursor. Also called on re-render/unload so a drag
 * interrupted by a DOM rebuild never leaves the cursor stuck.
 */
export function clearBodyDragState(): void {
	activeDocument.body.removeClass(CLASSES.bodyDragging);
	delete activeDocument.body.dataset.notionalTimelineCursor;
}
