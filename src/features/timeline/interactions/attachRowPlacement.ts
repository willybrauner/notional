import { CLASSES } from '../constants';

export interface RowPlacementOptions {
	track: HTMLElement;
	// Snap step (px): a day, or 15 minutes in the hour zoom
	stepWidth: number;
	// Ghost bar width (px): a day, or the default length of a timed item
	ghostWidth: number;
	label: string;
	// Date placed for an X offset (px) of the track
	xToDate: (x: number) => Date;
	onPlace: (date: Date, evt: MouseEvent) => void;
}

/**
 * Empty track (undated note or "new" row): a ghost bar follows the pointer,
 * snapped to steps, and a click places the item at the step under the cursor.
 */
export function attachRowPlacement(o: RowPlacementOptions): void {
	const { track, stepWidth } = o;
	const ghost = track.createDiv({ cls: CLASSES.ghost });
	ghost.style.width = `${o.ghostWidth}px`;
	ghost.createSpan({ text: o.label });

	const xAt = (evt: MouseEvent) => evt.clientX - track.getBoundingClientRect().left;

	track.addEventListener('pointermove', (evt: PointerEvent) => {
		if (evt.pointerType === 'touch') return;
		ghost.style.left = `${Math.floor(xAt(evt) / stepWidth) * stepWidth}px`;
	});
	track.addEventListener('click', (evt: MouseEvent) => {
		o.onPlace(o.xToDate(xAt(evt)), evt);
	});
}
