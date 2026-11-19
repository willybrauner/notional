import type { App, BasesPropertyId } from 'obsidian';
import type { IconStore } from '../../../services/icons/IconStore';
import { CLASSES } from '../constants';
import { dayDiff } from '../dates/dayDiff';
import { dateToX } from '../layout/dateToX';
import { timedEnd } from '../layout/timedEnd';
import { timeToX } from '../layout/timeToX';
import type { EntryRow, Range } from '../layout/types';
import { renderBarProperties } from '../../../shared/entries/render/renderBarProperties';
import type { EditSelectHandler, PropertyClasses } from '../../../shared/entries/render/renderBarProperties';
import { renderEntryTitle } from '../../../shared/entries/render/renderEntryTitle';

const PROPERTY_CLASSES: PropertyClasses = {
	props: CLASSES.barProps,
	prop: CLASSES.barProp,
	propGroup: CLASSES.barPropGroup,
	editable: CLASSES.editableProp,
};

export interface BarGeometry {
	left: number;
	width: number;
}

/** Left/width (px) of an entry bar in the track: whole days, or exact times when `exact` (hour zoom). */
export function barGeometry(start: Date, end: Date, range: Range, dayWidth: number, exact: boolean): BarGeometry {
	if (exact) {
		const left = timeToX(start, range.start, dayWidth);
		return { left, width: timeToX(timedEnd(start, end), range.start, dayWidth) - left };
	}
	return {
		left: dateToX(start, range.start, dayWidth),
		width: (dayDiff(start, end) + 1) * dayWidth,
	};
}

/** Bar element: card spanning the dates, resize handles, title and properties. */
export function renderBar(
	app: App,
	track: HTMLElement,
	row: EntryRow & { start: Date; end: Date },
	range: Range,
	dayWidth: number,
	exact: boolean,
	properties: BasesPropertyId[],
	colorMap: Record<string, string>,
	iconStore: IconStore,
	onEditSelect: EditSelectHandler,
): HTMLElement {
	const { left, width } = barGeometry(row.start, row.end, range, dayWidth, exact);
	const bar = track.createDiv({ cls: CLASSES.bar });
	bar.dataset.path = row.file.path;
	bar.style.left = `${left}px`;
	bar.style.width = `${width}px`;
	bar.toggleClass(CLASSES.isReadonly, !row.movable);

	if (row.resizable) {
		bar.createDiv({ cls: `${CLASSES.handle} ${CLASSES.handleStart}` });
		bar.createDiv({ cls: `${CLASSES.handle} ${CLASSES.handleEnd}` });
	}

	// The content box extends past the bar end (by the label width, set after layout)
	// so the sticky label can stay readable while the bar is partly off-screen
	const content = bar.createDiv({ cls: CLASSES.barContent });
	const label = content.createDiv({ cls: CLASSES.barLabel });
	renderEntryTitle(app, label, row.file, iconStore, CLASSES.barTitle);
	renderBarProperties(app, label, row.entry, properties, colorMap, onEditSelect, PROPERTY_CLASSES);
	return bar;
}
