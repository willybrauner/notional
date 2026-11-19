import { setIcon } from 'obsidian';
import type { TFile } from 'obsidian';
import type { IconStore } from '../../services/icons/IconStore';
import { createIconEl } from '../icons/render';
import { ATTRS, CLASSES } from './constants';

/**
 * Mention chip: target icon with an arrow over it, then the target name.
 * The icon uses its own variant (not `inline`) so a click opens the target, not the icon picker.
 */
export function createMentionChip(target: TFile, iconStore: IconStore): HTMLElement {
	const chip = createSpan();
	chip.addClass(CLASSES.mention);
	chip.setAttribute(ATTRS.mentionPath, target.path);
	const icon = chip.createSpan({ cls: CLASSES.mentionIcon });
	if (iconStore.shown) icon.appendChild(createIconEl(iconStore.resolve(target.path), 'mention'));
	setIcon(icon.createSpan({ cls: CLASSES.mentionArrow }), 'arrow-up-right');
	chip.createSpan({ cls: CLASSES.mentionText, text: target.basename });
	return chip;
}
