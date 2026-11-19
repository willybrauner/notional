import { ICON_KEYWORDS } from '../icon-keywords';
import { iconPacks } from './iconPacks';

/** Search keywords of the glyph `name`: the bundled ones and those of every pack. */
export function getIconKeywords(name: string): string[] {
	return [...(ICON_KEYWORDS[name] ?? []), ...iconPacks.flatMap((pack) => pack.keywords?.[name] ?? [])];
}
