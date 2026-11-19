import type { App, BasesEntry, BasesPropertyId } from 'obsidian';
import type { IconStore } from '../../../services/icons/IconStore';
import { renderEntryTitle } from '../../../shared/entries/render/renderEntryTitle';
import { renderBarProperties } from '../../../shared/entries/render/renderBarProperties';
import type { EditSelectHandler, PropertyClasses } from '../../../shared/entries/render/renderBarProperties';
import { CLASSES } from '../constants';
import { resolveImage } from './resolveImage';

const PROPERTY_CLASSES: PropertyClasses = {
	props: CLASSES.cardProps,
	prop: CLASSES.cardProp,
	propGroup: CLASSES.cardPropGroup,
	editable: CLASSES.editableProp,
};

export interface CardOptions {
	app: App;
	iconStore: IconStore;
	colorMap: Record<string, string>;
	// Visible properties shown under the title
	properties: BasesPropertyId[];
	imageProperty: BasesPropertyId | null;
	onEditSelect: EditSelectHandler;
}

/** Card of a note: optional cover, title with its icon, then the visible properties as chips. */
export function renderCard(parent: HTMLElement, entry: BasesEntry, options: CardOptions): HTMLElement {
	const card = parent.createDiv({ cls: CLASSES.card });
	card.dataset.path = entry.file.path;

	const image = options.imageProperty ? resolveImage(options.app, entry, entry.getValue(options.imageProperty)) : null;
	if (image) {
		const cover = card.createDiv({ cls: CLASSES.cardCover });
		if ('src' in image) cover.createEl('img', { attr: { src: image.src, loading: 'lazy', draggable: 'false', alt: '' } });
		else cover.style.backgroundColor = image.color;
	}

	const body = card.createDiv({ cls: CLASSES.cardBody });
	renderEntryTitle(options.app, body, entry.file, options.iconStore, CLASSES.cardTitle);
	renderBarProperties(options.app, body, entry, options.properties, options.colorMap, options.onEditSelect, PROPERTY_CLASSES);
	return card;
}
