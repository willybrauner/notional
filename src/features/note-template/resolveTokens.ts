/**
 * Replaces the `{{…}}` tokens of a template: `{{date}}` (YYYY-MM-DD),
 * `{{filename}}`, and any token made of YYYY / MM / DD (e.g. `{{DD/MM/YYYY}}`).
 * Unknown tokens are kept as written.
 */
export function resolveTokens(text: string, filename: string, now: Date = new Date()): string {
	const year = String(now.getFullYear());
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return text.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => {
		const trimmedToken = token.trim();
		if (trimmedToken === 'date') return `${year}-${month}-${day}`;
		if (trimmedToken === 'filename') return filename;
		const resolved = token
			.replace(/YYYY/g, year)
			.replace(/MM/g, month)
			.replace(/DD/g, day);
		return resolved !== token ? resolved : `{{${token}}}`;
	});
}
