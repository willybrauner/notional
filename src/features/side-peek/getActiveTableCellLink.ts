import { CLASSES } from './constants';

// Table views draw the keyboard-selected cell as a box over the table, unrelated
// to the cell in the DOM: find the cell under it. Only a file cell (`file.name`…)
// links to the row's note; returns that link, null for any other cell.
export function getActiveTableCellLink(tableEl: HTMLElement): HTMLElement | null {
	const box = tableEl.querySelector(`.${CLASSES.tableActiveCell}`);
	if (!box) return null;
	const rect = box.getBoundingClientRect();
	if (!rect.width || !rect.height) return null;
	const cell = tableEl.ownerDocument
		.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
		.map((el) => el.closest<HTMLElement>(`.${CLASSES.tableCell}`))
		.find((el) => el && tableEl.contains(el));
	if (!cell?.dataset.property?.startsWith('file.')) return null;
	return cell.querySelector<HTMLElement>(`.${CLASSES.internalLink}`);
}
