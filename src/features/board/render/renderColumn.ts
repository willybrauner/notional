import { setIcon } from 'obsidian';
import { ATTRS } from '../../../services/colors/constants';
import { CLASSES, NONE_KEY } from '../constants';
import type { Column } from '../layout/types';
import { renderValueChip } from './renderValueChip';

export interface ColumnEls {
	el: HTMLElement;
	header: HTMLElement;
	chip: HTMLElement;
	menuBtn: HTMLElement;
	addBtn: HTMLElement | null;
	cards: HTMLElement;
	newBtn: HTMLElement | null;
}

export interface ColumnRenderOptions {
	color: string | null;
	// normalized property key, for per-property chip styles (status)
	propertyKey: string;
	label: string;
	editable: boolean;
	isTag: boolean;
}

/**
 * Column shell: header (value chip, count, "⋯" menu and add buttons), card
 * list and the "New" button. The color tints the column, its cards and texts
 * through data-notion-color.
 */
export function renderColumn(parent: HTMLElement, column: Column, o: ColumnRenderOptions): ColumnEls {
	const el = parent.createDiv({ cls: CLASSES.column });
	el.dataset.key = column.key;
	if (o.color) el.setAttribute(ATTRS.notionColor, o.color);
	if (column.key === NONE_KEY) el.addClass(CLASSES.isNone);

	const header = el.createDiv({ cls: CLASSES.columnHeader });
	header.dataset.notionalProp = o.propertyKey;
	const chip = renderValueChip(header, o.label, o.color, o.isTag && column.key !== NONE_KEY);
	header.createSpan({ cls: CLASSES.columnCount, text: String(column.entries.length) });

	const actions = header.createDiv({ cls: CLASSES.columnActions });
	const menuBtn = actions.createDiv({ cls: `clickable-icon ${CLASSES.columnAction}`, attr: { 'aria-label': 'Column options' } });
	setIcon(menuBtn, 'more-horizontal');
	let addBtn: HTMLElement | null = null;
	if (o.editable) {
		addBtn = actions.createDiv({ cls: `clickable-icon ${CLASSES.columnAction}`, attr: { 'aria-label': 'New note' } });
		setIcon(addBtn, 'plus');
	}

	const cards = el.createDiv({ cls: CLASSES.columnCards });

	let newBtn: HTMLElement | null = null;
	if (o.editable) {
		newBtn = el.createDiv({ cls: CLASSES.newCard });
		setIcon(newBtn.createSpan(), 'plus');
		newBtn.createSpan({ text: 'New' });
	}
	return { el, header, chip, menuBtn, addBtn, cards, newBtn };
}
