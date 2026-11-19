import { paletteState } from './paletteState';

/** True when the node is inside the open color palette. */
export function isInColorPalette(node: Node | null): boolean {
	return !!node && !!paletteState.el?.contains(node);
}
