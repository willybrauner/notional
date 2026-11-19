import { describe, expect, it } from 'vitest';
import type { TFile } from 'obsidian';
import { slugifyFilename } from '../../../src/features/media-drop/slugifyFilename';
import { safeFilename } from '../../../src/features/media-drop/safeFilename';
import { resolveTokens } from '../../../src/features/note-template/resolveTokens';
import { splitTitle } from '../../../src/features/title-mention/splitTitle';

describe('slugifyFilename', () => {
	it('lowercases, strips accents and punctuation, joins words with dashes', () => {
		expect(slugifyFilename('Déjà vu, naïve café!')).toBe('deja-vu-naive-cafe');
		expect(slugifyFilename('  Multiple   spaces -- dash ')).toBe('multiple-spaces-dash');
		expect(slugifyFilename('IMG_2041')).toBe('img2041');
	});
});

describe('resolveTokens (note template)', () => {
	const now = new Date(2026, 0, 5);

	it('replaces date and filename', () => {
		expect(resolveTokens('# {{filename}}\ncreated: {{date}}', 'Meeting', now)).toBe('# Meeting\ncreated: 2026-01-05');
		expect(resolveTokens('{{ date }}', '', now)).toBe('2026-01-05');
	});

	it('replaces YYYY / MM / DD inside any token', () => {
		expect(resolveTokens('{{DD/MM/YYYY}}', '', now)).toBe('05/01/2026');
		expect(resolveTokens('{{YYYY-MM-DD}}', '', now)).toBe('2026-01-05');
	});

	it('keeps unknown tokens', () => {
		expect(resolveTokens('{{title}}', 'x', now)).toBe('{{title}}');
	});
});

describe('splitTitle (title mention)', () => {
	const target = (basename: string) => ({ basename, path: `${basename}.md` }) as TFile;

	it('splits plain text and mentions, in order', () => {
		const page = target('Super page');
		const other = target('Other');
		expect(splitTitle('Notes on @Super page and @Other', [page, other])).toEqual([
			{ text: 'Notes on ' },
			{ text: 'Super page', target: page },
			{ text: ' and ' },
			{ text: 'Other', target: other },
		]);
	});

	it('skips targets not found in the title', () => {
		expect(splitTitle('Plain title', [target('Missing')])).toEqual([{ text: 'Plain title' }]);
	});

	it('returns a single mention for a title made of the mention only', () => {
		const page = target('Super page');
		expect(splitTitle('@Super page', [page])).toEqual([{ text: 'Super page', target: page }]);
	});
});

describe('safeFilename', () => {
	it('keeps a plain name as it is', () => {
		expect(safeFilename('Screen Shot 2026.png')).toBe('Screen Shot 2026.png');
	});

	it('replaces path separators and characters refused in a name or a link', () => {
		expect(safeFilename('../a/b\\c:d#e^f[g]h|i.pdf')).toBe('-a-b-c-d-e-f-g-h-i.pdf');
	});

	it('never gives a hidden or empty name', () => {
		expect(safeFilename('.hidden')).toBe('hidden');
		expect(safeFilename('...')).toBe('file');
		expect(safeFilename('#.pdf')).toBe('-.pdf');
		expect(safeFilename('  .pdf')).toBe('file.pdf');
	});
});
