import { HTMLValue, ImageValue, LinkValue, ListValue, StringValue, UrlValue, parsePropertyId } from 'obsidian';
import type { App, BasesEntry, BasesPropertyId, Value } from 'obsidian';
import { ATTRS, chipClass } from '../../../services/colors/constants';
import { getColor } from '../../../services/colors/getColor';
import { normalizeKey } from '../../../services/select-picker/seeds/normalizeKey';
import { renderSelectChip } from './renderSelectChip';

// Tag look, owned by styles/tag-colors.scss
const TAG_CHIP_CLASS = 'notional-tag-chip';

/** Plain strings (select-like values) are shown as Notion colored chips. */
function isChipValue(value: Value): boolean {
	return value instanceof StringValue
		&& !(value instanceof LinkValue)
		&& !(value instanceof UrlValue)
		&& !(value instanceof HTMLValue)
		&& !(value instanceof ImageValue);
}

// Class names of the rendered groups (timeline bars, board cards)
export interface PropertyClasses {
	props: string;
	prop: string;
	propGroup: string;
	editable: string;
}

function renderValue(app: App, parent: HTMLElement, value: Value, colorMap: Record<string, string>, classes: PropertyClasses): void {
	if (value instanceof ListValue) {
		for (let i = 0; i < value.length(); i++) renderValue(app, parent, value.get(i), colorMap, classes);
		return;
	}
	if (!value.isTruthy()) return;
	if (isChipValue(value)) {
		const raw = value.toString();
		// Tags come as "#name": tag pill in the tag's color
		if (raw.startsWith('#')) {
			const text = raw.slice(1);
			const color = getColor(colorMap, text);
			const chip = parent.createSpan({ cls: TAG_CHIP_CLASS, text });
			if (color) chip.setAttribute(ATTRS.notionColor, color);
			return;
		}
		parent.createSpan({ cls: chipClass(getColor(colorMap, raw)), text: raw });
		return;
	}
	const el = parent.createSpan({ cls: classes.prop });
	value.renderTo(el, app.renderContext);
}

export type EditSelectHandler = (group: HTMLElement, fmKey: string) => void;

/**
 * Renders the view's visible properties (Bases "Properties" menu order) next
 * to the entry title, skipping the title and the date properties themselves.
 * Single-value note properties shown as chips (select, status) are editable:
 * clicking them calls onEditSelect with the chip group as anchor.
 */
export function renderBarProperties(
	app: App,
	parent: HTMLElement,
	entry: BasesEntry,
	properties: BasesPropertyId[],
	colorMap: Record<string, string>,
	onEditSelect: EditSelectHandler,
	classes: PropertyClasses,
): void {
	const wrap = parent.createSpan({ cls: classes.props });
	for (const prop of properties) {
		const value = entry.getValue(prop);
		if (!value) continue;
		// data-notional-prop lets per-property chip styles apply (e.g. status pill with dot)
		const group = wrap.createSpan({ cls: classes.propGroup });
		group.dataset.notionalProp = normalizeKey(prop);

		const { type, name } = parsePropertyId(prop);
		if (type === 'note' && value.isTruthy() && isChipValue(value)) {
			renderSelectChip(group, value.toString(), colorMap, classes.editable);
			group.addEventListener('click', evt => {
				evt.stopPropagation();
				onEditSelect(group, name);
			});
			continue;
		}
		renderValue(app, group, value, colorMap, classes);
		if (!group.hasChildNodes()) group.remove();
	}
	if (!wrap.hasChildNodes()) wrap.remove();
}
