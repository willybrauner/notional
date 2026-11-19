import { ATTRS } from '../../../services/colors/constants';
import { CLASSES } from '../constants';

export interface Ghost {
	moveTo: (x: number, y: number) => void;
	remove: () => void;
}

/** Floating copy of the dragged element that follows the pointer at the grab offset. */
export function createGhost(source: HTMLElement, grabX: number, grabY: number): Ghost {
	const rect = source.getBoundingClientRect();
	const ghost = source.cloneNode(true) as HTMLElement;
	ghost.addClass(CLASSES.ghost);
	ghost.style.width = `${rect.width}px`;
	// Keeps the column tint of the source (data-notion-color lives on the column)
	const tinted = source.closest<HTMLElement>(`.${CLASSES.column}`);
	const host = activeDocument.body.createDiv({ cls: `${CLASSES.root} ${CLASSES.ghost}-host` });
	const color = tinted?.getAttribute(ATTRS.notionColor);
	if (color) host.setAttribute(ATTRS.notionColor, color);
	host.appendChild(ghost);
	const offsetX = grabX - rect.left;
	const offsetY = grabY - rect.top;
	const moveTo = (x: number, y: number) => {
		ghost.style.transform = `translate(${x - offsetX}px, ${y - offsetY}px)`;
	};
	moveTo(grabX, grabY);
	return { moveTo, remove: () => host.remove() };
}
