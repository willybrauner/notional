import { Menu } from 'obsidian';

/** Menu of a hidden column (in the "Hidden columns" area): show it again. */
export function showHiddenColumnMenu(evt: MouseEvent, onShow: () => void): void {
	const menu = new Menu();
	menu.addItem(item => item.setTitle('Show column').setIcon('eye').onClick(onShow));
	menu.showAtMouseEvent(evt);
}
