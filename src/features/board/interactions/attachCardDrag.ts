import { CLASSES } from '../constants';
import { autoScroll } from '../../../shared/entries/autoScroll';
import { columnAtX } from './columnAtX';
import { createGhost } from './createGhost';
import type { Ghost } from './createGhost';
import { trackPointerDrag } from './trackPointerDrag';

export interface CardDragOptions {
	card: HTMLElement;
	// Board root: horizontal scroller holding the columns
	root: HTMLElement;
	fromKey: string;
	// Manual order allowed (no Bases sort): drops land between cards
	canOrder: boolean;
	onDragState: (dragging: boolean) => void;
	// index: position among the other cards of the target column
	// copy: Alt/Option held on drop (keep the card in its column too)
	onDrop: (toKey: string, index: number, copy: boolean) => void;
}

// Cards of a column the dragged one can be placed between (the dragged note excluded)
function otherCards(column: HTMLElement, card: HTMLElement): HTMLElement[] {
	return Array.from(column.querySelectorAll<HTMLElement>(`.${CLASSES.card}`))
		.filter(other => other !== card && other.dataset.path !== card.dataset.path);
}

/**
 * Drags a card to a place in a column (another one, or its own to reorder).
 * The target column is highlighted and a line shows where the card lands;
 * holding Alt/Option copies instead of moving (multi-value properties).
 */
export function attachCardDrag(options: CardDragOptions): void {
	const { card, root } = options;
	let ghost: Ghost | null = null;
	let target: HTMLElement | null = null;
	let line: HTMLElement | null = null;
	let index = 0;
	let pointer = { x: 0, y: 0, alt: false };
	let stopScroll: (() => void) | null = null;

	const setTarget = (column: HTMLElement | null) => {
		if (column === target) return;
		target?.removeClass(CLASSES.isDropTarget);
		column?.addClass(CLASSES.isDropTarget);
		target = column;
	};

	// Insertion index from the pointer height, and the line drawn between the cards
	const placeLine = () => {
		line?.remove();
		line = null;
		if (!target || !options.canOrder) return;
		const cards = otherCards(target, card);
		index = cards.filter(other => {
			const rect = other.getBoundingClientRect();
			return rect.top + rect.height / 2 < pointer.y;
		}).length;
		const list = target.querySelector<HTMLElement>(`.${CLASSES.columnCards}`);
		if (!list) return;
		const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
		const columnTop = target.getBoundingClientRect().top;
		const before = cards[index];
		const after = cards[index - 1];
		const y = before
			? before.getBoundingClientRect().top - gap / 2
			: after
				? after.getBoundingClientRect().bottom + gap / 2
				: list.getBoundingClientRect().top;
		line = target.createDiv({ cls: CLASSES.dropLine });
		line.style.top = `${y - columnTop}px`;
	};

	const update = () => {
		ghost?.moveTo(pointer.x, pointer.y);
		card.toggleClass(CLASSES.isCopy, pointer.alt);
		// Without manual order, a drop in the own column only tells why nothing moves
		setTarget(columnAtX(root, pointer.x));
		placeLine();
	};

	trackPointerDrag(card, {
		canStart: evt => !(evt.target as HTMLElement).closest('.clickable-icon, .notional-icon'),
		onStart: evt => {
			pointer = { x: evt.clientX, y: evt.clientY, alt: evt.altKey };
			ghost = createGhost(card, evt.clientX, evt.clientY);
			card.addClass(CLASSES.isDragging);
			activeDocument.body.addClass(CLASSES.bodyDragging);
			stopScroll = autoScroll(root, 0, () => pointer.x, update);
			options.onDragState(true);
			update();
		},
		onMove: evt => {
			pointer = { x: evt.clientX, y: evt.clientY, alt: evt.altKey };
			update();
		},
		onEnd: evt => {
			const dropKey = evt ? target?.dataset.key : undefined;
			stopScroll?.();
			ghost?.remove();
			ghost = null;
			line?.remove();
			line = null;
			setTarget(null);
			card.removeClass(CLASSES.isDragging, CLASSES.isCopy);
			activeDocument.body.removeClass(CLASSES.bodyDragging);
			options.onDragState(false);
			if (evt && dropKey !== undefined) options.onDrop(dropKey, index, evt.altKey);
		},
	});
}
