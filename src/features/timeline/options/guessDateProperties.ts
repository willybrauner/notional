import { parsePropertyId } from 'obsidian';
import type { BasesPropertyId } from 'obsidian';

const START_PATTERN = /^(start|date|begin|from|when)/i;
const END_PATTERN = /^(end|due|deadline|until|fin)/i;

export interface DatePropertyGuess {
	start: BasesPropertyId | null;
	end: BasesPropertyId | null;
}

/**
 * Start and end properties of a view without its own: the first note property
 * of the base that looks like a start (Date, Start…) and like an end (Due date,
 * End…), else a "Date" or "Date & time" property of the vault. A base with only
 * an end-like property uses it as the start (single-day items).
 */
export function guessDateProperties(baseProperties: BasesPropertyId[], vaultDateNames: string[]): DatePropertyGuess {
	const notes = baseProperties.filter(p => parsePropertyId(p).type === 'note');
	const vault = vaultDateNames.map(name => `note.${name}` as BasesPropertyId)
		.filter(id => !notes.some(p => p.toLowerCase() === id.toLowerCase()));
	const find = (pattern: RegExp, except: BasesPropertyId | null) => [...notes, ...vault]
		.find(p => p !== except && pattern.test(parsePropertyId(p).name)) ?? null;

	const start = find(START_PATTERN, null);
	const end = find(END_PATTERN, start);
	return start ? { start, end } : { start: end, end: null };
}
