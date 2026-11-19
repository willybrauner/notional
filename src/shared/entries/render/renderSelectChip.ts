import { ATTRS } from '../../../services/select-picker/constants';
import { chipClass } from '../../../services/colors/constants';
import { getColor } from '../../../services/colors/getColor';

/**
 * (Re)renders the single select chip of a property group. The longtext
 * attribute carries the current value for the select picker. An empty value
 * leaves an empty, still clickable group.
 */
export function renderSelectChip(
	group: HTMLElement,
	value: string,
	colorMap: Record<string, string>,
	editableClass: string,
): void {
	group.empty();
	group.addClass(editableClass);
	group.setAttribute('aria-label', 'Edit');
	if (!value) return;
	const chip = group.createSpan({ cls: chipClass(getColor(colorMap, value)), text: value });
	chip.setAttribute(ATTRS.propertyLongtextValue, value);
}
