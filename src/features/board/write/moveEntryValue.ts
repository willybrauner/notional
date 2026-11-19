import type { App, TFile } from 'obsidian';

export interface ValueMove {
	// Labels of the source and target columns ('' for "no value")
	from: string;
	to: string;
	// Lists only: keep the source value (card copied to the target column)
	copy: boolean;
	isList: boolean;
}

const normalize = (value: unknown) => String(value).replace(/^#/, '').trim().toLowerCase();

// Keeps numbers and booleans typed when the column label comes from one
function coerce(label: string, previous: unknown): unknown {
	if (typeof previous === 'number' && label !== '' && !Number.isNaN(Number(label))) return Number(label);
	if (typeof previous === 'boolean' && (label === 'true' || label === 'false')) return label === 'true';
	return label;
}

/**
 * Writes a card move between columns in the note frontmatter. Lists: the
 * source value is replaced by the target one (or the target is added when
 * copying), without duplicates. Scalars: the value becomes the target one.
 */
export async function moveEntryValue(app: App, file: TFile, propName: string, move: ValueMove): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		const key = Object.keys(fm).find(k => k.toLowerCase() === propName.toLowerCase()) ?? propName;
		const previous = fm[key];
		if (!move.isList) {
			fm[key] = coerce(move.to, previous);
			return;
		}
		let list: unknown[] = Array.isArray(previous) ? (previous as unknown[]).slice() : previous == null || previous === '' ? [] : [previous];
		if (!move.copy && move.from) list = list.filter(item => normalize(item) !== normalize(move.from));
		if (move.to && !list.some(item => normalize(item) === normalize(move.to))) list.push(move.to);
		fm[key] = list;
	});
}
