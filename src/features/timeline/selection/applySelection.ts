import { CLASSES } from '../constants';

/** Reflects the selected note paths on bars, rows and the toolbar hint. */
export function applySelection(root: HTMLElement, selection: Set<string>): void {
	root.querySelectorAll<HTMLElement>(`.${CLASSES.bar}[data-path], .${CLASSES.row}[data-path]`).forEach(el => {
		el.toggleClass(CLASSES.isSelected, selection.has(el.dataset.path ?? ''));
	});
	const hint = root.querySelector<HTMLElement>(`.${CLASSES.selectionHint}`);
	if (hint) {
		hint.setText(selection.size ? `${selection.size} selected · ⌫ to delete` : '');
		hint.toggleClass(CLASSES.isVisible, selection.size > 0);
	}
}
