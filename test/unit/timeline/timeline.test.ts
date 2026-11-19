import { afterEach, describe, expect, it, vi } from 'vitest';
import { Value } from '../../mocks/obsidian';
import type { BasesEntry, BasesPropertyId, BasesSortConfig, TFile } from 'obsidian';
import { ORDER_PROPERTY_ID } from '../../../src/features/timeline/constants';
import { addDays } from '../../../src/features/timeline/dates/addDays';
import { hasTime } from '../../../src/features/timeline/dates/hasTime';
import { dayDiff } from '../../../src/features/timeline/dates/dayDiff';
import { formatForProperty } from '../../../src/features/timeline/dates/formatForProperty';
import { startOfDay } from '../../../src/features/timeline/dates/startOfDay';
import { clampSidebarWidth } from '../../../src/features/timeline/layout/clampSidebarWidth';
import { computeOrderValues } from '../../../src/features/timeline/layout/computeOrderValues';
import { computeRange } from '../../../src/features/timeline/layout/computeRange';
import { dateToX } from '../../../src/features/timeline/layout/dateToX';
import { findReorderRun } from '../../../src/features/timeline/layout/findReorderRun';
import { fitAllScale } from '../../../src/features/timeline/layout/fitAllScale';
import { isHourScale } from '../../../src/features/timeline/layout/isHourScale';
import { insertOrderSort } from '../../../src/features/timeline/layout/insertOrderSort';
import { segments } from '../../../src/features/timeline/layout/segments';
import { sharesStartDay } from '../../../src/features/timeline/layout/sharesStartDay';
import { timedEnd } from '../../../src/features/timeline/layout/timedEnd';
import { timeToX } from '../../../src/features/timeline/layout/timeToX';
import type { EntryRow, Row } from '../../../src/features/timeline/layout/types';
import { xToDate } from '../../../src/features/timeline/layout/xToDate';
import { xToTime } from '../../../src/features/timeline/layout/xToTime';

const START = 'note.start' as BasesPropertyId;
const STATUS = 'note.status' as BasesPropertyId;

// Entry row whose properties return the given values
function row(path: string, start: Date | null, props: Record<string, string> = {}): EntryRow {
	const entry = { getValue: (id: string) => (id in props ? new Value(props[id]) : null) } as unknown as BasesEntry;
	return {
		kind: 'entry', entry, file: { path } as TFile, title: path,
		start, end: start, startRaw: null, endRaw: null, hasEnd: false, timed: false, movable: true, resizable: false,
	};
}

describe('dates', () => {
	it('addDays shifts calendar days and keeps the time', () => {
		expect(addDays(new Date(2026, 2, 28, 10), 2)).toEqual(new Date(2026, 2, 30, 10));
		expect(addDays(new Date(2026, 0, 1), -1)).toEqual(new Date(2025, 11, 31));
	});

	it('dayDiff counts calendar days, ignoring the time', () => {
		expect(dayDiff(new Date(2026, 0, 1, 23), new Date(2026, 0, 3, 1))).toBe(2);
		expect(dayDiff(new Date(2026, 0, 3), new Date(2026, 0, 1))).toBe(-2);
	});

	it('startOfDay returns local midnight', () => {
		expect(startOfDay(new Date(2026, 4, 6, 14, 30))).toEqual(new Date(2026, 4, 6));
	});

	it('formatForProperty keeps the shape of the original value', () => {
		const date = new Date(2026, 4, 6, 14, 30, 15);
		expect(formatForProperty(date, '2026-01-01T10:00:00')).toBe('2026-05-06T14:30:15');
		expect(formatForProperty(date, '2026-01-01 10:00')).toBe('2026-05-06T14:30');
		expect(formatForProperty(date, '2026-01-01')).toBe('2026-05-06');
		expect(formatForProperty(date, null)).toBe('2026-05-06');
	});

	it('formatForProperty writes a time when asked, keeping seconds when present', () => {
		const date = new Date(2026, 4, 6, 14, 30, 15);
		expect(formatForProperty(date, null, true)).toBe('2026-05-06T14:30');
		expect(formatForProperty(date, '2026-01-01', true)).toBe('2026-05-06T14:30');
		expect(formatForProperty(date, '2026-01-01T10:00:00', true)).toBe('2026-05-06T14:30:15');
	});

	it('hasTime detects a time of day in a raw value', () => {
		expect(hasTime('2026-10-17T15:00')).toBe(true);
		expect(hasTime('2026-10-17 15:00')).toBe(true);
		expect(hasTime('2026-10-17')).toBe(false);
		expect(hasTime(null)).toBe(false);
	});
});

