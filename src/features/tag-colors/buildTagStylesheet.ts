// Editor hashtags carry "cm-tag-<tag>" with only ASCII letters, digits and '-' kept
function editorClass(tag: string): string {
	return `cm-tag-${tag.replace(/[^A-Za-z0-9-]/g, '')}`;
}

/**
 * Rules coloring the editor (live preview / source) hashtags, which are
 * re-rendered too often to decorate: one rule per colored value, matched
 * case-insensitively on the CodeMirror tag class. Same look as the other tags:
 * text in the color, background the same color made transparent.
 */
export function buildTagStylesheet(colorMap: Record<string, string>): string {
	return Object.entries(colorMap)
		.filter(([tag]) => editorClass(tag) !== 'cm-tag-')
		.map(([tag, color]) => `.cm-hashtag[class~="${CSS.escape(editorClass(tag))}" i] {`
			+ ` background-color: rgba(var(--notional-${color}-rgb), 0.15); color: rgb(var(--notional-${color}-rgb)); }`)
		.join('\n');
}
