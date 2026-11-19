/** Strips the 'note.' prefix and lowercases — used for seed map lookups. */
export function normalizeKey(raw: string): string {
	return raw.replace(/^note\./i, '').toLowerCase();
}
