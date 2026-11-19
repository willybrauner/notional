import { ATTRS } from '../../../services/colors/constants';
import { CLASSES } from '../constants';
import type { Column } from '../layout/types';
import { renderValueChip } from './renderValueChip';

export interface HiddenColumn {
	column: Column;
	label: string;
	color: string | null;
}

/**
 * "Hidden columns" area after the last column (like Notion's hidden groups):
 * one row per hidden column with its chip and card count. onClick receives
 * the row to anchor a menu.
 */
export function renderHiddenColumns(
	parent: HTMLElement,
	hidden: HiddenColumn[],
	propertyKey: string,
	isTag: boolean,
	onClick: (item: HiddenColumn, evt: MouseEvent) => void,
): void {
	if (!hidden.length) return;
	const area = parent.createDiv({ cls: CLASSES.hidden });
	area.dataset.notionalProp = propertyKey;
	area.createDiv({ cls: CLASSES.hiddenTitle, text: 'Hidden columns' });
	for (const item of hidden) {
		const row = area.createDiv({ cls: CLASSES.hiddenItem });
		if (item.color) row.setAttribute(ATTRS.notionColor, item.color);
		renderValueChip(row, item.label, item.color, isTag && item.column.key !== '');
		row.createSpan({ cls: CLASSES.columnCount, text: String(item.column.entries.length) });
		row.addEventListener('click', evt => onClick(item, evt));
	}
}
