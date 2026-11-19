import { moment, parsePropertyId } from 'obsidian';
import { toMoment } from './toMoment';
import { hasTime } from './hasTime';
import type { App, BasesEntry, BasesPropertyId } from 'obsidian';

export interface EntryDate {
	date: Date;
	// Raw frontmatter value (note.* props only), used to keep the original format on write
	raw: string | null;
	// True when the value can be written back (note.* property)
	editable: boolean;
	// The value carries a time of day
	timed: boolean;
}

/** Parses a raw value (string/number/Date) into a Date, or null. */
function parse(raw: unknown): Date | null {
	if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
	if (typeof raw !== 'string' && typeof raw !== 'number') return null;
	const str = String(raw).trim();
	if (!str) return null;
	const m = toMoment(str, [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm', 'DD/MM/YYYY'], true);
	return m.isValid() ? m.toDate() : null;
}

/**
 * Reads a date for an entry. note.* props are read from the raw frontmatter
 * (exact format preserved); formula/file props are parsed from the rendered Value.
 */
export function readEntryDate(app: App, entry: BasesEntry, propId: BasesPropertyId | null): EntryDate | null {
	if (!propId) return null;
	const prop = parsePropertyId(propId);

	if (prop.type === 'note') {
		const fm = app.metadataCache.getFileCache(entry.file)?.frontmatter as Record<string, unknown> | undefined;
		const raw = fm?.[prop.name];
		const date = parse(raw);
		const str = typeof raw === 'string' ? raw : null;
		return date ? { date, raw: str, editable: true, timed: hasTime(str) } : null;
	}

	const value = entry.getValue(propId);
	if (!value || !value.isTruthy()) return null;
	const str = value.toString();
	const date = parse(str);
	return date ? { date, raw: null, editable: false, timed: hasTime(str) } : null;
}