describe('layout math', () => {
	it('dateToX / xToDate convert between days and pixels', () => {
		const start = new Date(2026, 0, 1);
		expect(dateToX(new Date(2026, 0, 4), start, 24)).toBe(72);
		expect(xToDate(73, start, 24)).toEqual(new Date(2026, 0, 4));
	});

	it('timeToX / xToTime convert between exact times and pixels, snapped to a step', () => {
		const start = new Date(2026, 9, 15);
		const dayWidth = 24 * 56;
		expect(timeToX(new Date(2026, 9, 17, 15), start, dayWidth)).toBe(2 * dayWidth + 15 * 56);
		expect(xToTime(2 * dayWidth + 15 * 56 + 20, start, dayWidth, 15)).toEqual(new Date(2026, 9, 17, 15, 15));
		expect(xToTime(10, start, dayWidth, 15)).toEqual(new Date(2026, 9, 15));
	});

	it('timedEnd gives a timed item without an end a default length', () => {
		const start = new Date(2026, 9, 17, 15);
		expect(timedEnd(start, start)).toEqual(new Date(2026, 9, 17, 16));
		expect(timedEnd(start, new Date(2026, 9, 17, 22, 15))).toEqual(new Date(2026, 9, 17, 22, 15));
	});

	it('isHourScale is only true for the hour zoom widths', () => {
		expect(isHourScale(24 * 56)).toBe(true);
		expect(isHourScale(160)).toBe(false);
	});

	it('clampSidebarWidth keeps the list between its minimum and a visible timeline', () => {
		expect(clampSidebarWidth(50, 1000)).toBe(160);
		expect(clampSidebarWidth(900, 1000)).toBe(800);
		expect(clampSidebarWidth(300.4, 1000)).toBe(300);
	});

	it('fitAllScale fits the range, with a minimum day width', () => {
		expect(fitAllScale(10, 1000)).toBe(100);
		expect(fitAllScale(1000, 1000)).toBe(2);
		expect(fitAllScale(0, 500)).toBe(500);
	});

	it('segments splits the range by key', () => {
		const result = segments({ start: new Date(2026, 0, 30), days: 4 }, d => d.format('YYYY-MM'));
		expect(result).toEqual([
			{ date: new Date(2026, 0, 30), index: 0, days: 2 },
			{ date: new Date(2026, 1, 1), index: 2, days: 2 },
		]);
	});
});

describe('computeRange', () => {
	afterEach(() => { vi.useRealTimers(); });

	const rows: Row[] = [{ ...row('a.md', new Date(2026, 5, 1)), end: new Date(2026, 5, 20) }];

	it('covers the items and today, padded per zoom', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 5, 15, 12));
		expect(computeRange(rows, 'day', null)).toEqual({ start: new Date(2026, 4, 18), days: 48 });
	});

	it('never shrinks below the previous range, except in "all" zoom', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 5, 15, 12));
		const previous = { start: new Date(2026, 4, 1), days: 10 };
		expect(computeRange(rows, 'day', previous)).toEqual({ start: new Date(2026, 4, 1), days: 65 });
		expect(computeRange(rows, 'all', previous)).toEqual({ start: new Date(2026, 4, 25), days: 34 });
	});
});

describe('computeOrderValues', () => {
	it('gives the moved note a value before its new neighbour', () => {
		expect(computeOrderValues([1, 2, 3], 2, 0, false)).toEqual([0, 1, 2]);
	});

	it('gives the moved note a value after its new neighbour', () => {
		expect(computeOrderValues([1, 2, 3], 0, 2, false)).toEqual([2, 3, 4]);
	});

	it('puts the moved note between two values', () => {
		expect(computeOrderValues([1, 2, 3], 2, 1, false)).toEqual([1, 1.5, 2]);
	});

	it('leaves notes without a value untouched when they stay below', () => {
		expect(computeOrderValues([1, undefined, undefined], 2, 0, false)).toEqual([0, 1, null]);
	});

	it('renumbers the run when a value is not a number', () => {
		expect(computeOrderValues(['abc', 2], 1, 0, false)).toEqual([0, 1]);
	});

	it('writes reversed values for a descending sort', () => {
		expect(computeOrderValues([3, 2, 1], 2, 0, true)).toEqual([4, 3, 2]);
	});
});

describe('manual order sort', () => {
	const sort: BasesSortConfig[] = [
		{ property: START, direction: 'ASC' },
		{ property: 'file.name' as BasesPropertyId, direction: 'ASC' },
	];

	it('insertOrderSort adds the order right after the start date', () => {
		expect(insertOrderSort(sort, START)).toEqual([sort[0], { property: ORDER_PROPERTY_ID, direction: 'ASC' }, sort[1]]);
		expect(insertOrderSort(sort, 'note.other' as BasesPropertyId)).toBeNull();
	});

	it('findReorderRun returns the contiguous rows tied before the order criterion', () => {
		const rows: Row[] = [
			{ kind: 'group', label: 'G', count: 3 },
			row('a.md', null, { [STATUS]: 'x' }),
			row('b.md', null, { [STATUS]: 'x' }),
			row('c.md', null, { [STATUS]: 'y' }),
		];
		const byStatus: BasesSortConfig[] = [
			{ property: STATUS, direction: 'ASC' },
			{ property: ORDER_PROPERTY_ID as BasesPropertyId, direction: 'DESC' },
		];
		const run = findReorderRun(rows, 'a.md', byStatus);
		expect(run?.run.map(r => r.file.path)).toEqual(['a.md', 'b.md']);
		expect(run?.descending).toBe(true);
		expect(findReorderRun(rows, 'c.md', byStatus)).toBeNull();
		expect(findReorderRun(rows, 'a.md', [byStatus[0] as BasesSortConfig])).toBeNull();
	});

	it('sharesStartDay checks the neighbour rows', () => {
		const rows: Row[] = [
			row('a.md', new Date(2026, 0, 1, 9)),
			row('b.md', new Date(2026, 0, 1, 18)),
			row('c.md', new Date(2026, 0, 2)),
		];
		expect(sharesStartDay(rows, 'a.md')).toBe(true);
		expect(sharesStartDay(rows, 'c.md')).toBe(false);
		expect(sharesStartDay(rows, 'missing.md')).toBe(false);
	});
});
