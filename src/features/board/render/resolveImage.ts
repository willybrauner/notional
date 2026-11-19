import { ListValue } from 'obsidian';
import type { App, BasesEntry, Value } from 'obsidian';

export type CoverImage = { src: string } | { color: string };

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(.+\)|hsla?\(.+\))$/i;
const URL = /^(https?:|data:|app:)/i;

/**
 * Cover of a card from the image property: a vault image (wikilink or path),
 * an external URL, or a CSS color. Lists use their first item.
 */
export function resolveImage(app: App, entry: BasesEntry, value: Value | null): CoverImage | null {
	if (!value) return null;
	const item = value instanceof ListValue ? value.get(0) : value;
	if (!item.isTruthy()) return null;
	const raw = item.toString().trim();
	if (COLOR.test(raw)) return { color: raw };

	// ![alt](url) or plain url
	const markdown = /^!?\[[^\]]*\]\(([^)]+)\)$/.exec(raw)?.[1];
	const target = (markdown ?? raw).replace(/^!?\[\[/, '').replace(/\]\]$/, '').split('|')[0]?.trim() ?? '';
	if (!target) return null;
	if (URL.test(target)) return { src: target };

	const file = app.metadataCache.getFirstLinkpathDest(target, entry.file.path);
	return file ? { src: app.vault.getResourcePath(file) } : null;
}
