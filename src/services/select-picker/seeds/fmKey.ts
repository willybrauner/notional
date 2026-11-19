/** Strips the 'note.' prefix but preserves original casing — used for frontmatter reads/writes. */
export function fmKey(raw: string): string {
	return raw.replace(/^note\./i, '');
}
