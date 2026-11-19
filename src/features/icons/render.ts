// =============================================================================
// ICONS FEATURE - Glyph rendering
// =============================================================================

import { setIcon } from 'obsidian';
import { IconConfig } from './types';
import { CLASSES } from './constants';
import { getIconSvg } from './packs/getIconSvg';
/**
 * Renders the glyph `name` in `el`:
 * - a bundled SVG, or the one of an icon pack (`packs/`), inline
 * - else a Lucide id through Obsidian's setIcon()
 */
export function renderGlyph(el: HTMLElement, name: string): void {
	el.empty();
	if (name.startsWith('emoji:')) {
		el.textContent = name.slice(6);
		el.classList.add(CLASSES.iconEmoji);
		return;
	}
	if (name.startsWith('favicon:')) {
		const hostname = name.slice('favicon:'.length);
		const img = createEl('img');
		img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
		img.width = 16;
		img.height = 16;
		img.onerror = () => { el.empty(); setIcon(el, 'file'); };
		el.appendChild(img);
		return;
	}
	const svg = getIconSvg(name);
	if (svg) {
		const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
		el.appendChild(activeDocument.importNode(doc.documentElement, true));
	} else {
		setIcon(el, name);
	}
}

/** Applies the color class (none for 'default': muted monochrome look). */
export function applyColor(el: HTMLElement, color: IconConfig['color']): void {
	el.className = el.className
		.split(' ')
		.filter((c) => !c.startsWith(`${CLASSES.icon}--`) || c === CLASSES.iconEmoji)
		.join(' ');
	if (color !== 'default') el.classList.add(`${CLASSES.icon}--${color}`);
}

/** Creates an icon wrapper `<span class="notional-icon ...">`, ready to insert. */
export function createIconEl(config: IconConfig, variant: string): HTMLElement {
	const el = createSpan();
	el.className = `${CLASSES.icon} ${CLASSES.icon}-${variant}`;
	el.dataset.notionalIcon = config.icon;
	renderGlyph(el, config.icon);
	applyColor(el, config.color);
	return el;
}
