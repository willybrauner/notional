import { CLASSES } from '../constants';

/** Centered placeholder message (e.g. no start property configured). */
export function renderEmpty(parent: HTMLElement, message: string): HTMLElement {
	return parent.createDiv({ cls: CLASSES.empty, text: message });
}
