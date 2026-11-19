import { ATTRS, chipClass } from '../../../services/colors/constants';
import { CLASSES } from '../constants';

/**
 * Chip of a column value: tag look (rounded pill, text in the color) for tags,
 * Notion select chip otherwise (status values get their pill and dot through
 * data-notional-prop on an ancestor).
 */
export function renderValueChip(parent: HTMLElement, label: string, color: string | null, isTag: boolean): HTMLElement {
	if (!isTag) return parent.createSpan({ cls: `${chipClass(color)} ${CLASSES.columnChip}`, text: label });
	const chip = parent.createSpan({ cls: `${CLASSES.tagChip} ${CLASSES.columnChip}`, text: label });
	if (color) chip.setAttribute(ATTRS.notionColor, color);
	return chip;
}
