import { describe, expect, it } from 'vitest';
import type { App, BasesEntry, BasesEntryGroup, BasesPropertyId, TFile } from 'obsidian';
import { guessDateProperties } from '../../../src/features/timeline/options/guessDateProperties';
import { buildRows } from '../../../src/features/timeline/layout/buildRows';
import { ensureDatetimeTypes } from '../../../src/features/timeline/write/ensureDatetimeTypes';
import { writeEntryDates } from '../../../src/features/timeline/write/writeEntryDates';
import type { EntryRow } from '../../../src/features/timeline/layout/types';

const START = 'note.when' as BasesPropertyId;
const END = 'note.until' as BasesPropertyId;

// App whose property types and frontmatter writes are recorded
function fakeApp(types: Record<string, string>) {
	const fm: Record<string, unknown> = {};
	const app = {
		metadataTypeManager: {
			getPropertyInfo: (name: string) => (name in types ? { widget: types[name] } : undefined),
			setType: (name: string, type: string) => { types[name] = type; },
		},
		fileManager: { processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => fn(fm) },
	} as unknown as App;
	return { app, types, fm };
}

function dateOnlyRow(): EntryRow {
	return {
		kind: 'entry', entry: {} as BasesEntry, file: { path: 'a.md' } as TFile, title: 'a',
		start: new Date(2026, 10, 16), end: new Date(2026, 10, 16), startRaw: '2026-11-16', endRaw: '2026-11-16',
		hasEnd: false, timed: false, movable: true, resizable: true,
	};
}

describe('ensureDatetimeTypes', () => {
	it('converts "Date" and untyped properties, leaves other types alone', () => {
		const { app, types } = fakeApp({ when: 'date', until: 'datetime', title: 'text' });
		ensureDatetimeTypes(app, ['when', 'until', 'title', 'fresh']);
		expect(types).toEqual({ when: 'datetime', until: 'datetime', title: 'text', fresh: 'datetime' });
	});

	it('does nothing without the internal type manager', () => {
		expect(() => ensureDatetimeTypes({} as App, ['when'])).not.toThrow();
	});
});

describe('writeEntryDates with times', () => {
	it('a resize in the hour zoom writes datetimes and converts both types', async () => {
		const { app, types, fm } = fakeApp({ when: 'date', until: 'date' });
		await writeEntryDates(app, dateOnlyRow(), START, END, new Date(2026, 10, 16, 9), new Date(2026, 10, 16, 17, 15), true);
		expect(fm).toEqual({ when: '2026-11-16T09:00', until: '2026-11-16T17:15' });
		expect(types).toEqual({ when: 'datetime', until: 'datetime' });
	});

	it('a date-only move keeps dates and types', async () => {
		const { app, types, fm } = fakeApp({ when: 'date', until: 'date' });
		await writeEntryDates(app, dateOnlyRow(), START, END, new Date(2026, 10, 18), new Date(2026, 10, 18));
		expect(fm).toEqual({ when: '2026-11-18' });
		expect(types).toEqual({ when: 'date', until: 'date' });
	});

	it('a timed value already stored converts the types on its next write', async () => {
		const { app, types } = fakeApp({ when: 'date' });
		const row = { ...dateOnlyRow(), startRaw: '2026-11-16T10:00', timed: true };
		await writeEntryDates(app, row, START, null, new Date(2026, 10, 16, 11), new Date(2026, 10, 16, 11));
		expect(types).toEqual({ when: 'datetime' });
	});
});

describe('guessDateProperties', () => {
	const ids = (...names: string[]) => names.map(n => `note.${n}` as BasesPropertyId);

	it('pairs a start-like and an end-like property of the base', () => {
		expect(guessDateProperties(ids('status', 'Date', 'Due date'), [])).toEqual({ start: 'note.Date', end: 'note.Due date' });
	});

	it('takes the missing one from the vault date properties', () => {
		expect(guessDateProperties(ids('Date'), ['Due date', 'read date'])).toEqual({ start: 'note.Date', end: 'note.Due date' });
	});

	it('prefers the base properties, without duplicating a vault one', () => {
		expect(guessDateProperties(ids('start', 'end'), ['Date', 'Due date', 'Start'])).toEqual({ start: 'note.start', end: 'note.end' });
	});

	it('uses a lone end-like property as the start', () => {
		expect(guessDateProperties(ids('Due date'), [])).toEqual({ start: 'note.Due date', end: null });
	});

	it('ignores file properties and finds nothing without a date-like name', () => {
		expect(guessDateProperties(['file.ctime' as BasesPropertyId, ...ids('status')], [])).toEqual({ start: null, end: null });
	});
});

describe('buildRows', () => {
	it('places a note with only an end value on that day', () => {
		const file = { path: 'a.md', basename: 'a' } as TFile;
		const app = { metadataCache: { getFileCache: () => ({ frontmatter: { until: '2026-11-16' } }) } } as unknown as App;
		const group = { entries: [{ file } as BasesEntry], hasKey: () => false } as unknown as BasesEntryGroup;
		const [row] = buildRows(app, [group], START, END);
		expect(row).toMatchObject({ start: new Date(2026, 10, 16), end: new Date(2026, 10, 16), hasEnd: true, movable: true, resizable: true });
	});
});
