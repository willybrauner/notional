import { Menu } from 'obsidian';

export interface ColumnMenuOptions {
	// null: no color for this column ("no value")
	onChangeColor: (() => void) | null;
	onHide: () => void;
}

/** "⋯" menu of a column header: change its color, hide it. */
export function showColumnMenu(anchor: HTMLElement, o: ColumnMenuOptions): void {
	const menu = new Menu();
	const onChangeColor = o.onChangeColor;
	if (onChangeColor) {
		menu.addItem(item => item.setTitle('Change color').setIcon('palette').onClick(onChangeColor));
	}
	menu.addItem(item => item.setTitle('Hide column').setIcon('eye-off').onClick(o.onHide));
	const rect = anchor.getBoundingClientRect();
	menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
}
